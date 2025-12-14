import { generateMetadata } from "@/lib/seo-config";

export const metadata = generateMetadata({
  title: "Verify Email",
  description: "Verify your email address to activate your PaperChai account.",
  path: "/verify-email",
  noIndex: true,
});

export default function VerifyEmailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
