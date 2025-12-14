import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role?: string;
      timezone?: string;
      currency?: string;
      reminderTone?: string;
      backupEmail?: string | null;
      workspaceId?: string;
      workspaceName?: string;
    } & DefaultSession["user"];
  }

  interface User {
    role?: string;
    timezone?: string;
    currency?: string;
    reminderTone?: string;
    backupEmail?: string | null;
    workspaceId?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    timezone?: string;
    currency?: string;
    reminderTone?: string;
    backupEmail?: string | null;
    workspaceId?: string | null;
    workspaceName?: string | null;
  }
}
