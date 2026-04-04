import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SettingsLayout } from "@/components/settings/settings-layout";
import { EmailTemplateEditorWrapper } from "@/components/settings/email-template-editor-wrapper";

export default async function EmailTemplatesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect("/login?callbackUrl=/settings/email-templates");
  }

  return (
    <SettingsLayout
      current="/settings/email-templates"
      title="Email templates"
      description="Customize Your Email Templates."
    >
      <EmailTemplateEditorWrapper />
    </SettingsLayout>
  );
}
