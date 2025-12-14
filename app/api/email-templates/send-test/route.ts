import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { getThemeHtml } from "@/lib/email-themes";
import { replaceTemplateVariables, TemplateVars } from "@/lib/reminders";

// POST /api/email-templates/send-test - Send a test email with the template
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const {
            subject,
            body: templateBody,
            theme,
            brandColor,
            logoUrl,
            recipientEmail // Optional - defaults to current user's email
        } = body;

        if (!subject || !templateBody) {
            return NextResponse.json({
                error: "Subject and body are required"
            }, { status: 400 });
        }

        // Get user and workspace info for realistic test data
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            include: {
                activeWorkspace: true
            }
        });

        const toEmail = recipientEmail || session.user.email;
        const workspaceName = user?.activeWorkspace?.name || "Your Company";

        // Mock data for preview
        const mockVars: TemplateVars = {
            clientName: "Test Client",
            invoiceId: "INV-2024-TEST",
            amount: "₹12,500",
            dueDate: new Date().toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            }),
            companyName: workspaceName,
            paymentLink: "https://paperchai.com/pay/test"
        };

        // Replace variables in subject and body
        const processedSubject = replaceTemplateVariables(subject, mockVars);
        const processedBody = replaceTemplateVariables(templateBody, mockVars);

        // Generate themed HTML
        const themedHtml = getThemeHtml((theme as any) || 'modern', {
            subject: processedSubject,
            body: processedBody,
            brandColor: brandColor || '#0f172a',
            logoUrl: logoUrl || undefined,
            ...mockVars
        });

        // Send the test email
        await sendEmail({
            to: toEmail,
            subject: `[TEST] ${processedSubject}`,
            html: themedHtml,
            from: user?.activeWorkspace?.registeredEmail || undefined
        });

        return NextResponse.json({
            success: true,
            message: `Test email sent to ${toEmail}`
        });
    } catch (error) {
        console.error("Error sending test email:", error);
        return NextResponse.json({
            error: "Failed to send test email",
            details: error instanceof Error ? error.message : "Unknown error"
        }, { status: 500 });
    }
}
