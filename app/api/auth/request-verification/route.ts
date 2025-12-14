"use server";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { addHours, generateToken, hashToken } from "@/lib/auth-tokens";

export async function POST(req: Request) {
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

    if (user.emailVerified) {
      return NextResponse.json({ error: "Email is already verified" }, { status: 400 });
    }

    // Remove any existing tokens for this user
    await prisma.verificationToken.deleteMany({ where: { identifier: normalizedEmail } });

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

    const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || "http://localhost:3000";
    const verifyUrl = `${baseUrl}/verify-email?token=${rawToken}`;

    if (process.env.NODE_ENV !== "production") {
      console.log("📨 Resent verification link:", verifyUrl);
    }

    return NextResponse.json({
      success: true,
      message: "Verification email sent",
      verifyUrl: process.env.NODE_ENV !== "production" ? verifyUrl : undefined,
    });
  } catch (error) {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
