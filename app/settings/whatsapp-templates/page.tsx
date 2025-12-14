import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SettingsLayout } from "@/components/settings/settings-layout";
import { WhatsappTemplateEditor } from "@/components/settings/whatsapp-template-editor";

export default async function WhatsappTemplatesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect("/login?callbackUrl=/settings/whatsapp-templates");
  }

  return (
    <SettingsLayout
      current="/settings/whatsapp-templates"
      title="WhatsApp templates"
      description="Preview and fine-tune the exact WhatsApp copy sent to your clients."
    >
      <WhatsappTemplateEditor />
    </SettingsLayout>
  );
}
