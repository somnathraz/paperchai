import { prisma } from "../lib/prisma";

const BASE_URL = process.argv[2] || "http://localhost:3000";

function log(name: string, ok: boolean, detail?: string) {
  const prefix = ok ? "OK" : "FAIL";
  console.log(`${prefix} ${name}${detail ? ` - ${detail}` : ""}`);
}

async function main() {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    throw new Error("CRON_SECRET is required in .env for internal reminder runner checks");
  }

  const user = await prisma.user.findFirst({ where: { activeWorkspaceId: { not: null } } });
  if (!user?.activeWorkspaceId) {
    throw new Error("No user with active workspace found");
  }

  const workspaceId = user.activeWorkspaceId;
  console.log(`Workspace: ${workspaceId}`);

  // Ensure reminder settings row exists and is enabled.
  await prisma.reminderSettings.upsert({
    where: { workspaceId },
    create: { workspaceId, enabled: true, timezone: "Asia/Kolkata" },
    update: { enabled: true },
  });

  // Pick an invoice without client email so test never sends real email.
  let invoice = await prisma.invoice.findFirst({
    where: {
      workspaceId,
      dueDate: { not: null },
      status: { in: ["draft", "sent", "overdue"] },
      client: {
        email: null,
      },
    },
    include: {
      client: true,
      reminderSchedule: true,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!invoice) {
    const testClient = await prisma.client.create({
      data: {
        workspaceId,
        name: `E2E Reminder Client ${Date.now()}`,
        email: null,
        reliabilityScore: 100,
        averageDelayDays: 0,
        outstanding: 0,
      },
    });

    invoice = await prisma.invoice.create({
      data: {
        workspaceId,
        clientId: testClient.id,
        number: `E2E-REM-${Date.now()}`,
        status: "draft",
        issueDate: new Date(),
        dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
        currency: "INR",
        subtotal: 1000,
        taxTotal: 0,
        total: 1000,
      },
      include: {
        client: true,
        reminderSchedule: true,
      },
    });
    log("created fallback e2e invoice", true, invoice.id);
  }

  // Pick reminder template if available (optional for no-email path, but keep flow complete).
  const template =
    (await prisma.emailTemplate.findFirst({
      where: { workspaceId, slug: "reminder-standard" },
      select: { id: true },
    })) ||
    (await prisma.emailTemplate.findFirst({
      where: { workspaceId },
      select: { id: true },
    }));

  const schedule = await prisma.invoiceReminderSchedule.upsert({
    where: { invoiceId: invoice.id },
    create: {
      invoiceId: invoice.id,
      workspaceId,
      enabled: true,
      useDefaults: true,
      createdByUserId: user.id,
    },
    update: { enabled: true },
  });

  await prisma.invoice.update({ where: { id: invoice.id }, data: { remindersEnabled: true } });

  const step = await prisma.invoiceReminderStep.create({
    data: {
      scheduleId: schedule.id,
      index: 99,
      daysAfterDue: 0,
      offsetFromDueInMinutes: 0,
      sendAt: new Date(Date.now() - 60_000),
      status: "PENDING",
      notifyCreator: true,
      emailTemplateId: template?.id,
    },
  });

  log("prepared pending reminder step", true, step.id);

  const unauthSend = await fetch(`${BASE_URL}/api/reminders/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ invoiceId: invoice.id }),
  });
  log("reminders/send requires auth", unauthSend.status === 401, `status=${unauthSend.status}`);

  const unauthAction = await fetch(`${BASE_URL}/api/reminders/actions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "retry", stepId: step.id }),
  });
  log(
    "reminders/actions requires auth",
    unauthAction.status === 401,
    `status=${unauthAction.status}`
  );

  const unauthTimeline = await fetch(`${BASE_URL}/api/reminders/timeline/${invoice.id}`);
  log(
    "reminders/timeline requires auth",
    unauthTimeline.status === 401,
    `status=${unauthTimeline.status}`
  );

  const unauthStepLog = await fetch(`${BASE_URL}/api/reminders/steps/${step.id}`);
  log(
    "reminders/steps requires auth",
    unauthStepLog.status === 401,
    `status=${unauthStepLog.status}`
  );

  // Unauthorized check
  const unauthRes = await fetch(`${BASE_URL}/api/internal/reminders/run`, { method: "POST" });
  log("runner rejects unauthorized", unauthRes.status === 401, `status=${unauthRes.status}`);

  // Authorized run
  const runRes = await fetch(`${BASE_URL}/api/internal/reminders/run`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cronSecret}`,
    },
  });

  const runText = await runRes.text();
  log("runner authorized call", runRes.ok, `status=${runRes.status}`);

  let runData: any = {};
  try {
    runData = JSON.parse(runText);
  } catch {
    // ignore
  }

  if (!runRes.ok) {
    if (runRes.status === 500 && runText.includes("Server misconfigured")) {
      throw new Error(
        "Reminder runner is misconfigured in running app process. Restart dev server after adding CRON_SECRET."
      );
    }
    throw new Error(`Runner failed: ${runText}`);
  }

  const updatedStep = await prisma.invoiceReminderStep.findUnique({ where: { id: step.id } });
  if (!updatedStep) {
    throw new Error("Step not found after runner execution");
  }

  // No-email case should move back to PENDING (retry) or FAILED after retry threshold.
  const transitioned = ["PENDING", "FAILED"].includes(updatedStep.status);
  log(
    "step transitioned by runner",
    transitioned,
    `status=${updatedStep.status} error=${updatedStep.lastError || "none"}`
  );

  const hist = await prisma.reminderHistory.findMany({
    where: { workspaceId, invoiceId: invoice.id },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  console.log(`Runner processed: ${runData?.processed ?? "unknown"}`);
  console.log(`Recent reminder history count: ${hist.length}`);

  if (!transitioned) {
    process.exitCode = 1;
  }
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
