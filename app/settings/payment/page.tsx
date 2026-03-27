import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SettingsLayout } from "@/components/settings/settings-layout";
import { PaymentSettingsPanel } from "@/components/settings/payment-settings-panel";

export default async function PaymentPreferencesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect("/login?callbackUrl=/settings/payment");
  }

  return (
    <SettingsLayout
      current="/settings/payment"
      title="Payment preferences"
      description="Configure workspace defaults for payment instructions, manual collection, and external payment links."
    >
      <PaymentSettingsPanel />
    </SettingsLayout>
  );
}
