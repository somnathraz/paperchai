/**
 * Slack Slash Commands Endpoint
 * POST /api/integrations/slack/commands
 *
 * Approval-first flow:
 * - /invoice create ... => draft + pending approval request
 * - /invoice send <number> => pending approval request only
 * - /invoice status <number>
 */

import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { decrypt, hash } from "@/lib/encryption";
import { verifySlackSignature, getUserInfo, testAuth } from "@/lib/slack-client";
import { slackCommandSchema } from "@/lib/validation/integration-schemas";
import { parseSlackInvoiceCommand } from "@/lib/integrations/slack/command-parser";
import { generateWorkspaceInvoiceNumber } from "@/lib/invoices/numbering";
import { getWorkspaceApprovers } from "@/lib/invoices/approval-routing";

type SlackActor = {
  internalUserId: string;
  role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
};

type SlackConnectionCandidate = {
  id: string;
  workspaceId: string;
  accessToken: string | null;
  providerWorkspaceId: string | null;
  providerWorkspaceName: string | null;
};

const SLACK_COMMAND_WINDOW_MS = 60 * 1000;
const SLACK_COMMAND_LIMIT_PER_USER = 30;
const slackCommandRateLimitStore = new Map<string, { count: number; resetAt: number }>();

export async function POST(request: NextRequest) {
  let event: { id: string } | null = null;
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-slack-signature");
    const timestamp = request.headers.get("x-slack-request-timestamp");

    if (!verifySlackSignature(signature, timestamp, rawBody)) {
      return NextResponse.json(
        {
          response_type: "ephemeral",
          text: "Invalid Slack signature.",
        },
        { status: 401 }
      );
    }

    const formData = new URLSearchParams(rawBody);
    const params: Record<string, string> = {};
    formData.forEach((value, key) => {
      params[key] = value;
    });

    const validated = slackCommandSchema.safeParse(params);
    if (!validated.success) {
      return NextResponse.json({
        response_type: "ephemeral",
        text: "Invalid command payload.",
      });
    }

    const { team_id, channel_id, user_id, text, response_url } = validated.data;
    const sanitizedText = sanitizeSlackCommandText(text);
    const command = parseSlackInvoiceCommand(sanitizedText);
    const externalEventId = hash(`slack:${timestamp || "no-ts"}:${rawBody}`);

    const rateLimit = checkSlackCommandRateLimit(team_id, user_id);
    if (!rateLimit.allowed) {
      return NextResponse.json({
        response_type: "ephemeral",
        text: "Too many /invoice requests. Please wait a minute and try again.",
      });
    }

    // Fast-fail invalid create date inputs before any network/database-heavy work.
    if (command.intent === "create" && command.dueDate && !parseDueDate(command.dueDate)) {
      return NextResponse.json({
        response_type: "ephemeral",
        text: "Invalid due date. Use YYYY-MM-DD (example: due:2026-02-15).",
      });
    }

    let matchingConnections = await prisma.integrationConnection.findMany({
      where: {
        providerWorkspaceId: team_id,
        provider: "SLACK",
        status: "CONNECTED",
      },
      select: {
        id: true,
        workspaceId: true,
        accessToken: true,
        providerWorkspaceId: true,
        providerWorkspaceName: true,
      },
    });

    if (matchingConnections.length === 0) {
      const fallback = await resolveConnectionBySlackAuth(team_id);
      if (fallback) {
        matchingConnections = [fallback];
      }
    }

    if (matchingConnections.length !== 1 || !matchingConnections[0]?.accessToken) {
      return NextResponse.json({
        response_type: "ephemeral",
        text:
          matchingConnections.length > 1
            ? "Multiple PaperChai workspaces are mapped to this Slack team. Ask your admin to reconnect Slack from one workspace."
            : "PaperChai is not connected to this Slack workspace. Reconnect Slack from Settings > Integrations.",
      });
    }
    const connection = matchingConnections[0];
    if (!connection?.accessToken) {
      return NextResponse.json({
        response_type: "ephemeral",
        text: "PaperChai is not connected to this Slack workspace.",
      });
    }

    event = await createCommandEvent({
      workspaceId: connection.workspaceId,
      externalEventId,
      teamId: team_id,
      userId: user_id,
      channelId: channel_id,
      responseUrl: response_url,
      rawText: sanitizedText,
      commandIntent: command.intent,
    });

    if (!event) {
      return NextResponse.json({
        response_type: "ephemeral",
        text: "This command was already processed.",
      });
    }

    const accessToken = decrypt(connection.accessToken);
    const actor = await resolveSlackActor({
      workspaceId: connection.workspaceId,
      externalUserId: user_id,
      accessToken,
    });

    if (!actor) {
      await prisma.botCommandEvent.update({
        where: { id: event.id },
        data: {
          status: "REJECTED",
          errorMessage: "Unable to map Slack user to workspace member",
          processedAt: new Date(),
        },
      });

      return NextResponse.json({
        response_type: "ephemeral",
        text: "Your Slack account is not linked to a PaperChai workspace member. Ask an admin to sign in once with the same email.",
      });
    }

    if (command.intent === "help") {
      await finalizeCommandEvent(event.id, "EXECUTED", command);
      return helpResponse();
    }

    const isReadOnlyActor = actor.role === "VIEWER";

    if (command.intent === "status") {
      if (!command.invoiceNumber) {
        await finalizeCommandEvent(event.id, "REJECTED", command, "Missing invoice number");
        return NextResponse.json({
          response_type: "ephemeral",
          text: "Usage: /invoice status INV-0001",
        });
      }

      const invoice = await prisma.invoice.findFirst({
        where: {
          workspaceId: connection.workspaceId,
          number: command.invoiceNumber,
        },
        include: {
          client: { select: { name: true } },
        },
      });

      if (!invoice) {
        await finalizeCommandEvent(event.id, "REJECTED", command, "Invoice not found");
        return NextResponse.json({
          response_type: "ephemeral",
          text: `Invoice ${command.invoiceNumber} not found.`,
        });
      }

      await finalizeCommandEvent(event.id, "EXECUTED", command, undefined, invoice.id);
      return NextResponse.json({
        response_type: "ephemeral",
        text: `Invoice ${invoice.number}: ${invoice.status.toUpperCase()} (${invoice.currency} ${Number(invoice.total).toLocaleString()})`,
      });
    }

    if (command.intent === "send") {
      if (isReadOnlyActor) {
        await finalizeCommandEvent(
          event.id,
          "REJECTED",
          command,
          "Viewer role cannot request sends"
        );
        return NextResponse.json({
          response_type: "ephemeral",
          text: "Your workspace role is VIEWER. Ask an admin/member to run send commands.",
        });
      }
      if (!command.invoiceNumber) {
        await finalizeCommandEvent(event.id, "REJECTED", command, "Missing invoice number");
        return NextResponse.json({
          response_type: "ephemeral",
          text: "Usage: /invoice send INV-0001",
        });
      }

      const invoice = await prisma.invoice.findFirst({
        where: {
          workspaceId: connection.workspaceId,
          number: command.invoiceNumber,
        },
        include: {
          client: { select: { name: true, email: true } },
        },
      });

      if (!invoice) {
        await finalizeCommandEvent(event.id, "REJECTED", command, "Invoice not found");
        return NextResponse.json({
          response_type: "ephemeral",
          text: `Invoice ${command.invoiceNumber} not found.`,
        });
      }

      if (invoice.status === "sent" || invoice.status === "paid") {
        await finalizeCommandEvent(
          event.id,
          "REJECTED",
          command,
          `Invoice status ${invoice.status}`,
          invoice.id
        );
        return NextResponse.json({
          response_type: "ephemeral",
          text: `Invoice ${invoice.number} is already ${invoice.status}.`,
        });
      }

      const approvers = await getWorkspaceApprovers(connection.workspaceId);
      if (approvers.length === 0) {
        await finalizeCommandEvent(
          event.id,
          "FAILED",
          command,
          "No approvers configured",
          invoice.id
        );
        return NextResponse.json({
          response_type: "ephemeral",
          text: "No workspace owner/admin found for approval. Add an admin first.",
        });
      }

      const pending = await prisma.approvalRequest.findFirst({
        where: {
          workspaceId: connection.workspaceId,
          invoiceId: invoice.id,
          status: "PENDING",
        },
        select: { id: true },
      });

      if (pending) {
        await finalizeCommandEvent(event.id, "EXECUTED", command, undefined, invoice.id);
        return NextResponse.json({
          response_type: "ephemeral",
          text: `Invoice ${invoice.number} is already pending approval.`,
        });
      }

      await queueInvoiceApproval({
        workspaceId: connection.workspaceId,
        invoiceId: invoice.id,
        actor,
        slackContext: {
          teamId: team_id,
          userId: user_id,
          channelId: channel_id,
          responseUrl: response_url,
          commandText: sanitizedText,
          eventId: event.id,
        },
      });

      await finalizeCommandEvent(event.id, "EXECUTED", command, undefined, invoice.id);

      return NextResponse.json({
        response_type: "ephemeral",
        text: `Invoice ${invoice.number} queued for admin approval. It will send only after approval.`,
      });
    }

    // create
    if (isReadOnlyActor) {
      await finalizeCommandEvent(
        event.id,
        "REJECTED",
        command,
        "Viewer role cannot create invoices"
      );
      return NextResponse.json({
        response_type: "ephemeral",
        text: "Your workspace role is VIEWER. Ask an admin/member to create invoices.",
      });
    }
    const missing: string[] = [];
    if (!command.clientName) missing.push("client");
    if (!command.amount || command.amount <= 0) missing.push("amount");

    if (missing.length > 0) {
      await finalizeCommandEvent(
        event.id,
        "REJECTED",
        command,
        `Missing fields: ${missing.join(", ")}`
      );
      return NextResponse.json({
        response_type: "ephemeral",
        text: `Missing fields: ${missing.join(", ")}. Example: /invoice create client:\"Acme\" amount:1200 due:2026-02-28 email:billing@acme.com`,
      });
    }

    const clientMatch = await findClientByName(connection.workspaceId, command.clientName);
    if (!clientMatch.ok) {
      await finalizeCommandEvent(event.id, "REJECTED", command, clientMatch.error);
      return NextResponse.json({
        response_type: "ephemeral",
        text: clientMatch.error,
      });
    }

    const approvers = await getWorkspaceApprovers(connection.workspaceId);
    if (approvers.length === 0) {
      await finalizeCommandEvent(event.id, "FAILED", command, "No approvers configured");
      return NextResponse.json({
        response_type: "ephemeral",
        text: "No workspace owner/admin found for approval. Add an admin first.",
      });
    }

    const now = new Date();
    const parsedDueDate = parseDueDate(command.dueDate);
    if (command.dueDate && !parsedDueDate) {
      await finalizeCommandEvent(
        event.id,
        "REJECTED",
        command,
        "Invalid due date format. Use YYYY-MM-DD."
      );
      return NextResponse.json({
        response_type: "ephemeral",
        text: "Invalid due date. Use YYYY-MM-DD (example: due:2026-02-15).",
      });
    }
    if (parsedDueDate && startOfDay(parsedDueDate) < startOfDay(now)) {
      await finalizeCommandEvent(event.id, "REJECTED", command, "Due date cannot be in the past.");
      return NextResponse.json({
        response_type: "ephemeral",
        text: "Invalid due date. It cannot be in the past.",
      });
    }
    const dueDate = parsedDueDate || addDays(now, 7);
    const quantity = command.quantity && command.quantity > 0 ? command.quantity : 1;
    const amount = command.amount as number;
    const rate = command.rate && command.rate > 0 ? command.rate : amount / quantity;
    const subtotal = Number((quantity * rate).toFixed(2));
    const currency = command.currency || "INR";
    const invoiceNumber = await generateWorkspaceInvoiceNumber(connection.workspaceId);

    const invoice = await prisma.invoice.create({
      data: {
        workspaceId: connection.workspaceId,
        clientId: clientMatch.client.id,
        number: invoiceNumber,
        status: "draft",
        currency,
        issueDate: now,
        dueDate,
        subtotal,
        taxTotal: 0,
        total: subtotal,
        notes: command.notes || "Created via Slack command",
        source: "slack",
        sourceImportId: event.id,
        items: {
          create: [
            {
              title: command.itemTitle || "Services",
              description: "Generated from Slack command",
              quantity,
              unitPrice: rate,
              taxRate: 0,
              total: subtotal,
            },
          ],
        },
      },
      select: {
        id: true,
        number: true,
      },
    });

    await queueInvoiceApproval({
      workspaceId: connection.workspaceId,
      invoiceId: invoice.id,
      actor,
      slackContext: {
        teamId: team_id,
        userId: user_id,
        channelId: channel_id,
        responseUrl: response_url,
        commandText: sanitizedText,
        eventId: event.id,
      },
    });

    await finalizeCommandEvent(event.id, "EXECUTED", command, undefined, invoice.id);

    return NextResponse.json({
      response_type: "ephemeral",
      text: `Draft ${invoice.number} created for ${clientMatch.client.name} (${currency} ${subtotal.toLocaleString()}) and queued for approval.`,
    });
  } catch (error) {
    try {
      if (event?.id) {
        await prisma.botCommandEvent.update({
          where: { id: event.id },
          data: {
            status: "FAILED",
            errorMessage: error instanceof Error ? error.message : "Slack command failed",
            processedAt: new Date(),
          },
        });
      }
    } catch (logError) {
      console.error("[Slack Commands] Failed to persist command error state", logError);
    }

    return NextResponse.json({
      response_type: "ephemeral",
      text: "Command failed. Please try again or run /invoice help.",
    });
  }
}

