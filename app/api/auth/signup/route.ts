"use server";

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { generateToken, hashToken } from "@/lib/auth-tokens";
import { ensureActiveWorkspace } from "@/lib/workspace";
import { signupSchema } from "@/lib/api-schemas";
import { checkRateLimitByProfile } from "@/lib/security/rate-limit-enhanced";
import { logAuditEvent, getClientInfo } from "@/lib/security/audit-log";
import { securityConfig } from "@/lib/security/security.config";
import { buildAppUrl } from "@/lib/app-url";
import { authPolicy, isActiveUserStatus } from "@/lib/security/auth-policy";
import {
  checkPersistentAuthRateLimit,
  checkPersistentEmailCooldown,
} from "@/lib/security/persistent-auth-throttle";
import { z } from "zod";

export async function POST(req: NextRequest) {
  const clientInfo = getClientInfo(req);

  try {
    // 1. Rate limiting - 3 signups per hour per IP
    const rateCheck = await checkPersistentAuthRateLimit(
      req,
      "signup",
      securityConfig.rateLimits.signup.limit,
      securityConfig.rateLimits.signup.windowMs
    ).catch(() => checkRateLimitByProfile(req, "signup"));
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
      where: { email: normalizedEmail },
      select: { id: true, emailVerified: true, status: true },
    });
    if (existing) {
      let verifyUrl: string | undefined;
      if (!existing.emailVerified && isActiveUserStatus(existing.status)) {
        const cooldown = await checkPersistentEmailCooldown(
          normalizedEmail,
          "verificationEmail",
          securityConfig.emailCooldowns.verificationEmail
        ).catch(() => ({ allowed: true }));
        if (cooldown.allowed) {
          await prisma.verificationToken.deleteMany({ where: { identifier: normalizedEmail } });
          const rawToken = generateToken();
          const tokenHash = hashToken(rawToken);
          const expires = new Date(Date.now() + securityConfig.tokenExpiry.verificationEmail);
          await prisma.verificationToken.create({
            data: {
              identifier: normalizedEmail,
              token: tokenHash,
              expires,
            },
          });
          verifyUrl = buildAppUrl(`/verify-email?token=${rawToken}`);
        }
      }

      await logAuditEvent({
        userId: existing.id,
        action: "SIGNUP",
        resourceType: "USER",
        resourceId: existing.id,
        metadata: { existingUser: true },
        ...clientInfo,
      });

      return NextResponse.json({
        success: true,
        message: authPolicy.messages.genericSignup,
        verifyUrl: process.env.NODE_ENV !== "production" ? verifyUrl : undefined,
      });
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
    const expires = new Date(Date.now() + securityConfig.tokenExpiry.verificationEmail);

    await prisma.verificationToken.create({
      data: {
        identifier: normalizedEmail,
        token: tokenHash,
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

    const verifyUrl = buildAppUrl(`/verify-email?token=${rawToken}`);

    return NextResponse.json({
      success: true,
      message: authPolicy.messages.genericSignup,
      verifyUrl: process.env.NODE_ENV !== "production" ? verifyUrl : undefined,
    });
  } catch (error) {
    console.error("[SIGNUP] Error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
