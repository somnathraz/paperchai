import { prisma } from "../lib/prisma";

async function main() {
  console.log("Debugging Invoice Automation...");

  // 1. Get User
  const user = await prisma.user.findFirst({
    where: { activeWorkspaceId: { not: null } },
  });

  if (!user) {
    console.log("No user found");
    return;
  }
  console.log(`User: ${user.email} (${user.id})`);
  const workspaceId = user.activeWorkspaceId!;

  // 2. Get Latest Invoice with all relations
  const invoice = await prisma.invoice.findFirst({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    include: {
      reminderSchedule: {
        include: {
          steps: true,
        },
      },
      reminders: true, // ReminderHistory
      client: true,
    },
  });

  if (!invoice) {
    console.log("No invoice found");
    return;
  }

  console.log(`\nLatest Invoice: ${invoice.number}`);
  console.log(`ID: ${invoice.id}`);
  console.log(`Status: ${invoice.status}`);
  console.log(`Sent At: ${invoice.lastSentAt}`);

  // 3. Check Reminder Schedule
  console.log("\n--- Reminder Schedule (Per-Invoice) ---");
  if (invoice.reminderSchedule) {
    console.log(`Enabled: ${invoice.reminderSchedule.enabled}`);
    console.log(`Steps Found: ${invoice.reminderSchedule.steps.length}`);
    invoice.reminderSchedule.steps.forEach((step, i) => {
      console.log(
        `  Step ${i + 1}: Status=${step.status}, SendAt=${step.sendAt.toLocaleString()}, Days=${step.daysAfterDue} after due`
      );
    });
  } else {
    console.log("No reminder schedule found for this invoice.");
  }

  // 4. Check Reminder History
  console.log("\n--- Reminder History (Logs) ---");
  if (invoice.reminders.length > 0) {
    invoice.reminders.forEach((r, i) => {
      console.log(
        `  Log ${i + 1}: Kind=${r.kind}, Status=${r.status}, SentAt=${r.sentAt.toLocaleString()}, Channel=${r.channel}`
      );
    });
  } else {
    console.log("No reminder history found.");
  }

  // 5. Check Global Automation Rules
  console.log("\n--- Global Automation Rules ---");
  const rules = await prisma.automationRule.findMany({
    where: { workspaceId },
  });
  if (rules.length > 0) {
    rules.forEach((r) => console.log(`  Rule: ${r.name} (Status: ${r.status})`));
  } else {
    console.log("No global automation rules found.");
  }

  // 6. Check Reminder Settings (Master Switch)
  const settings = await prisma.reminderSettings.findUnique({ where: { workspaceId } });
  console.log(`\nGlobal Reminder Settings: Enabled=${settings?.enabled}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
