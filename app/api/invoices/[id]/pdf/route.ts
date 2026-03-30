import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { headers } from "next/headers";
import { checkRateLimitByProfile } from "@/lib/security/rate-limit-enhanced";
import { generateInvoicePdf } from "@/lib/invoices/pdf-generation";
import { ensureActiveWorkspace } from "@/lib/workspace";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // 1. Check Auth
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);
  if (!workspace) {
    return new NextResponse("Workspace not found", { status: 404 });
  }

  // 2. Rate limiting
  const rateCheck = await checkRateLimitByProfile(req, "pdfGenerate", session.user.id);
  if (!rateCheck.allowed) {
    return new NextResponse("Too many PDF requests. Please wait a moment.", { status: 429 });
  }

  const { id } = await params;
  const invoice = await prisma.invoice.findFirst({
    where: { id, workspaceId: workspace.id },
    select: { id: true },
  });
  if (!invoice) {
    return new NextResponse("Invoice not found", { status: 404 });
  }
  const headersList = await headers();
  const cookieHeader = headersList.get("cookie");

  try {
    const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
    const host = headersList.get("host") || "localhost:3000";
    const baseUrl = `${protocol}://${host}`;

    const pdfBuffer = await generateInvoicePdf(id, baseUrl, cookieHeader || undefined);

    return new NextResponse(pdfBuffer as any, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="invoice-${id}.pdf"`,
      },
    });
  } catch (error) {
    console.error("PDF Generation Error:", error);
    return new NextResponse("Failed to generate PDF", { status: 500 });
  }
}
