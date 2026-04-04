import { prisma } from "../lib/prisma";

async function main() {
  console.log("Checking automation rules...");
  const count = await prisma.automationRule.count();
  console.log("Total Automation Rules:", count);

  const rules = await prisma.automationRule.findMany({
    include: {
      workspace: true,
    },
  });

  if (rules.length === 0) {
    console.log("No rules found.");
  } else {
    console.log("Found rules:");
    rules.forEach((r) => {
      console.log(
        `ID: ${r.id}, Name: ${r.name}, Status: ${r.status}, Workspace: ${r.workspace?.name} (${r.workspaceId})`
      );
    });
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
