"use server";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/auth-tokens";

export async function POST(req: Request) {
  try {
    const { token } = await req.json();
    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    const tokenHash = hashToken(token as string);
    const record = await prisma.verificationToken.findUnique({ where: { tokenHash } });
    if (!record || record.expires < new Date()) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
    }

    await prisma.user.update({
      where: { email: record.identifier },
      data: { emailVerified: new Date() },
    });

    await prisma.verificationToken.delete({ where: { tokenHash } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
