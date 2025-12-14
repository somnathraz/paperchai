"use server";

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { addHours, generateToken, hashToken } from "@/lib/auth-tokens";
import { ensureActiveWorkspace } from "@/lib/workspace";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    const normalizedEmail = email?.toLowerCase().trim();
    const passwordValue = password as string | undefined;

    if (!normalizedEmail || !passwordValue) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json({ error: "Enter a valid email address" }, { status: 422 });
    }

    if (passwordValue.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 422 });
    }

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return NextResponse.json({ error: "User already exists" }, { status: 409 });
    }

    const hashed = await bcrypt.hash(passwordValue, 10);
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name: normalizedEmail.split("@")[0],
        password: hashed,
      },
    });

    await ensureActiveWorkspace(user.id, user.name ?? normalizedEmail);

    // Create verification token
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
      console.log("📨 Email verification link:", verifyUrl);
    }

    return NextResponse.json({
      success: true,
      message: "Account created. Check your email to verify.",
      verifyUrl: process.env.NODE_ENV !== "production" ? verifyUrl : undefined,
    });
  } catch (error) {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
