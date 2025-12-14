const fs = require("fs");
const path = require("path");
const { promisify } = require("util");
const glob = require("glob");

const MAX_SIZE_BYTES = 50 * 1024; // 500KB
const IGNORE_PATTERNS = ["node_modules/**", ".next/**", "package-lock.json", "public/**"];

async function checkFileSizes() {
  console.log("📦 Checking file sizes...");

  // Find all files not in ignore patterns
  // Note: This is a simplified check. In a real scenario, we might use git ls-files
  // but for now, let's scan src/app/components directories or just rely on staged files passed script

  // Better approach for pre-commit: check only staged files.
  // But for a general check script, we can scan relevant dirs.
  // Let's make this script accept file paths from arguments (for lint-staged)

  const files = process.argv.slice(2);
  let hasError = false;

  if (files.length === 0) {
    console.log("No files to check.");
    return;
  }

  for (const file of files) {
    try {
      if (!fs.existsSync(file)) continue;

      const stats = fs.statSync(file);
      if (stats.size > MAX_SIZE_BYTES) {
        console.error(
          `❌ File too large: ${file} (${(stats.size / 1024).toFixed(2)} KB). Limit is ${MAX_SIZE_BYTES / 1024} KB.`
        );
        hasError = true;
      }
    } catch (err) {
      console.error(`Error checking ${file}:`, err.message);
    }
  }

  if (hasError) {
    process.exit(1);
  } else {
    console.log("✅ File size check passed.");
  }
}

checkFileSizes();
