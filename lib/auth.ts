import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { ensureActiveWorkspace } from "@/lib/workspace";
import bcrypt from "bcryptjs";

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

        if (!user.emailVerified) {
          throw new Error("Verify email to continue");
        }

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
          throw new Error("Invalid credentials");
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
      // For Google OAuth, ensure user exists in database
      if (account?.provider === "google" && user.email) {
        const email = user.email.toLowerCase().trim();
        let dbUser = await prisma.user.findUnique({ where: { email } });

        if (!dbUser) {
          // Create user if they don't exist
          dbUser = await prisma.user.create({
            data: {
              email,
              name: user.name ?? email.split("@")[0],
              image: user.image ?? null,
              emailVerified: new Date(),
            },
          });
        } else if (!dbUser.emailVerified) {
          // Update emailVerified if user exists but wasn't verified
          dbUser = await prisma.user.update({
            where: { id: dbUser.id },
            data: { emailVerified: new Date(), image: user.image ?? dbUser.image },
          });
        }

        // Set the database user ID as the token sub
        user.id = dbUser.id;
      }
      return true;
    },
    async jwt({ token, user, trigger }) {
      // On first sign in, use the user.id (which we set in signIn callback)
      if (user?.id) {
        token.sub = user.id;
      }

      if (!token.sub) {
        return token;
      }

      if (user || trigger === "update") {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          include: { activeWorkspace: true },
        });

        if (dbUser) {
          const workspace =
            dbUser.activeWorkspace || (await ensureActiveWorkspace(dbUser.id, dbUser.name ?? dbUser.email));

          token.name = dbUser.name ?? token.name;
          token.role = dbUser.role ?? "Founder";
          token.timezone = dbUser.timezone ?? "Asia/Kolkata";
          token.currency = dbUser.currency ?? "INR";
          token.reminderTone = dbUser.reminderTone ?? "Warm + Polite";
          token.backupEmail = dbUser.backupEmail ?? null;
          token.workspaceId = workspace?.id ?? null;
          token.workspaceName = workspace?.name ?? null;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.role = (token.role as string) || undefined;
        session.user.timezone = (token.timezone as string) || undefined;
        session.user.currency = (token.currency as string) || undefined;
        session.user.reminderTone = (token.reminderTone as string) || undefined;
        session.user.backupEmail = (token.backupEmail as string) || undefined;
        session.user.workspaceId = (token.workspaceId as string) || undefined;
        session.user.workspaceName = (token.workspaceName as string) || undefined;
      }
      return session;
    },
  },
};

