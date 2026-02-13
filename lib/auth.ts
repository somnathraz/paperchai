import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { authPolicy, isActiveUserStatus } from "@/lib/security/auth-policy";
import { getSessionVersion } from "@/lib/security/auth-session-version";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.toLowerCase().trim();
        const password = credentials?.password;

        if (!email || !password) {
          throw new Error(authPolicy.messages.invalidCredentials);
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          throw new Error(authPolicy.messages.invalidCredentials);
        }

        if (!user.password) {
          throw new Error(authPolicy.messages.invalidCredentials);
        }

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
          throw new Error(authPolicy.messages.invalidCredentials);
        }

        if (!user.emailVerified) {
          throw new Error(authPolicy.messages.verifyEmail);
        }

        if (!isActiveUserStatus(user.status)) {
          throw new Error(authPolicy.messages.invalidCredentials);
        }

        const sessionVersion = await getSessionVersion(user.id);

        return {
          id: user.id,
          name: user.name ?? user.email.split("@")[0],
          email: user.email,
          sessionVersion: String(sessionVersion),
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google" && user.email) {
        const email = user.email.toLowerCase().trim();
        let dbUser = await prisma.user.findUnique({ where: { email } });

        if (!dbUser) {
          dbUser = await prisma.user.create({
            data: {
              email,
              name: user.name ?? email.split("@")[0],
              image: user.image ?? null,
              emailVerified: new Date(),
              status: "ACTIVE",
              platformRole: "USER",
            },
          });
        } else {
          // Block suspended users
          if (!isActiveUserStatus(dbUser.status)) return false;

          // Update basic profile info
          await prisma.user.update({
            where: { id: dbUser.id },
            data: { image: user.image ?? dbUser.image, lastLoginAt: new Date() },
          });
        }
        user.id = dbUser.id;
      }
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      // Initial sign in
      if (user) {
        token.sub = user.id;
        token.sessionVersion = Number((user as any).sessionVersion ?? 0);
      }

      // Handle Active Workspace updates (Client sending update)
      if (trigger === "update" && session?.activeWorkspaceId) {
        token.workspaceId = session.activeWorkspaceId;
        // Persist preference to DB for convenience (optional)
        await prisma.user
          .update({
            where: { id: token.sub },
            data: { activeWorkspaceId: session.activeWorkspaceId },
          })
          .catch(console.error);
      }

      if (token.sub) {
        const currentVersion = await getSessionVersion(token.sub as string);
        if (currentVersion !== Number(token.sessionVersion ?? 0)) {
          delete token.sub;
          delete token.workspaceId;
          token.invalidated = true;
          return token;
        }
      }

      // If no workspace in token, try to load last valid one from DB or first available
      if (!token.workspaceId && token.sub) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { activeWorkspaceId: true },
        });

        if (dbUser?.activeWorkspaceId) {
          token.workspaceId = dbUser.activeWorkspaceId;
        } else {
          // Fallback: Find first membership
          const firstMember = await prisma.workspaceMember.findFirst({
            where: { userId: token.sub },
            select: { workspaceId: true },
          });
          if (firstMember) token.workspaceId = firstMember.workspaceId;
        }
      }

      // Enforce Rule C: JWT stays minimal.
      // We do NOT attach role, currency, etc.
      // We only keep userId (sub) and workspaceId.

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.activeWorkspaceId = (token.workspaceId as string) || undefined;

        // 1. Load Platform Role (Identity)
        if (session.user.id) {
          const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { platformRole: true, email: true },
          });
          if (user) {
            (session.user as any).platformRole = user.platformRole;
          }
        }

        // 2. Load Workspace Defaults (Rule B: Store Identity only, fetch Defaults from Workspace)
        if (session.user.activeWorkspaceId) {
          const workspaceSettings = await prisma.workspaceSettings.findUnique({
            where: { workspaceId: session.user.activeWorkspaceId },
          });

          if (workspaceSettings) {
            // Map workspace settings to session user for frontend compatibility
            session.user.currency = workspaceSettings.currency;
            session.user.timezone = workspaceSettings.timezone;
            session.user.reminderTone = workspaceSettings.defaultReminderTone || "Warm + Polite";
          }

          // Fetch workspace name if missing from token (minimal JWT)
          const workspace = await prisma.workspace.findUnique({
            where: { id: session.user.activeWorkspaceId },
            select: { name: true },
          });
          if (workspace) session.user.workspaceName = workspace.name;
        }
      }
      return session;
    },
  },
};
