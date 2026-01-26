const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  console.log("Fixing Enums in Database...");

  // 1. WorkspaceMember Role (owner -> OWNER, viewer -> VIEWER, etc)
  // We use executeRawUnsafe because semantic types might mismatch before migration
  try {
    await prisma.$executeRawUnsafe(
      `UPDATE "WorkspaceMember" SET "role" = 'OWNER' WHERE "role" = 'owner';`
    );
    await prisma.$executeRawUnsafe(
      `UPDATE "WorkspaceMember" SET "role" = 'VIEWER' WHERE "role" = 'viewer';`
    );
    await prisma.$executeRawUnsafe(
      `UPDATE "WorkspaceMember" SET "role" = 'MEMBER' WHERE "role" NOT IN ('OWNER', 'VIEWER', 'ADMIN');`
    );
    console.log("✅ WorkspaceMember roles updated.");
  } catch (e) {
    console.warn(
      "⚠️  Could not update WorkspaceMember roles (Table might not exist or empty):",
      e.message
    );
  }

  // 2. WorkspaceInvite Role
  try {
    await prisma.$executeRawUnsafe(
      `UPDATE "WorkspaceInvite" SET "role" = 'OWNER' WHERE "role" = 'owner';`
    );
    await prisma.$executeRawUnsafe(
      `UPDATE "WorkspaceInvite" SET "role" = 'VIEWER' WHERE "role" = 'viewer';`
    );
    await prisma.$executeRawUnsafe(
      `UPDATE "WorkspaceInvite" SET "role" = 'MEMBER' WHERE "role" NOT IN ('OWNER', 'VIEWER', 'ADMIN');`
    );
    console.log("✅ WorkspaceInvite roles updated.");
  } catch (e) {
    console.warn("⚠️  Could not update WorkspaceInvite roles:", e.message);
  }

  // 3. User Role (if any conflict with PlatformRole, currently User.role is String 'Founder')
  // User.platformRole is NEW default 'USER'. Existing `role` column is String but we are replacing `role` with `platformRole`?
  // Old schema had `role` String on User. New schema REMOVES `role` (replaced by platformRole?).
  // Wait, my replacement for User did NOT have `role`.
  // So `role` column will be DROPPED by db push.
  // And `platformRole` will be ADDED (default USER).
  // So NO migration needed for User.role string -> enum.

  console.log("Enum fix complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
