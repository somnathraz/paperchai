import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { PlatformRole } from "@prisma/client";
import { ensureActiveWorkspace } from "@/lib/workspace";

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
          throw new Error("Missing credentials");
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          throw new Error("Account not found");
        }

        if (!user.password) {
          throw new Error("Use Google sign-in for this account");
        }

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
          throw new Error("Invalid credentials");
        }

        if (user.status !== "ACTIVE") {
          throw new Error("Account is suspended or deleted");
        }

        return {
          id: user.id,
          name: user.name ?? user.email.split("@")[0],
          email: user.email,
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
          if (dbUser.status !== "ACTIVE") return false;

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
