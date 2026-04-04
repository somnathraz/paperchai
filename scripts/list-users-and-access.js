/**
 * Report how many users exist and their access (platform role + workspace memberships).
 * Usage: node scripts/list-users-and-access.js
 * Requires: .env with DATABASE_URL
 */

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      status: true,
      platformRole: true,
      lastLoginAt: true,
      memberships: {
        where: { removedAt: null },
        select: {
          role: true,
          workspace: { select: { id: true, name: true, slug: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  console.log("Users in DB:", users.length);
  console.log("");

  for (const u of users) {
    console.log("---");
    console.log("Email:", u.email);
    console.log("Name:", u.name || "(none)");
    console.log("Status:", u.status);
    console.log("Platform role:", u.platformRole);
    console.log("Last login:", u.lastLoginAt ? u.lastLoginAt.toISOString() : "never");
    console.log("Workspace access (active memberships):");
    if (u.memberships.length === 0) {
      console.log("  (none)");
    } else {
      for (const m of u.memberships) {
        console.log("  -", m.workspace.name, "(" + m.workspace.slug + "):", m.role);
      }
    }
    console.log("");
  }

  // Summary
  const byPlatform = {};
  const byWorkspaceRole = { OWNER: 0, ADMIN: 0, MEMBER: 0, VIEWER: 0 };
  for (const u of users) {
    byPlatform[u.platformRole] = (byPlatform[u.platformRole] || 0) + 1;
    for (const m of u.memberships) {
      byWorkspaceRole[m.role]++;
    }
  }
  console.log("Summary:");
  console.log("  Platform roles:", byPlatform);
  console.log("  Workspace roles (count of memberships):", byWorkspaceRole);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
