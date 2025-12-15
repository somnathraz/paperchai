"use server";

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { addHours, generateToken, hashToken } from "@/lib/auth-tokens";
import { ensureActiveWorkspace } from "@/lib/workspace";
import { signupSchema } from "@/lib/api-schemas";
import { checkRateLimitByProfile } from "@/lib/security/rate-limit-enhanced";
import { logAuditEvent, getClientInfo } from "@/lib/security/audit-log";
import { z } from "zod";

export async function POST(req: NextRequest) {
  const clientInfo = getClientInfo(req);

  try {
    // 1. Rate limiting - 3 signups per hour per IP
    const rateCheck = await checkRateLimitByProfile(req, "signup");
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Too many signup attempts. Please try again later." },
        { status: 429 }
      );
    }

    // 2. Parse and validate body with Zod
    const body = await req.json();
    let validated;
    try {
      validated = signupSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.issues[0];
        return NextResponse.json(
          { error: firstError.message, field: firstError.path[0] },
          { status: 422 }
        );
      }
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const normalizedEmail = validated.email.toLowerCase().trim();

    // 3. Check if user exists
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });
    if (existing) {
      // Audit: Failed signup attempt
      await logAuditEvent({
        action: "LOGIN_FAILED",
        resourceType: "USER",
        metadata: { reason: "signup_email_exists", email: normalizedEmail },
        ...clientInfo,
      });
      return NextResponse.json({ error: "User already exists" }, { status: 409 });
    }

    // 4. Create user
    const hashed = await bcrypt.hash(validated.password, 12); // Increased rounds
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name: validated.name,
        password: hashed,
      },
    });

    // 5. Create workspace
    await ensureActiveWorkspace(user.id, user.name ?? normalizedEmail);

    // 6. Create verification token
    const rawToken = generateToken();
    const tokenHash = hashToken(rawToken);
    const expires = addHours(new Date(), 24);

    await prisma.verificationToken.create({
      data: {
        identifier: normalizedEmail,
        tokenHash,
        expires,
      },
    });

    // 7. Audit: Successful signup
    await logAuditEvent({
      userId: user.id,
      action: "SIGNUP",
      resourceType: "USER",
      resourceId: user.id,
      ...clientInfo,
    });

    const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || "http://localhost:3000";
    const verifyUrl = `${baseUrl}/verify-email?token=${rawToken}`;

    if (process.env.NODE_ENV !== "production") {
      console.log("📨 Email verification link:", verifyUrl);
    }

    return NextResponse.json({
      success: true,
      message: "Account created. Check your email to verify.",
      verifyUrl: process.env.NODE_ENV !== "production" ? verifyUrl : undefined,
    });
  } catch (error) {
    console.error("[SIGNUP] Error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

