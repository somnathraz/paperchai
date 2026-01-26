import { NextRequest, NextResponse } from "next/server";
import { addHours, addMinutes } from "date-fns";
import { prisma } from "@/lib/prisma";
import { computeSendAt } from "@/lib/reminders";
import { generateInvoiceDraftFromMilestone } from "@/lib/projects/invoicing";
import { securityConfig } from "@/lib/security/security.config";
import { sendAutomationApprovalEmail } from "@/lib/invoices/approval-email";

type RuleResult = {
  id: string;
  trigger: string;
  processed: number;
  skipped: number;
  errors: number;
  messages: string[];
};

const REMINDER_SEQUENCES: Record<
  string,
  Array<{
    index: number;
    daysBeforeDue?: number;
    daysAfterDue?: number;
    templateSlug: string;
    notifyCreator: boolean;
  }>
> = {
  STANDARD: [
    { index: 0, daysBeforeDue: 3, templateSlug: "reminder-gentle", notifyCreator: false },
    { index: 1, daysAfterDue: 0, templateSlug: "reminder-standard", notifyCreator: true },
    { index: 2, daysAfterDue: 7, templateSlug: "reminder-assertive", notifyCreator: true },
  ],
  AGGRESSIVE: [
    { index: 0, daysBeforeDue: 5, templateSlug: "reminder-gentle", notifyCreator: false },
    { index: 1, daysBeforeDue: 1, templateSlug: "reminder-standard", notifyCreator: true },
    { index: 2, daysAfterDue: 0, templateSlug: "reminder-standard", notifyCreator: true },
    { index: 3, daysAfterDue: 2, templateSlug: "reminder-assertive", notifyCreator: true },
    { index: 4, daysAfterDue: 5, templateSlug: "reminder-assertive", notifyCreator: true },
  ],
};

const RUN_LIMITS = {
  rules: 50,
  milestones: 50,
  invoices: 50,
};

const STEP_CATCH_UP_MINUTES = 30;
const MILESTONE_GRACE_DAYS = 7;

