export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const ok = await prisma.user.count();
    return NextResponse.json({ ok, status: "connected" });
  } catch (error) {
    console.error("DB Connection Failed:", error);
    return NextResponse.json(
      {
        error: "DB Connection Failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
