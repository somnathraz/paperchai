import { generateMetadata } from "@/lib/seo-config";

export const metadata = generateMetadata({
  title: "Settings",
  description:
    "Configure your PaperChai workspace, invoice templates, payment settings, and integrations.",
  path: "/settings",
  noIndex: true,
});

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
