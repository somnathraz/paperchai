import { generateMetadata } from "@/lib/seo-config";

export const metadata = generateMetadata({
  title: "Create New Invoice",
  description:
    "Generate professional invoices for your freelance work. Add line items, tax, payment terms, and client details.",
  path: "/invoices/new",
  noIndex: true,
});
