import { generateMetadata } from "@/lib/seo-config";

export const metadata = generateMetadata({
  title: "Login",
  description:
    "Access your PaperChai invoice dashboard. Manage invoices, track client payments, send automated reminders, and monitor payment reliability scores.",
  path: "/login",
  noIndex: true,
});

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
