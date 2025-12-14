import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { DashboardLayout } from "@/components/dashboard/layout-shell";
import { TemplateGallery } from "@/components/invoices/template-gallery";
import { prisma } from "@/lib/prisma";

export default async function InvoicesPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login?callbackUrl=/invoices");
  }

  const firstName = session.user?.name?.split(" ")[0] ?? session.user?.email?.split("@")[0] ?? "there";
  const templates = await prisma.invoiceTemplate.findMany({
    orderBy: { name: "asc" },
    select: { slug: true, name: true, isPro: true, accent: true, tags: true, category: true },
  });

  return (
    <DashboardLayout userName={session.user?.name} userEmail={session.user?.email}>
      <TemplateGallery firstName={firstName} templates={templates} />
    </DashboardLayout>
  );
}
