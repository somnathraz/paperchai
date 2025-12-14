"use server";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const templates = await prisma.invoiceTemplate.findMany({
    orderBy: [{ isPro: "asc" }, { name: "asc" }],
    select: {
      slug: true,
      name: true,
      isPro: true,
      accent: true,
      tags: true,
      category: true,
    },
  });

  return NextResponse.json({ templates });
}
