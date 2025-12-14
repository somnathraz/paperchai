"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Menu, X, User, Bell, CreditCard } from "lucide-react";
import { ReactNode } from "react";
import { SettingsSidebar, SettingsNav } from "./settings-sidebar";

type SettingsLayoutProps = {
  current: string;
  title: string;
  description: string;
  children: ReactNode;
};

export function SettingsLayout({ current, title, description, children }: SettingsLayoutProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const router = useRouter();

  // Get current section name from path
  const sectionName = (current.split("/").pop() ?? "").charAt(0).toUpperCase() + (current.split("/").pop() ?? "").slice(1);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-[#f7fafc] to-[#ecf2f7] px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
      <div className="mx-auto w-full max-w-5xl">
        {/* Mobile: stacked, Desktop: 2-column grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,0.9fr)_minmax(0,2fr)]">
          {/* Settings Nav - hidden on mobile */}
          <div className="w-full">
            <SettingsSidebar current={current} />
          </div>

          {/* Main Content Area */}
          <div className="flex-1 space-y-6 rounded-2xl border border-white/20 bg-white/80 p-4 sm:p-6 lg:p-8 shadow-[0_40px_140px_-60px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
            {/* Mobile-only mini header with Sections button */}
            <div className="mb-3 flex items-center justify-between md:hidden">
              <div>
                <p className="text-xs text-muted-foreground">Settings</p>
                <p className="text-sm font-semibold text-foreground">{sectionName}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsDrawerOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background px-3 py-1.5 text-xs font-medium text-foreground shadow-sm transition hover:bg-muted"
              >
                <Menu className="h-3.5 w-3.5" />
                Sections
              </button>
            </div>

            {/* Header */}
            <div className="flex flex-col gap-3 border-b border-border/40 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                  Settings → {sectionName}
                </p>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">{title}</h1>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  All changes saved
                </span>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 rounded-full border border-border/70 px-3 py-1.5 text-xs sm:text-sm font-semibold text-muted-foreground transition hover:-translate-y-0.5 hover:border-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to dashboard
                </Link>
              </div>
            </div>
            {children}
          </div>
        </div>
      </div>

      {/* Mobile Drawer Overlay */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          {/* Backdrop */}
          <button
            type="button"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsDrawerOpen(false)}
            aria-label="Close menu"
          />

          {/* Drawer Panel */}
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-white border-r border-border/40 shadow-2xl p-4 flex flex-col animate-in slide-in-from-left duration-300">
            <div className="mb-4 flex items-center justify-between border-b border-border/40 pb-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Settings</p>
                <p className="text-base font-semibold text-foreground">PaperChai</p>
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-full border border-border/70 px-2.5 py-1 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground"
                onClick={() => setIsDrawerOpen(false)}
              >
                <X className="h-3 w-3" />
                Close
              </button>
            </div>

            {/* Scrollable Nav */}
            <div className="flex-1 overflow-y-auto -mx-1 px-1">
              <SettingsNav current={current} onItemClick={() => setIsDrawerOpen(false)} />
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Quick Switcher */}
      <div className="fixed inset-x-0 bottom-0 z-30 md:hidden pb-safe">
        <div className="mx-auto mb-3 w-full max-w-md px-4">
          <div className="flex items-center justify-center gap-2 rounded-full border border-border/60 bg-white/95 px-3 py-2 shadow-lg backdrop-blur-sm">
            <button
              type="button"
              onClick={() => router.push('/settings/profile')}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium transition ${current === '/settings/profile'
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
            >
              <User className="h-3 w-3" />
              Profile
            </button>
            <button
              type="button"
              onClick={() => router.push('/settings/reminders')}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium transition ${current === '/settings/reminders'
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
            >
              <Bell className="h-3 w-3" />
              Reminders
            </button>
            <button
              type="button"
              onClick={() => router.push('/settings/billing')}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium transition ${current === '/settings/billing'
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
            >
              <CreditCard className="h-3 w-3" />
              Billing
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

