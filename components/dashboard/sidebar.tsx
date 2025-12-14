"use client";

import { Home, FileText, Users, Bell, Workflow, BarChart3, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { label: "Dashboard", icon: Home, href: "/dashboard" },
  { label: "Invoices", icon: FileText, href: "/invoices" },
  { label: "Clients", icon: Users, href: "/clients" },
  { label: "Reminders", icon: Bell, href: "/reminders" },
  { label: "Automation", icon: Workflow, href: "/automation" },
  { label: "Recap", icon: BarChart3, href: "/recap" },
  { label: "Settings", icon: Settings, href: "/settings/profile" },
];

export function SidebarContent({
  className,
  onNavigate,
}: {
  className?: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <div
      className={`relative flex h-full w-full max-w-full flex-col overflow-x-hidden bg-white/80/70 py-6 backdrop-blur-xl ${className}`}
    >
      <div className="flex items-center gap-3 px-6">
        <img src="/favicon.png" alt="PaperChai Icon" className="h-12 w-12 rounded-xl" />
        <div>
          <p className="text-[11px] uppercase tracking-[0.26em] text-muted-foreground">PaperChai</p>
          <p className="text-sm font-semibold">Workspace</p>
        </div>
      </div>

      <nav className="mt-8 space-y-1 px-4">
        {links.map((item) => {
          const active =
            item.href === "/settings/profile"
              ? pathname.startsWith("/settings")
              : pathname === item.href;
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
      </nav>

      <div className="mt-8 mx-4 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-white to-emerald-400/15 p-4 text-sm shadow-[0_26px_120px_-70px_rgba(0,0,0,0.45)]">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Automation</p>
        <p className="mt-2 font-semibold text-foreground">Autopilot is live</p>
        <p className="text-xs text-muted-foreground">Reminders are running on schedule.</p>
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
