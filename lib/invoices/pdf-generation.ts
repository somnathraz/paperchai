import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";

const PDF_TIMEOUT_MS = 30_000;

function localChromePath() {
  if (process.platform === "win32") {
    return "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  }
  if (process.platform === "darwin") {
    return "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  }
  return "/usr/bin/google-chrome";
}

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
  const isProduction = process.env.NODE_ENV === "production";
  const executablePath = isProduction ? await chromium.executablePath() : localChromePath();

  const browser = await puppeteer.launch({
    args: isProduction
      ? chromium.args
      : ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
    executablePath,
    headless: true,
    protocolTimeout: PDF_TIMEOUT_MS,
  });

  try {
    const page = await browser.newPage();

    if (cookieHeader) {
      await page.setExtraHTTPHeaders({
        cookie: cookieHeader,
      });
    }

    await page.goto(`${baseUrl}/invoices/${invoiceId}/pdf-view`, {
      waitUntil: "networkidle0",
      timeout: PDF_TIMEOUT_MS,
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
