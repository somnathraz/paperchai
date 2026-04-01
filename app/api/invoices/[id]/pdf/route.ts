import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import puppeteer from "puppeteer";
import { headers } from "next/headers";

const PDF_TIMEOUT_MS = 30_000;

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const invoiceId = params.id;
  const headersList = headers();
  const cookieHeader = headersList.get("cookie");

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox", // required in containerised/serverless environments
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage", // prevents crashes on low-memory containers
      "--disable-gpu",
    ],
    protocolTimeout: PDF_TIMEOUT_MS,
  });

  try {
    const page = await browser.newPage();

    await page.setExtraHTTPHeaders({ cookie: cookieHeader || "" });

    const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
    const host = headersList.get("host") || "localhost:3000";
    const baseUrl = `${protocol}://${host}`;

    await page.goto(`${baseUrl}/invoices/${invoiceId}/pdf-view`, {
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
        "Content-Disposition": `attachment; filename="invoice-${invoiceId}.pdf"`,
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return new NextResponse("Failed to generate PDF", { status: 500 });
  } finally {
    await browser.close();
  }
}
