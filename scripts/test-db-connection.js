/**
 * Test database connection(s) from .env
 * Uses DATABASE_URL (pooler) and DIRECT_URL (direct).
 * Usage: node scripts/test-db-connection.js
 */

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });

async function testUrl(name, url) {
  if (!url) {
    console.log(`[${name}] No URL set, skip`);
    return false;
  }
  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient({
    datasources: {
      db: { url },
    },
  });
  try {
    await prisma.$queryRaw`SELECT 1 as ok`;
    const host = url.includes("@") ? url.split("@")[1].split("/")[0] : "...";
    console.log(`[${name}] OK – connected (${host})`);
    return true;
  } catch (err) {
    console.error(`[${name}] FAIL –`, err.message);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  console.log("Testing DB connections from .env\n");

  const poolerOk = await testUrl("DATABASE_URL (pooler)", process.env.DATABASE_URL);
  const directOk = await testUrl("DIRECT_URL (direct)", process.env.DIRECT_URL);

  console.log("");
  if (poolerOk && directOk) {
    console.log("All connections OK. You can run: npx prisma migrate deploy");
    process.exit(0);
  }
  if (poolerOk && !directOk) {
    console.log("Pooler works; direct failed. Run migrations from Supabase SQL or another env.");
    process.exit(1);
  }
  if (!poolerOk) {
    console.log("Pooler connection failed. Check DATABASE_URL and network.");
    process.exit(1);
  }
}

main();
