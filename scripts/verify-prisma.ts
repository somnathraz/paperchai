import { prisma } from "../lib/prisma";

async function main() {
  console.log("Checking Prisma Client for AutomationRule model...");

  if ((prisma as any).automationRule) {
    console.log("✅ prisma.automationRule EXISTS");
    const count = await (prisma as any).automationRule.count();
    console.log(`Current automated rules count: ${count}`);
  } else {
    console.log("❌ prisma.automationRule is UNDEFINED");
    console.log(
      "Available models:",
      Object.keys(prisma).filter((k) => !k.startsWith("_") && !k.startsWith("$"))
    );
  }
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
