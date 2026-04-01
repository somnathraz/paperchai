"use server";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { addHours, generateToken, hashToken } from "@/lib/auth-tokens";
import { checkIpRateLimit } from "@/lib/rate-limiter";

export async function POST(req: NextRequest) {
  const rl = checkIpRateLimit(req);
  if (!rl.allowed) {
    return NextResponse.json({ error: rl.error }, { status: 429 });
  }

  try {
    const { email } = await req.json();
    const normalizedEmail = email?.toLowerCase().trim();
    if (!normalizedEmail) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      return NextResponse.json({ error: "No account found for this email" }, { status: 404 });
    }

    // Clear existing reset tokens for this identifier
    await prisma.passwordResetToken.deleteMany({ where: { identifier: normalizedEmail } });

    const rawToken = generateToken();
    const tokenHash = hashToken(rawToken);
    const expires = addHours(new Date(), 1);

    await prisma.passwordResetToken.create({
      data: {
        identifier: normalizedEmail,
        tokenHash,
        expires,
      },
    });

    const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || "http://localhost:3000";
    const resetUrl = `${baseUrl}/reset-password?token=${rawToken}`;

    if (process.env.NODE_ENV !== "production") {
      console.log("📨 Password reset link:", resetUrl);
    }

    return NextResponse.json({
      success: true,
      message: "If the email exists, a reset link has been sent.",
      resetUrl: process.env.NODE_ENV !== "production" ? resetUrl : undefined,
    });
  } catch (error) {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
