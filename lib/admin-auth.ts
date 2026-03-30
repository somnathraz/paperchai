import { Session } from "next-auth";
import { PlatformRole } from "@prisma/client";

export function isAdmin(session: Session | null): boolean {
  if (!session?.user) return false;

  // Check Platform Role from session (injected in auth.ts)
  const role = (session.user as any).platformRole as PlatformRole;

  return (
    role === PlatformRole.INTERNAL_OWNER ||
    role === PlatformRole.INTERNAL_DEV ||
    role === PlatformRole.PLATFORM_ADMIN
  );
}

export function assertAdmin(session: Session | null) {
  if (!isAdmin(session)) {
    throw new Error("Unauthorized: Internal Admin access required");
  }
}
