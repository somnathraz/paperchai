import { redirect } from "next/navigation";
import dynamic from "next/dynamic";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SettingsLayout } from "@/components/settings/settings-layout";
import { Loader2 } from "lucide-react";

// Dynamic import for EmailTemplateEditor (~31KB) - lazy loaded when page is accessed
const EmailTemplateEditor = dynamic(
  () => import("@/components/settings/email-template-editor").then((m) => m.EmailTemplateEditor),
  {
    loading: () => (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    ),
    ssr: false,
  }
);

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
      <EmailTemplateEditor />
    </SettingsLayout>
  );
}