async function resolveConnectionBySlackAuth(
  teamId: string
): Promise<SlackConnectionCandidate | null> {
  const candidates = await prisma.integrationConnection.findMany({
    where: {
      provider: "SLACK",
      status: "CONNECTED",
      accessToken: { not: null },
    },
    select: {
      id: true,
      workspaceId: true,
      accessToken: true,
      providerWorkspaceId: true,
      providerWorkspaceName: true,
    },
  });

  if (candidates.length === 0) return null;

  const matched: SlackConnectionCandidate[] = [];
  for (const candidate of candidates) {
    if (!candidate.accessToken) continue;
    try {
      const token = decrypt(candidate.accessToken);
      const auth = await testAuth(token);
      if (auth.ok && auth.team_id === teamId) {
        matched.push(candidate);
      }
    } catch {
      // Ignore invalid candidate token; command flow will continue to other candidates.
    }
  }

  if (matched.length === 0) return null;
  if (matched.length > 1) {
    console.error("[Slack Commands] Ambiguous fallback mapping for team", {
      teamId,
      workspaceIds: matched.map((c) => c.workspaceId),
    });
    return null;
  }

  const winner = matched[0];
  await prisma.integrationConnection.update({
    where: { id: winner.id },
    data: {
      providerWorkspaceId: teamId,
      lastError: null,
      lastErrorAt: null,
      updatedAt: new Date(),
    },
  });

  return winner;
}

