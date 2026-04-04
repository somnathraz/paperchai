import puppeteer from "puppeteer";

/**
 * Generate a PDF for an invoice
 * @param invoiceId The ID of the invoice
 * @param baseUrl The base URL of the application (e.g. http://localhost:3000)
 * @param cookieHeader Optional cookie header for authentication
 * @returns The PDF as a Buffer
 */
export async function generateInvoicePdf(
  invoiceId: string,
  baseUrl: string,
  cookieHeader?: string
): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();

    if (cookieHeader) {
      await page.setExtraHTTPHeaders({
        cookie: cookieHeader,
      });
    }

    // networkidle0 ensures fonts and styles are loaded
    await page.goto(`${baseUrl}/invoices/${invoiceId}/pdf-view`, {
      waitUntil: "networkidle0",
    });

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

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
