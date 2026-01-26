import { prisma } from "../lib/prisma";
import { getDashboardState } from "../features/dashboard/lib/get-dashboard-state";

async function main() {
  console.log("Verifying Dashboard State Logic (v2 - Strict 6 States)...");

  // Get a user to test with, preferably one with a workspace
  const user = await prisma.user.findFirst({
    where: { activeWorkspaceId: { not: null } },
  });

  if (!user) {
    console.log("No test user found with active workspace.");
    return;
  }

  console.log(`Testing with User: ${user.email} (${user.id})`);

  // 1. Current State
  const state = await getDashboardState(user.id);
  console.log("Current Dashboard State:", JSON.stringify(state, null, 2));

  // 2. Validate against raw data
  const invoiceStats = await prisma.invoice.groupBy({
    by: ["status"],
    where: { workspaceId: user.activeWorkspaceId! },
    _count: { _all: true },
  });
  console.log("Raw Invoice Stats:", invoiceStats);

  // 3. Simulated Tests (Hypothetical logic check)
  // We can't easily mock prisma here without complex setup, but we can verify current correctness relative to DB.

  if (state.stage === "NO_INVOICE_YET" && state.meta.totalInvoices > 0) {
    console.error("FAIL: State is NO_INVOICE_YET but totalInvoices > 0");
  }

  if (state.stage === "INVOICE_CREATED_BUT_NOT_SENT") {
    if (state.meta.draftCount === 0 || state.meta.sentCount > 0) {
      console.error("FAIL: State is DRAFT but logic mismatch.");
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
