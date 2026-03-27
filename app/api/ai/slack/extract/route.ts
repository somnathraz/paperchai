/**
 * AI Slack Extraction Endpoint
 * POST /api/ai/slack/extract
 *
 * Hybrid extraction:
 * - Deterministic parse for command-style input (client:/amount:/due:)
 * - AI fallback for free-form Slack thread text
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateAI } from "@/lib/unified-ai-service";
import { AI_CONFIG } from "@/lib/ai-config";
import {
  SYSTEM_PROMPTS,
  processAiInput,
  slackInvoiceOutputSchema,
  validateAiOutput,
} from "@/lib/ai-prompt-security";
import { parseSlackInvoiceCommand } from "@/lib/integrations/slack/command-parser";
import { generateWorkspaceInvoiceNumber } from "@/lib/invoices/numbering";
import { authOptions } from "@/lib/auth";
import { canWriteWorkspace, ensureActiveWorkspace, getWorkspaceMembership } from "@/lib/workspace";
import {
  assertWorkspaceFeature,
  getWorkspaceEntitlement,
  serializeEntitlementError,
} from "@/lib/entitlements";

type ExtractRequestBody = {
  text: string;
  workspaceId: string;
  importId?: string;
};

type InvoiceLineInput = {
  title: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
};

export async function POST(request: NextRequest) {
  try {
    const internalApiKey = process.env.SLACK_EXTRACT_API_KEY;
    const providedInternalKey = request.headers.get("x-paperchai-internal-key");
    const validInternalKey =
      Boolean(internalApiKey) &&
      Boolean(providedInternalKey) &&
      providedInternalKey === internalApiKey;

    let authenticatedWorkspaceId: string | null = null;
    let authenticatedUserId: string | null = null;
    if (!validInternalKey) {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
      }
      const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);
      if (!workspace) {
        return NextResponse.json({ success: false, error: "No active workspace" }, { status: 404 });
      }
      const membership = await getWorkspaceMembership(session.user.id, workspace.id);
      if (!membership) {
        return NextResponse.json(
          { success: false, error: "Workspace access denied" },
          { status: 403 }
        );
      }
      if (!canWriteWorkspace(membership.role)) {
        return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
      }
      try {
        await assertWorkspaceFeature(workspace.id, session.user.id, "ai");
        await assertWorkspaceFeature(workspace.id, session.user.id, "integrations");
      } catch (error) {
        return NextResponse.json(serializeEntitlementError(error), {
          status: (error as any)?.statusCode || 403,
        });
      }
      authenticatedWorkspaceId = workspace.id;
      authenticatedUserId = session.user.id;
    }

    const body: ExtractRequestBody = await request.json();

    if (!body.text || body.text.trim().length < 3) {
      return NextResponse.json({
        success: false,
        error: "Text too short to extract meaningful data",
      });
    }

    if (!body.workspaceId) {
      return NextResponse.json({
        success: false,
        error: "Workspace ID required",
      });
    }
    if (authenticatedWorkspaceId && body.workspaceId !== authenticatedWorkspaceId) {
      return NextResponse.json(
        { success: false, error: "Forbidden workspace access" },
        { status: 403 }
      );
    }

    // Get workspace currency default
    const workspace = await prisma.workspace.findUnique({
      where: { id: body.workspaceId },
      select: { id: true },
    });

    if (!workspace) {
      return NextResponse.json({
        success: false,
        error: "Workspace not found",
      });
    }

    const rawText = body.text.trim();

    // 1) Fast deterministic path for command-like input.
    const parsedCommand = parseSlackInvoiceCommand(rawText);
    if (
      parsedCommand.intent === "create" &&
      parsedCommand.clientName &&
      parsedCommand.projectName &&
      parsedCommand.amount &&
      parsedCommand.amount > 0
    ) {
      const dueDate = parseDueDate(parsedCommand.dueDate);
      if (parsedCommand.dueDate && !dueDate) {
        return NextResponse.json({
          success: false,
          error: "Invalid due date. Use YYYY-MM-DD.",
        });
      }

      const client = await resolveClient({
        workspaceId: body.workspaceId,
        name: parsedCommand.clientName,
        email: parsedCommand.email,
      });
      const project = await resolveProjectForClient({
        workspaceId: body.workspaceId,
        clientId: client.id,
        name: parsedCommand.projectName,
      });

      const quantity =
        parsedCommand.quantity && parsedCommand.quantity > 0 ? parsedCommand.quantity : 1;
      const amount = parsedCommand.amount;
      const rate =
        parsedCommand.rate && parsedCommand.rate > 0 ? parsedCommand.rate : amount / quantity;
      const lineItems: InvoiceLineInput[] = [
        {
          title: parsedCommand.itemTitle || "Services",
          description: "Generated from Slack command",
          quantity,
          unitPrice: rate,
          taxRate: 0,
        },
      ];

      const invoice = await createDraftInvoice({
        workspaceId: body.workspaceId,
        clientId: client.id,
        projectId: project.id,
        currency: parsedCommand.currency || "INR",
        dueDate,
        notes: parsedCommand.notes || "Created from Slack command",
        sourceImportId: body.importId,
        items: lineItems,
      });

      return NextResponse.json({
        success: true,
        mode: "deterministic_command",
        summary: "Invoice drafted from command fields",
        confidence: 100,
        invoiceId: invoice.id,
        invoiceNumber: invoice.number,
        clientFound: true,
        projectFound: true,
        itemCount: lineItems.length,
      });
    }

    if (
      parsedCommand.intent === "create" &&
      parsedCommand.clientName &&
      parsedCommand.amount &&
      parsedCommand.amount > 0 &&
      !parsedCommand.projectName
    ) {
      return NextResponse.json({
        success: false,
        error: 'Project is required. Use project:"Name" in your command.',
      });
    }

    // 2) AI fallback path for free-form thread/chat text.
    const processed = processAiInput(rawText, {
      workspaceId: body.workspaceId,
      userId: "system",
      action: "extract_slack_invoice",
      sourceType: "slack_content",
    });

    if (processed.riskAssessment.level === "critical") {
      return NextResponse.json({
        success: false,
        error: "Input contains unsafe instructions and cannot be processed",
      });
    }

    const entitlement =
      authenticatedWorkspaceId && authenticatedUserId
        ? await getWorkspaceEntitlement(authenticatedWorkspaceId, authenticatedUserId)
        : null;

    const response = await generateAI({
      modelName: AI_CONFIG.features.extraction.model,
      fallbackModelName: AI_CONFIG.features.extraction.fallback,
      systemInstruction: SYSTEM_PROMPTS.extract_slack_invoice,
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2048,
      },
      promptParts: [
        {
          text: `Extract invoice data from this Slack message / conversation:\n\n${processed.sanitizedContent}`,
        },
      ],
      userId: "system",
      userTier: entitlement?.platformBypass ? "PREMIER" : entitlement?.planCode || "PREMIUM",
    });

    const cleanedResponse = cleanJsonOutput(response);
    const validation = validateAiOutput(cleanedResponse, slackInvoiceOutputSchema);
    if (!validation.success) {
      console.error("[Slack AI] Invalid extraction response", validation.error);
      return NextResponse.json({
        success: false,
        error: "AI returned invalid response",
      });
    }
    const parsed = validation.data;

    if (!parsed.success || !parsed.items || parsed.items.length === 0) {
      return NextResponse.json({
        success: false,
        error: parsed.error || "Could not extract invoice data from the text",
        confidence: parsed.confidence || 0,
      });
    }

    // Create draft invoice if client is identified in extracted data.
    let invoiceId: string | null = null;
    let invoiceNumber: string | null = null;

    if (parsed.client && parsed.items.length > 0) {
      if (!parsed.project) {
        return NextResponse.json({
          success: false,
          error:
            'Project is required to create an invoice draft. Mention project in thread or use command with project:"Name".',
        });
      }
      const client = await resolveClient({
        workspaceId: body.workspaceId,
        name: parsed.client,
      });
      const project = await resolveProjectForClient({
        workspaceId: body.workspaceId,
        clientId: client.id,
        name: parsed.project,
      });

      const items: InvoiceLineInput[] = parsed.items.map((item) => ({
        title: item.title || "Service",
        description: item.description || "",
        quantity: Number(item.quantity) || 1,
        unitPrice: Number(item.unitPrice) || 0,
        taxRate: Number(item.taxRate) || 0,
      }));

      const extractedDueDate = parseDueDate(parsed.dueDate || undefined);
      const invoice = await prisma.invoice.create({
        data: await buildInvoiceCreateInput({
          workspaceId: body.workspaceId,
          clientId: client.id,
          projectId: project.id,
          currency: parsed.currency || "INR",
          dueDate: extractedDueDate,
          notes: parsed.notes || "Created from Slack import",
          sourceImportId: body.importId,
          items,
        }),
        select: { id: true, number: true },
      });

      invoiceId = invoice.id;
      invoiceNumber = invoice.number;
    }

    return NextResponse.json({
      success: true,
      mode: "ai_thread_extraction",
      data: parsed,
      summary: parsed.summary || "Invoice data extracted successfully",
      confidence: parsed.confidence || 75,
      invoiceId,
      invoiceNumber,
      clientFound: !!parsed.client,
      projectFound: !!parsed.project,
      itemCount: parsed.items?.length || 0,
    });
  } catch (error: any) {
    console.error("[Slack AI Extraction Error]", error);

    if (error.message?.includes("Rate limit")) {
      return NextResponse.json({ success: false, error: error.message }, { status: 429 });
    }

    return NextResponse.json(
      { success: false, error: "Failed to extract invoice data" },
      { status: 500 }
    );
  }
}

async function resolveClient(input: { workspaceId: string; name: string; email?: string | null }) {
  const normalized = input.name.trim();
  const exact = await prisma.client.findFirst({
    where: {
      workspaceId: input.workspaceId,
      name: { equals: normalized, mode: "insensitive" },
    },
    select: { id: true, name: true, email: true },
  });
  if (exact) return exact;

  const matches = await prisma.client.findMany({
    where: {
      workspaceId: input.workspaceId,
      name: { contains: normalized, mode: "insensitive" },
    },
    select: { id: true, name: true, email: true },
    take: 2,
  });
  if (matches.length === 1) return matches[0];
  if (matches.length > 1) {
    throw new Error(`Multiple clients matched "${normalized}". Use exact client name.`);
  }

  return prisma.client.create({
    data: {
      workspaceId: input.workspaceId,
      name: normalized,
      email: input.email || null,
    },
    select: { id: true, name: true, email: true },
  });
}

async function resolveProjectForClient(input: {
  workspaceId: string;
  clientId: string;
  name: string;
}) {
  const normalized = input.name.trim();
  const exact = await prisma.project.findFirst({
    where: {
      workspaceId: input.workspaceId,
      clientId: input.clientId,
      name: { equals: normalized, mode: "insensitive" },
    },
    select: { id: true, name: true },
  });
  if (exact) return exact;

  const matches = await prisma.project.findMany({
    where: {
      workspaceId: input.workspaceId,
      clientId: input.clientId,
      name: { contains: normalized, mode: "insensitive" },
    },
    select: { id: true, name: true },
    take: 2,
  });
  if (matches.length === 1) return matches[0];
  if (matches.length > 1) {
    throw new Error(`Multiple projects matched "${normalized}". Use exact project name.`);
  }

  return prisma.project.create({
    data: {
      workspaceId: input.workspaceId,
      clientId: input.clientId,
      name: normalized,
      status: "ACTIVE",
    },
    select: { id: true, name: true },
  });
}

function parseDueDate(value?: string): Date | null {
  if (!value) return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day)
    return null;
  return date;
}

function cleanJsonOutput(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```json")) cleaned = cleaned.slice(7);
  if (cleaned.startsWith("```")) cleaned = cleaned.slice(3);
  if (cleaned.endsWith("```")) cleaned = cleaned.slice(0, -3);
  return cleaned.trim();
}

async function createDraftInvoice(input: {
  workspaceId: string;
  clientId: string;
  projectId: string;
  currency: string;
  dueDate: Date | null;
  notes: string;
  sourceImportId?: string;
  items: InvoiceLineInput[];
}) {
  const MAX_ATTEMPTS = 3;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      return await prisma.invoice.create({
        data: await buildInvoiceCreateInput(input),
        select: { id: true, number: true },
      });
    } catch (error) {
      const isUniqueConflict =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
      if (!isUniqueConflict || attempt === MAX_ATTEMPTS) {
        throw error;
      }
    }
  }
  throw new Error("Failed to create invoice draft");
}

async function buildInvoiceCreateInput(input: {
  workspaceId: string;
  clientId: string;
  projectId: string;
  currency: string;
  dueDate: Date | null;
  notes: string;
  sourceImportId?: string;
  items: InvoiceLineInput[];
}) {
  const subtotal = input.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const taxTotal = input.items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice * (item.taxRate / 100),
    0
  );
  const invoiceNumber = await generateWorkspaceInvoiceNumber(input.workspaceId);

  return {
    workspaceId: input.workspaceId,
    clientId: input.clientId,
    projectId: input.projectId,
    number: invoiceNumber,
    status: "draft" as const,
    currency: input.currency || "INR",
    subtotal,
    taxTotal,
    total: subtotal + taxTotal,
    notes: input.notes,
    issueDate: new Date(),
    dueDate: input.dueDate,
    source: "slack",
    sourceImportId: input.sourceImportId,
    items: {
      create: input.items.map((item) => ({
        title: item.title || "Service",
        description: item.description || "",
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice || 0,
        taxRate: item.taxRate || 0,
        total: (item.quantity || 1) * (item.unitPrice || 0),
      })),
    },
  };
}
