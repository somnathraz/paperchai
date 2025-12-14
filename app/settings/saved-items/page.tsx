import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SettingsLayout } from "@/components/settings/settings-layout";
import { SavedItemsManagerWrapper } from "@/components/settings/saved-items-manager-wrapper";

export default async function SavedItemsSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect("/login?callbackUrl=/settings/saved-items");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      settings: true,
      savedItems: {
        orderBy: { usageCount: "desc" },
      },
    },
  });

  if (!user) {
    redirect("/login");
  }

  return (
    <SettingsLayout
      current="/settings/saved-items"
      title="Saved Items & Defaults"
      description="Manage your saved items library and invoice defaults."
    >
      <SavedItemsManagerWrapper
        initialItems={user.savedItems.map((item) => ({
          id: item.id,
          title: item.title,
          description: item.description,
          rate: item.rate,
          unit: item.unit,
          taxRate: item.taxRate,
          hsnCode: item.hsnCode,
          category: item.category,
          usageCount: item.usageCount,
          lastUsedAt: item.lastUsedAt?.toISOString() || null,
        }))}
        initialSettings={{
          defaultTaxRate: user.settings?.defaultTaxRate ?? 18,
          taxInclusive: user.settings?.taxInclusive ?? false,
          defaultCurrency: user.settings?.defaultCurrency ?? "INR",
          paymentTerms: user.settings?.paymentTerms ?? "Net 30",
          defaultNotes: user.settings?.defaultNotes ?? null,
          defaultTerms: user.settings?.defaultTerms ?? null,
        }}
      />
    </SettingsLayout>
  );
}
