import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { DashboardLayout } from "@/components/dashboard/layout-shell";
import { generateMetadata } from "@/lib/seo-config";

export const metadata = generateMetadata({
  title: "Settings",
  description:
    "Configure your PaperChai workspace, invoice templates, payment settings, and integrations.",
  path: "/settings",
  noIndex: true,
});

export default async function SettingsRootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  return (
    <DashboardLayout userName={session?.user?.name} userEmail={session?.user?.email}>
      {children}
    </DashboardLayout>
  );
}
