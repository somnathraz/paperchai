import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import { headers } from "next/headers";
import { checkIpRateLimit } from "@/lib/rate-limiter";
import { ensureActiveWorkspace } from "@/lib/workspace";
import { prisma } from "@/lib/prisma";

const PDF_TIMEOUT_MS = 30_000;

// Local Chrome path per platform — used in development only
function localChromePath() {
  if (process.platform === "win32") {
    return "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  }
  if (process.platform === "darwin") {
    return "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  }
  return "/usr/bin/google-chrome";
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rl = checkIpRateLimit(req);
  if (!rl.allowed) {
    return NextResponse.json({ error: rl.error }, { status: 429 });
  }

  // 1. Check Auth
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);
  if (!workspace) {
    return new NextResponse("Workspace not found", { status: 404 });
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

  const isProduction = process.env.NODE_ENV === "production";

  // @sparticuz/chromium provides a stripped-down Chromium binary that fits
  // within Vercel's 50 MB serverless function limit.
  const executablePath = isProduction ? await chromium.executablePath() : localChromePath();

  const browser = await puppeteer.launch({
    args: isProduction
      ? chromium.args // includes --no-sandbox, --disable-dev-shm-usage, etc.
      : ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
    executablePath,
    headless: true,
    protocolTimeout: PDF_TIMEOUT_MS,
  });

  try {
    const page = await browser.newPage();

    await page.setExtraHTTPHeaders({ cookie: cookieHeader || "" });

    const protocol = isProduction ? "https" : "http";
    const host = headersList.get("host") || "localhost:3000";
    const baseUrl = `${protocol}://${host}`;

    await page.goto(`${baseUrl}/invoices/${id}/pdf-view`, {
      waitUntil: "networkidle0",
      timeout: PDF_TIMEOUT_MS,
    });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0px", right: "0px", bottom: "0px", left: "0px" },
    });

    return new NextResponse(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="invoice-${id}.pdf"`,
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return new NextResponse("Failed to generate PDF", { status: 500 });
  } finally {
    await browser.close();
  }
}
