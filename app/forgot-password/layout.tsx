import { generateMetadata } from "@/lib/seo-config";

export const metadata = generateMetadata({
  title: "Forgot Password",
  description:
    "Reset your PaperChai account password. We'll send you a secure link to create a new password.",
  path: "/forgot-password",
  noIndex: true,
});

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
