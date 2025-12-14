import { generateMetadata } from "@/lib/seo-config";

export const metadata = generateMetadata({
  title: "My Invoices",
  description:
    "Manage all your freelance invoices. Track payment status, send reminders, and download PDFs.",
  path: "/invoices",
  noIndex: true,
});
