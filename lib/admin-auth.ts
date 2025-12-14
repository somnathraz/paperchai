import { Session } from "next-auth";

export function isAdmin(email?: string | null): boolean {
    if (!email) return false;

    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail) return false;

    // Simple equality check, case-insensitive
    return email.toLowerCase().trim() === adminEmail.toLowerCase().trim();
}

export function assertAdmin(session: Session | null) {
    if (!session?.user?.email || !isAdmin(session.user.email)) {
        throw new Error("Unauthorized: Admin access required");
    }
}
