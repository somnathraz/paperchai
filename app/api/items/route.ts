import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/items - List saved items (with search, sort by usageCount)
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const { searchParams } = new URL(req.url);
        const search = searchParams.get("search") || "";
        const limit = parseInt(searchParams.get("limit") || "20");
        const category = searchParams.get("category");

        const items = await prisma.savedItem.findMany({
            where: {
                userId: user.id,
                ...(search && {
                    OR: [
                        { title: { contains: search, mode: "insensitive" } },
                        { description: { contains: search, mode: "insensitive" } },
                    ],
                }),
                ...(category && { category }),
            },
            orderBy: { usageCount: "desc" },
            take: limit,
        });

        return NextResponse.json({ items });
    } catch (error) {
        console.error("Error fetching saved items:", error);
        return NextResponse.json({ error: "Failed to fetch items" }, { status: 500 });
    }
}

// POST /api/items - Create saved item
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const body = await req.json();
        const { title, description, rate, unit, taxRate, hsnCode, category } = body;

        if (!title) {
            return NextResponse.json({ error: "Title is required" }, { status: 400 });
        }

        const item = await prisma.savedItem.create({
            data: {
                userId: user.id,
                title,
                description,
                rate: rate || 0,
                unit: unit || "nos",
                taxRate,
                hsnCode,
                category,
            },
        });

        return NextResponse.json({ item });
    } catch (error) {
        console.error("Error creating saved item:", error);
        return NextResponse.json({ error: "Failed to create item" }, { status: 500 });
    }
}
