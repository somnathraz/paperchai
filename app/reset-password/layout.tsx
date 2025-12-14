import { generateMetadata } from "@/lib/seo-config";

export const metadata = generateMetadata({
  title: "Reset Password",
  description: "Create a new password for your PaperChai account.",
  path: "/reset-password",
  noIndex: true,
});

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
