import { generateMetadata } from "@/lib/seo-config";

export const metadata = generateMetadata({
  title: "Payment Reminders",
  description:
    "Automated email and WhatsApp payment reminders for your invoices. Track reminder history and effectiveness.",
  path: "/reminders",
  noIndex: true,
});
