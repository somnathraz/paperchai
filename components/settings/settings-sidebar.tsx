"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { User, CreditCard, Bell, Plug, Shield, Users, AlertTriangle, Mail, MessageCircle, Bot, Wallet, Package } from "lucide-react";

const sections: {
  title: string;
  items: { label: string; href: string; icon: typeof User; disabled?: boolean }[];
}[] = [
    {
      title: "Account",
      items: [
        { label: "Profile", href: "/settings/profile", icon: User },
        { label: "Saved Items & Defaults", href: "/settings/saved-items", icon: Package },
        { label: "Workspace", href: "/settings/workspace", icon: Users },
        { label: "Workspace members", href: "/settings/members", icon: Users },
        { label: "Billing & subscription", href: "/settings/billing", icon: CreditCard },
        { label: "Payment preferences", href: "/settings/payment", icon: Wallet },
      ],
    },
    {
      title: "Workflow",
      items: [
        { label: "Reminder settings", href: "/settings/reminders", icon: Bell },
        { label: "Notifications", href: "/settings/notifications", icon: Bell },
        { label: "Invoice settings", href: "/settings/invoices", icon: Plug },
        { label: "Email templates", href: "/settings/email-templates", icon: Mail },
        { label: "WhatsApp templates", href: "/settings/whatsapp-templates", icon: MessageCircle },
        { label: "AI autopilot", href: "/settings/ai-autopilot", icon: Bot },
        { label: "Integrations", href: "/settings/integrations", icon: Plug },
      ],
    },
    {
      title: "Security",
      items: [
        { label: "Security", href: "/settings/security", icon: Shield },
        { label: "Data & export", href: "/settings/export", icon: CreditCard },
        { label: "Danger zone", href: "/settings/danger", icon: AlertTriangle },
      ],
    },
  ];

// Exported for use in drawer
export { sections };

type SettingsNavProps = {
  current: string;
  onItemClick?: () => void;
};

// Reusable navigation component for both sidebar and mobile drawer
export function SettingsNav({ current, onItemClick }: SettingsNavProps) {
  const router = useRouter();

  const handleNavClick = (href: string, disabled?: boolean) => {
    if (disabled) return;
    if (onItemClick) {
      router.push(href);
      onItemClick();
    }
  };

  return (
    <div className="space-y-3">
      {sections.map((section) => (
        <div key={section.title} className="space-y-1">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-medium">{section.title}</p>
          <nav className="flex flex-col gap-0.5">
            {section.items.map((item) => {
              const active = item.href === current;
              const content = (
                <div
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs sm:text-sm font-medium transition-colors",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                    item.disabled && !active ? "cursor-not-allowed opacity-60 hover:bg-transparent" : ""
                  )}
                >
                  <item.icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </div>
              );

              // If onItemClick is provided, use button-based navigation (for drawer)
              if (onItemClick) {
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => handleNavClick(item.href, item.disabled)}
                    className={cn("block w-full text-left", item.disabled && "cursor-not-allowed")}
                    disabled={item.disabled}
                  >
                    {content}
                  </button>
                );
              }

              // Otherwise use Link (for sidebar)
              if (item.disabled) {
                return (
                  <div key={item.label} className="block">
                    {content}
                  </div>
                );
              }
              return (
                <Link key={item.label} href={item.href} className="block">
                  {content}
                </Link>
              );
            })}
          </nav>
        </div>
      ))}
    </div>
  );
}

type SettingsSidebarProps = {
  current: string;
};

export function SettingsSidebar({ current }: SettingsSidebarProps) {
  return (
    <aside className="hidden md:block rounded-2xl border border-white/20 bg-white/80 p-3 sm:p-4 shadow-[0_26px_120px_-70px_rgba(0,0,0,0.45)] backdrop-blur-2xl md:sticky md:top-6">
      {/* Header */}
      <div className="mb-3 pb-2 border-b border-border/40">
        <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Settings</p>
        <h2 className="text-base sm:text-lg font-semibold text-foreground">PaperChai</h2>
      </div>

      {/* Navigation */}
      <div className="max-h-[60vh] md:max-h-none overflow-y-auto no-scrollbar">
        <SettingsNav current={current} />
      </div>
    </aside>
  );
}