function checkSlackCommandRateLimit(teamId: string, userId: string): { allowed: boolean } {
  const now = Date.now();
  if (slackCommandRateLimitStore.size > 5000) {
    for (const [key, value] of slackCommandRateLimitStore.entries()) {
      if (now > value.resetAt) slackCommandRateLimitStore.delete(key);
    }
  }
  const key = `${teamId}:${userId}`;
  const current = slackCommandRateLimitStore.get(key);
  const usage =
    !current || now > current.resetAt
      ? { count: 0, resetAt: now + SLACK_COMMAND_WINDOW_MS }
      : current;

  if (usage.count >= SLACK_COMMAND_LIMIT_PER_USER) {
    return { allowed: false };
  }

  usage.count += 1;
  slackCommandRateLimitStore.set(key, usage);
  return { allowed: true };
}

function sanitizeSlackCommandText(input: string): string {
  if (!input) return "";
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\0/g, "")
    .trim();
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
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
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function startOfDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

async function createCommandEvent(input: {
  workspaceId: string;
  externalEventId: string;
  teamId: string;
  userId: string;
  channelId: string;
  responseUrl: string;
  rawText: string;
  commandIntent: string;
}) {
  try {
    return await prisma.botCommandEvent.create({
      data: {
        workspaceId: input.workspaceId,
        source: "SLACK",
        status: "RECEIVED",
        externalEventId: input.externalEventId,
        providerWorkspaceId: input.teamId,
        actorExternalId: input.userId,
        command: input.commandIntent,
        rawText: input.rawText,
        channelId: input.channelId,
        responseUrl: input.responseUrl,
      },
      select: { id: true },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return null;
    }
    throw error;
  }
}

async function finalizeCommandEvent(
  eventId: string,
  status: "EXECUTED" | "REJECTED" | "FAILED",
  parsedData: unknown,
  errorMessage?: string,
  linkedInvoiceId?: string
) {
  await prisma.botCommandEvent.update({
    where: { id: eventId },
    data: {
      status,
      parsedData: parsedData as Prisma.InputJsonValue,
      errorMessage,
      linkedInvoiceId,
      processedAt: new Date(),
    },
  });
}

async function resolveSlackActor(input: {
  workspaceId: string;
  externalUserId: string;
  accessToken: string;
}): Promise<SlackActor | null> {
  const identity = await prisma.integrationIdentity.findFirst({
    where: {
      workspaceId: input.workspaceId,
      provider: "SLACK",
      externalUserId: input.externalUserId,
      active: true,
    },
    select: {
      internalUserId: true,
      user: {
        select: {
          memberships: {
            where: {
              workspaceId: input.workspaceId,
              removedAt: null,
            },
            select: { role: true },
            take: 1,
          },
        },
      },
    },
  });

  if (identity?.user.memberships.length) {
    return {
      internalUserId: identity.internalUserId,
      role: identity.user.memberships[0].role,
    };
  }

  const slackUser = await getUserInfo(input.accessToken, input.externalUserId);
  const email = slackUser.user?.profile?.email;
  if (!email) return null;

  const member = await prisma.workspaceMember.findFirst({
    where: {
      workspaceId: input.workspaceId,
      removedAt: null,
      user: {
        email: { equals: email, mode: "insensitive" },
      },
    },
    select: {
      userId: true,
      role: true,
    },
  });

  if (!member) return null;

  await prisma.integrationIdentity.upsert({
    where: {
      workspaceId_provider_externalUserId: {
        workspaceId: input.workspaceId,
        provider: "SLACK",
        externalUserId: input.externalUserId,
      },
    },
    create: {
      workspaceId: input.workspaceId,
      provider: "SLACK",
      externalUserId: input.externalUserId,
      internalUserId: member.userId,
      roleSnapshot: member.role,
      metadata: { email },
      active: true,
    },
    update: {
      internalUserId: member.userId,
      roleSnapshot: member.role,
      metadata: { email },
      active: true,
    },
  });

  return {
    internalUserId: member.userId,
    role: member.role,
  };
}

async function queueInvoiceApproval(input: {
  workspaceId: string;
  invoiceId: string;
  actor: SlackActor;
  slackContext: {
    teamId: string;
    userId: string;
    channelId: string;
    responseUrl: string;
    commandText: string;
    eventId: string;
  };
}) {
  const approvers = await getWorkspaceApprovers(input.workspaceId);
  const now = new Date();
  const expiresAt = addDays(now, 3);

  await prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findUnique({
      where: { id: input.invoiceId },
      select: { sendMeta: true },
    });

    const sendMeta = (invoice?.sendMeta as Record<string, any> | null) || {};
    const existingAutomation = (sendMeta.automation as Record<string, any> | null) || {};

    await tx.invoice.update({
      where: { id: input.invoiceId },
      data: {
        status: "draft",
        sendMeta: {
          ...sendMeta,
          automation: {
            ...existingAutomation,
            source: "SLACK_COMMAND",
            approvalStatus: "PENDING",
            approvalRequestedAt: now.toISOString(),
            approvalRequestedTo: approvers.map((approver) => approver.userId),
            requestedByUserId: input.actor.internalUserId,
            scheduledSendAt: null,
            slack: {
              teamId: input.slackContext.teamId,
              requestedBySlackUserId: input.slackContext.userId,
              channelId: input.slackContext.channelId,
              responseUrl: input.slackContext.responseUrl,
              commandText: input.slackContext.commandText,
              commandEventId: input.slackContext.eventId,
            },
          },
        },
      },
    });

    await tx.approvalRequest.create({
      data: {
        workspaceId: input.workspaceId,
        entityType: "INVOICE",
        invoiceId: input.invoiceId,
        status: "PENDING",
        requestedByUserId: input.actor.internalUserId,
        requestedByExternalId: input.slackContext.userId,
        source: "SLACK",
        expiresAt,
        metadata: {
          teamId: input.slackContext.teamId,
          channelId: input.slackContext.channelId,
          responseUrl: input.slackContext.responseUrl,
          commandText: input.slackContext.commandText,
          commandEventId: input.slackContext.eventId,
        },
      },
    });
  });
}

