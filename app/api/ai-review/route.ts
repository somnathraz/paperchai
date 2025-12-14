/**
 * AI Invoice Review API Endpoint
 * POST /api/ai-review
 *
 * Analyzes invoice data and returns issues, suggestions, and risk score.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { analyzeInvoice, InvoiceReviewData } from "@/lib/ai-review";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Build review data from request
    const invoiceData: InvoiceReviewData = {
      id: body.id,
      number: body.number,
      clientId: body.clientId,
      projectId: body.projectId,
      issueDate: body.date || body.issueDate,
      dueDate: body.dueDate,
      currency: body.currency,
      items: body.items || [],
      adjustments: body.adjustments,
      notes: body.notes,
      terms: body.terms,
      taxSettings: body.taxSettings,
      total: body.total,
      subtotal: body.subtotal,
      workspaceId: session.user.workspaceId,
    };

    // Run AI analysis
    const result = await analyzeInvoice(invoiceData);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("AI Review error:", error);
    return NextResponse.json({ error: "Failed to analyze invoice" }, { status: 500 });
  }
}
