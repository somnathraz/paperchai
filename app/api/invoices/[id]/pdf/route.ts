import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import puppeteer from "puppeteer";
import { headers } from "next/headers";

export async function GET(
    req: Request,
    { params }: { params: { id: string } }
) {
    // 1. Check Auth
    const session = await getServerSession(authOptions);
    if (!session) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    // 2. Extract Invoice ID from URL (since this is an API route in app dir, we need to parse it cleanly)
    // The route is /api/invoices/[id]/pdf, so the ID is in params if we put it in the right folder.
    // Actually, I'm writing this to `app/api/invoices/[id]/pdf/route.ts` so `params` is available in arguments.

    // 3. Get Session Cookie to share with Puppeteer
    const headersList = headers();
    const cookieHeader = headersList.get("cookie");

    try {
        // 4. Launch Puppeteer
        const browser = await puppeteer.launch({
            headless: true,
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });

        const page = await browser.newPage();

        // 5. Set Cookies for Auth
        // Puppeteer needs domain, name, value. We can just set the extra HTTP headers?
        // Setting individual cookies is safer.
        // However, parsing the cookie string is annoying.
        // Easier: Set generic headers.
        await page.setExtraHTTPHeaders({
            cookie: cookieHeader || "",
        });

        // 6. Navigate to PDF View Page
        // Determine base URL dynamically or fallback to localhost
        const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
        const host = headersList.get("host") || "localhost:3000";
        const baseUrl = `${protocol}://${host}`;
        const invoiceId = req.url.split("/invoices/")[1]?.split("/")[0]; // Fallback parsing if params fails

        // Note: 'networkidle0' ensures fonts and styles are loaded
        await page.goto(`${baseUrl}/invoices/${invoiceId}/pdf-view`, {
            waitUntil: "networkidle0",
        });

        // 7. Generate PDF
        const pdf = await page.pdf({
            format: "A4",
            printBackground: true,
            margin: {
                top: "0px",
                right: "0px",
                bottom: "0px",
                left: "0px",
            },
        });

        await browser.close();

        // 8. Return PDF
        return new NextResponse(Buffer.from(pdf), {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="invoice-${invoiceId}.pdf"`,
            },
        });

    } catch (error) {
        console.error("PDF Generation Error:", error);
        return new NextResponse("Failed to generate PDF", { status: 500 });
    }
}
