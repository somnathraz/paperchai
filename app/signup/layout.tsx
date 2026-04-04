import { generateMetadata } from "@/lib/seo-config";

export const metadata = generateMetadata({
  title: "Sign Up Free - Invoice Generator for Freelancers",
  description:
    "Create your free PaperChai account. Start generating professional invoices, tracking payments, and sending automated WhatsApp & email reminders to clients today.",
  path: "/signup",
});

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
