"use server";

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/auth-tokens";

export async function POST(req: Request) {
  try {
    const { token, password } = await req.json();
    const passwordValue = password as string | undefined;

    if (!token || !passwordValue) {
      return NextResponse.json({ error: "Token and new password are required" }, { status: 400 });
    }

    if (passwordValue.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 422 });
    }

    const tokenHash = hashToken(token as string);
    const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
    if (!record || record.expires < new Date()) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
    }

    const hashed = await bcrypt.hash(passwordValue, 10);

    await prisma.user.update({
      where: { email: record.identifier },
      data: { password: hashed, emailVerified: new Date() },
    });

    await prisma.passwordResetToken.delete({ where: { tokenHash } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
