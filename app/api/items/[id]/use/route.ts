import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteParams = { params: { id: string } };

// POST /api/items/:id/use - Increment usage count (when item is added to invoice)
export async function POST(req: NextRequest, { params }: RouteParams) {
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

        const existing = await prisma.savedItem.findFirst({
            where: { id: params.id, userId: user.id },
        });

        if (!existing) {
            return NextResponse.json({ error: "Item not found" }, { status: 404 });
        }

        // Increment usage count and update lastUsedAt
        const item = await prisma.savedItem.update({
            where: { id: params.id },
            data: {
                usageCount: { increment: 1 },
                lastUsedAt: new Date(),
            },
        });

        return NextResponse.json({ item });
    } catch (error) {
        console.error("Error updating item usage:", error);
        return NextResponse.json({ error: "Failed to update usage" }, { status: 500 });
    }
}
