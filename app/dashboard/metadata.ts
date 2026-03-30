import { generateMetadata } from "@/lib/seo-config";

export const metadata = generateMetadata({
  title: "Dashboard - Invoice Management",
  description:
    "Your freelance invoice command center. View unpaid invoices, client reliability scores, payment reminders, and cash flow insights.",
  path: "/dashboard",
  noIndex: true,
});
