"use client";

import Image from "next/image";
import {
  Home,
  FileText,
  Users,
  Bell,
  Workflow,
  BarChart3,
  Settings,
  FolderKanban,
  ChevronDown,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { sections } from "@/components/settings/settings-sidebar";

const links = [
  { label: "Dashboard", icon: Home, href: "/dashboard" },
  { label: "Invoices", icon: FileText, href: "/invoices" },
  { label: "Clients", icon: Users, href: "/clients" },
  { label: "Projects", icon: FolderKanban, href: "/projects" },
  { label: "Reminders", icon: Bell, href: "/reminders" },
  { label: "Automation", icon: Workflow, href: "/automation" },
  { label: "Recap", icon: BarChart3, href: "/recap" },
];

export function SidebarContent({
  className,
  onNavigate,
}: {
  className?: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const isSettingsActive = pathname.startsWith("/settings");
  const [settingsOpen, setSettingsOpen] = useState(isSettingsActive);

  return (
    <div
      className={`relative flex min-h-full w-full max-w-full flex-col overflow-x-hidden bg-white/80/70 py-6 backdrop-blur-xl ${className}`}
    >
      <div className="flex items-center gap-3 px-6">
        <Image
          src="/logo.png"
          alt="PaperChai"
          width={500}
          height={500}
          className="h-12 w-12 rounded-xl object-contain"
        />
        <div>
          <p className="text-[11px] uppercase tracking-[0.26em] text-muted-foreground">PaperChai</p>
          <p className="text-sm font-semibold">Workspace</p>
        </div>
      </div>

      <nav className="mt-8 space-y-1 px-4">
        {links.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={onNavigate}
              className={`group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold transition ${
                active
                  ? "bg-primary/10 text-primary shadow-[0_16px_60px_-40px_rgba(16,185,129,0.6)]"
                  : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              }`}
            >
              <item.icon
                className={`h-4 w-4 ${
                  active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                }`}
              />
              {item.label}
            </Link>
          );
        })}

        {/* Settings accordion */}
        <button
          type="button"
          onClick={() => setSettingsOpen((o) => !o)}
          className={cn(
            "group flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold transition",
            isSettingsActive
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
          )}
        >
          <Settings
            className={cn(
              "h-4 w-4 shrink-0",
              isSettingsActive
                ? "text-primary"
                : "text-muted-foreground group-hover:text-foreground"
            )}
          />
          <span className="flex-1 text-left">Settings</span>
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 shrink-0 transition-transform duration-200",
              settingsOpen ? "rotate-180" : ""
            )}
          />
        </button>

        {settingsOpen && (
          <div className="ml-3 mt-1 space-y-3 border-l border-border/40 pl-3">
            {sections.map((section) => (
              <div key={section.title}>
                <p className="mb-1 px-2 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground/70">
                  {section.title}
                </p>
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const active = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onNavigate}
                        className={cn(
                          "flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium transition",
                          active
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                          item.disabled && "pointer-events-none opacity-50"
                        )}
                      >
                        <item.icon className="h-3 w-3 shrink-0" />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </nav>

      <div className="mx-4 mt-8 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-white to-emerald-400/15 p-4 text-sm shadow-[0_26px_120px_-70px_rgba(0,0,0,0.45)]">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Automation</p>
        <p className="mt-2 font-semibold text-foreground">Autopilot is live</p>
        <p className="text-xs text-muted-foreground">Reminders are running on schedule.</p>
      </div>

      {/* Upgrade plan button */}
      <div className="mx-4 mt-4 mb-2">
        <Link
          href="/settings/billing#workspace-plans"
          onClick={onNavigate}
          className="flex items-center gap-2 w-full rounded-2xl bg-gradient-to-r from-primary via-emerald-500 to-primary px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_50px_-20px_rgba(16,185,129,0.55)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_60px_-20px_rgba(16,185,129,0.65)]"
        >
          <Zap className="h-4 w-4 shrink-0" />
          <span className="flex-1">Level up</span>
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
            Plans
          </span>
        </Link>
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="relative hidden w-full h-full border-r border-border/60 lg:block">
      <SidebarContent />
    </aside>
  );
}
