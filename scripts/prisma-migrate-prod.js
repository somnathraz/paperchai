/**
 * Runs `prisma migrate deploy` against production URLs from env files.
 * Set DATABASE_URL_PROD (and optionally DIRECT_URL_PROD) in .env or .env.local.
 */
require("dotenv").config({ path: ".env" });
require("dotenv").config({ path: ".env.local", override: true });

const { execSync } = require("child_process");

const url = process.env.DATABASE_URL_PROD;
const direct = process.env.DIRECT_URL_PROD || process.env.DATABASE_URL_PROD;

if (!url) {
  console.error(
    "DATABASE_URL_PROD is not set. Add it to .env or .env.local (do not commit secrets)."
  );
  process.exit(1);
}

execSync("npx prisma migrate deploy", {
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: url, DIRECT_URL: direct },
});