async function findClientByName(
  workspaceId: string,
  query?: string
): Promise<
  | { ok: true; client: { id: string; name: string; email: string | null } }
  | { ok: false; error: string }
> {
  if (!query) {
    return { ok: false, error: 'Client is required (client:"Name").' };
  }

  const normalized = query.trim();
  if (!normalized) {
    return { ok: false, error: 'Client is required (client:"Name").' };
  }

  const exact = await prisma.client.findFirst({
    where: {
      workspaceId,
      name: {
        equals: normalized,
        mode: "insensitive",
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  if (exact) {
    return { ok: true, client: exact };
  }

  const matches = await prisma.client.findMany({
    where: {
      workspaceId,
      name: {
        contains: normalized,
        mode: "insensitive",
      },
    },
    orderBy: { name: "asc" },
    take: 5,
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  if (matches.length === 1) {
    return { ok: true, client: matches[0] };
  }

  if (matches.length === 0) {
    return {
      ok: false,
      error: `Client \"${normalized}\" not found. Create the client first in dashboard.`,
    };
  }

  return {
    ok: false,
    error: `Multiple clients matched \"${normalized}\": ${matches.map((m) => m.name).join(", ")}. Use exact client name.`,
  };
}

function helpResponse() {
  return NextResponse.json({
    response_type: "ephemeral",
    text: "PaperChai /invoice commands",
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*Commands*",
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: '`/invoice create client:"Acme" amount:1200 due:2026-02-28 email:billing@acme.com`\\nCreates draft invoice and queues approval.',
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "`/invoice send INV-0001`\\nQueues existing invoice for approval before send.",
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "`/invoice status INV-0001`\\nReturns invoice status.",
        },
      },
    ],
  });
}
