import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteParams = { params: { id: string } };

// GET /api/items/:id - Get single saved item
export async function GET(req: NextRequest, { params }: RouteParams) {
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

        const item = await prisma.savedItem.findFirst({
            where: { id: params.id, userId: user.id },
        });

        if (!item) {
            return NextResponse.json({ error: "Item not found" }, { status: 404 });
        }

        return NextResponse.json({ item });
    } catch (error) {
        console.error("Error fetching saved item:", error);
        return NextResponse.json({ error: "Failed to fetch item" }, { status: 500 });
    }
}

// PUT /api/items/:id - Update saved item
export async function PUT(req: NextRequest, { params }: RouteParams) {
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

        const body = await req.json();
        const { title, description, rate, unit, taxRate, hsnCode, category } = body;

        const item = await prisma.savedItem.update({
            where: { id: params.id },
            data: {
                title: title !== undefined ? title : undefined,
                description: description !== undefined ? description : undefined,
                rate: rate !== undefined ? rate : undefined,
                unit: unit !== undefined ? unit : undefined,
                taxRate: taxRate !== undefined ? taxRate : undefined,
                hsnCode: hsnCode !== undefined ? hsnCode : undefined,
                category: category !== undefined ? category : undefined,
            },
        });

        return NextResponse.json({ item });
    } catch (error) {
        console.error("Error updating saved item:", error);
        return NextResponse.json({ error: "Failed to update item" }, { status: 500 });
    }
}

// DELETE /api/items/:id - Delete saved item
export async function DELETE(req: NextRequest, { params }: RouteParams) {
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

        await prisma.savedItem.delete({
            where: { id: params.id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting saved item:", error);
        return NextResponse.json({ error: "Failed to delete item" }, { status: 500 });
    }
}
