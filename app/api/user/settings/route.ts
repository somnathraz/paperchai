import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/user/settings - Get user preferences
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            include: { settings: true },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Return settings or defaults
        const settings = user.settings || {
            defaultTaxRate: 18,
            taxInclusive: false,
            defaultCurrency: "INR",
            paymentTerms: "Net 30",
            defaultNotes: null,
            defaultTerms: null,
            defaultTemplate: null,
        };

        return NextResponse.json({ settings });
    } catch (error) {
        console.error("Error fetching user settings:", error);
        return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
    }
}

// POST /api/user/settings - Update user preferences
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
        const {
            defaultTaxRate,
            taxInclusive,
            defaultCurrency,
            paymentTerms,
            defaultNotes,
            defaultTerms,
            defaultTemplate,
        } = body;

        // Upsert settings
        const settings = await prisma.userSettings.upsert({
            where: { userId: user.id },
            update: {
                defaultTaxRate: defaultTaxRate !== undefined ? defaultTaxRate : undefined,
                taxInclusive: taxInclusive !== undefined ? taxInclusive : undefined,
                defaultCurrency: defaultCurrency !== undefined ? defaultCurrency : undefined,
                paymentTerms: paymentTerms !== undefined ? paymentTerms : undefined,
                defaultNotes: defaultNotes !== undefined ? defaultNotes : undefined,
                defaultTerms: defaultTerms !== undefined ? defaultTerms : undefined,
                defaultTemplate: defaultTemplate !== undefined ? defaultTemplate : undefined,
            },
            create: {
                userId: user.id,
                defaultTaxRate: defaultTaxRate ?? 18,
                taxInclusive: taxInclusive ?? false,
                defaultCurrency: defaultCurrency ?? "INR",
                paymentTerms: paymentTerms ?? "Net 30",
                defaultNotes,
                defaultTerms,
                defaultTemplate,
            },
        });

        return NextResponse.json({ settings });
    } catch (error) {
        console.error("Error updating user settings:", error);
        return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
    }
}