const shouldSkipMilestone = (milestone: any) => {
  if (milestone.skipAutomation) {
    return { skip: true, reason: "Explicitly skipped" };
  }

  if (milestone.status === "PAID" || milestone.status === "INVOICED") {
    return { skip: true, reason: "Already invoiced or paid" };
  }

  if (milestone.lastManualActionAt) {
    const daysSinceAction = Math.floor(
      (Date.now() - new Date(milestone.lastManualActionAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceAction < MILESTONE_GRACE_DAYS) {
      return { skip: true, reason: "Manual action grace period" };
    }
  }

  return { skip: false };
};

const parseScopeTokens = (scopeValue?: string | null) => {
  if (!scopeValue) return [];
  return scopeValue
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
};

const resolveClientIds = async (workspaceId: string, tokens: string[]) => {
  if (tokens.length === 0) return [];

  const clients = await prisma.client.findMany({
    where: {
      workspaceId,
      OR: [{ id: { in: tokens } }, { email: { in: tokens } }],
    },
    select: { id: true },
  });

  return clients.map((client) => client.id);
};

const buildScopeFilters = async (rule: any) => {
  const scopeValue = rule.scopeValue as string | null | undefined;
  const scope = rule.scope as string;
  const workspaceId = rule.workspaceId as string;

  const scopeFilters: {
    projectWhere: Record<string, any>;
    invoiceWhere: Record<string, any>;
    valid: boolean;
    reason?: string;
  } = {
    projectWhere: { workspaceId },
    invoiceWhere: { workspaceId },
    valid: true,
  };

  if (scope === "BY_TAG") {
    if (!scopeValue) {
      return { ...scopeFilters, valid: false, reason: "Missing tag filter" };
    }
    scopeFilters.projectWhere.tags = { contains: scopeValue, mode: "insensitive" };
    scopeFilters.invoiceWhere.OR = [
      { project: { tags: { contains: scopeValue, mode: "insensitive" } } },
      { client: { tags: { contains: scopeValue, mode: "insensitive" } } },
    ];
  }

  if (scope === "BY_RISK_LEVEL") {
    if (!scopeValue) {
      return { ...scopeFilters, valid: false, reason: "Missing risk filter" };
    }
    scopeFilters.projectWhere.riskBadge = { contains: scopeValue, mode: "insensitive" };
    scopeFilters.invoiceWhere.OR = [
      { project: { riskBadge: { contains: scopeValue, mode: "insensitive" } } },
      { client: { riskBadge: { contains: scopeValue, mode: "insensitive" } } },
    ];
  }

  if (scope === "SPECIFIC_CLIENT" || scope === "SELECTED_CLIENTS") {
    const tokens = parseScopeTokens(scopeValue);
    const clientIds = await resolveClientIds(workspaceId, tokens);
    if (clientIds.length === 0) {
      return { ...scopeFilters, valid: false, reason: "No matching clients for scope" };
    }
    scopeFilters.projectWhere.clientId = { in: clientIds };
    scopeFilters.invoiceWhere.clientId = { in: clientIds };
  }

  return scopeFilters;
};

const loadTemplateMap = async (workspaceId: string, cache: Map<string, Map<string, string>>) => {
  if (cache.has(workspaceId)) {
    return cache.get(workspaceId)!;
  }

  const templates = await prisma.emailTemplate.findMany({
    where: { workspaceId },
    select: { id: true, slug: true },
  });

  const templateMap = new Map<string, string>();
  templates.forEach((template) => {
    if (template.slug) {
      templateMap.set(template.slug, template.id);
    }
  });

  cache.set(workspaceId, templateMap);
  return templateMap;
};

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const cronHeader = req.headers.get(securityConfig.cron.secretHeader);
    const expectedSecret = process.env.CRON_SECRET;

    if (securityConfig.cron.requireAuth) {
      if (!expectedSecret) {
        console.error("[CRON] CRON_SECRET not configured");
        return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
      }

      const providedSecret =
        cronHeader || (authHeader?.startsWith("Bearer ") && authHeader.slice(7));

      if (providedSecret !== expectedSecret) {
        console.warn("[CRON] Unauthorized automation/run attempt");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const now = new Date();
    const rules = await prisma.automationRule.findMany({
      where: { status: "ACTIVE" },
      take: RUN_LIMITS.rules,
    });

    const templateCache = new Map<string, Map<string, string>>();
    const results: RuleResult[] = [];

    for (const rule of rules) {
      const result: RuleResult = {
        id: rule.id,
        trigger: rule.trigger,
        processed: 0,
        skipped: 0,
        errors: 0,
        messages: [],
      };

      try {
        const scopeFilters = await buildScopeFilters(rule);
        if (!scopeFilters.valid) {
          result.skipped += 1;
          result.messages.push(scopeFilters.reason || "Invalid scope configuration");
        } else if (rule.trigger === "MILESTONE_DUE") {
          const milestones = await prisma.projectMilestone.findMany({
            where: {
              project: scopeFilters.projectWhere,
              dueDate: { lte: now },
              invoiceId: null,
              status: { notIn: ["INVOICED", "PAID", "CANCELLED"] },
            },
            include: {
              project: true,
            },
            take: RUN_LIMITS.milestones,
          });

          for (const milestone of milestones) {
            if (!milestone.project.autoInvoiceEnabled || !milestone.autoInvoiceEnabled) {
              result.skipped += 1;
              continue;
            }

            const skipCheck = shouldSkipMilestone(milestone);
            if (skipCheck.skip) {
              result.skipped += 1;
              continue;
            }

            try {
              const scheduledSendAt = milestone.dueDate ? new Date(milestone.dueDate) : now;
              const invoice = await generateInvoiceDraftFromMilestone(milestone.id, {
                automationRuleId: rule.id,
                approvalRequired: true,
                scheduledSendAt,
              });
              try {
                await sendAutomationApprovalEmail(invoice.id);
              } catch (error: any) {
                const detail = error instanceof Error ? error.message : String(error);
                result.messages.push(`Approval email failed for invoice ${invoice.id}: ${detail}`);
              }
              result.processed += 1;
            } catch (error: any) {
              result.errors += 1;
              result.messages.push(`Milestone ${milestone.id} failed: ${error.message || "error"}`);
            }
          }
        } else if (rule.trigger === "INVOICE_OVERDUE") {
          const channels = (rule.channels || "").split(",").map((value) => value.trim());
          if (!channels.includes("email")) {
            result.skipped += 1;
            result.messages.push("No email channel configured");
          } else if (rule.sequence === "CUSTOM") {
            result.skipped += 1;
            result.messages.push("Custom sequences require manual setup");
          } else {
            const invoices = await prisma.invoice.findMany({
              where: {
                ...scopeFilters.invoiceWhere,
                status: "overdue",
              },
              include: {
                reminderSchedule: true,
              },
              take: RUN_LIMITS.invoices,
            });

            if (invoices.length === 0) {
              result.skipped += 1;
            }

            const templateMap = await loadTemplateMap(rule.workspaceId, templateCache);
            const fallbackTemplateId = Array.from(templateMap.values())[0];

            if (!fallbackTemplateId) {
              result.errors += 1;
              result.messages.push("No email templates available for reminders");
            } else {
              const steps = REMINDER_SEQUENCES[rule.sequence] || REMINDER_SEQUENCES.STANDARD;

              for (const invoice of invoices) {
                if (invoice.remindersEnabled && invoice.reminderSchedule?.enabled) {
                  result.skipped += 1;
                  continue;
                }

                if (!invoice.dueDate) {
                  result.skipped += 1;
                  continue;
                }

                try {
                  await prisma.$transaction(async (tx) => {
                    await tx.invoice.update({
                      where: { id: invoice.id },
                      data: { remindersEnabled: true },
                    });

                    const schedule = await tx.invoiceReminderSchedule.upsert({
                      where: { invoiceId: invoice.id },
                      create: {
                        invoiceId: invoice.id,
                        workspaceId: rule.workspaceId,
                        enabled: true,
                        useDefaults: true,
                        presetName: rule.sequence,
                      },
                      update: {
                        enabled: true,
                        useDefaults: true,
                        presetName: rule.sequence,
                      },
                    });

                    await tx.invoiceReminderStep.deleteMany({
                      where: { scheduleId: schedule.id },
                    });

                    for (const step of steps) {
                      const offsetFromDueInMinutes = step.daysBeforeDue
                        ? -step.daysBeforeDue * 24 * 60
                        : (step.daysAfterDue || 0) * 24 * 60;

                      let sendAt = computeSendAt(invoice.dueDate as Date, offsetFromDueInMinutes);
                      if (sendAt < now) {
                        sendAt = addMinutes(now, step.index * STEP_CATCH_UP_MINUTES);
                      }

                      const templateId = templateMap.get(step.templateSlug) || fallbackTemplateId;

                      await tx.invoiceReminderStep.create({
                        data: {
                          scheduleId: schedule.id,
                          index: step.index,
                          daysBeforeDue: step.daysBeforeDue,
                          daysAfterDue: step.daysAfterDue,
                          offsetFromDueInMinutes,
                          sendAt,
                          emailTemplateId: templateId,
                          notifyCreator: step.notifyCreator,
                          status: "PENDING",
                        },
                      });
                    }
                  });

                  result.processed += 1;
                } catch (error: any) {
                  result.errors += 1;
                  result.messages.push(`Invoice ${invoice.id} failed: ${error.message || "error"}`);
                }
              }
            }
          }
        } else {
          result.skipped += 1;
          result.messages.push("Trigger not supported by runner");
        }
      } catch (error: any) {
        result.errors += 1;
        result.messages.push(error.message || "Unhandled error");
      }

      await prisma.automationRule.update({
        where: { id: rule.id },
        data: {
          lastRunAt: now,
          nextRunAt: addHours(now, 1),
          runCount: { increment: 1 },
          errorCount: { increment: result.errors },
        },
      });

      results.push(result);
    }

    return NextResponse.json({ processedRules: results.length, results });
  } catch (error) {
    console.error("[AUTOMATION_RUNNER]", error);
    return NextResponse.json({ error: "Automation runner failed" }, { status: 500 });
  }
}
