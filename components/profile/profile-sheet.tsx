"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { ProfileHeader } from "./profile-header";
import { ProfileStats } from "./profile-stats";
import { ProfileConnections } from "./profile-connections";
import { ProfileSettings } from "./profile-settings";
import { ProfileSecurity } from "./profile-security";
import { ProfileBilling } from "./profile-billing";
import { ProfileDangerZone } from "./profile-danger-zone";
import { WorkspaceSwitcher } from "./workspace-switcher";

type ProfileSheetProps = {
  displayName: string;
  initials: string;
  email?: string | null;
  role?: string;
};

type ProfileData = {
  name?: string | null;
  email?: string | null;
  role?: string | null;
  timezone?: string | null;
  currency?: string | null;
  reminderTone?: string | null;
  backupEmail?: string | null;
  workspace?: { id: string; name: string } | null;
};

export function ProfileSheet({ displayName, initials, email, role }: ProfileSheetProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open && !profile && !loading) {
      setLoading(true);
      fetch("/api/profile")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) setProfile(data);
        })
        .finally(() => setLoading(false));
    }
  }, [open, profile, loading]);

  const mergedDisplayName = profile?.name || displayName;
  const mergedEmail = profile?.email || email || null;
  const mergedRole = profile?.role || role || "Workspace";

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-full border border-border/70 bg-white/80 px-3 py-1.5 text-left shadow-inner shadow-black/5 transition hover:-translate-y-0.5"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary/40 via-primary/80 to-emerald-500/70 text-white">
          {initials}
        </div>
        <div className="hidden text-xs font-semibold text-foreground sm:block">
          {displayName}
          <p className="text-[10px] text-muted-foreground">{role ?? "Workspace"}</p>
        </div>
      </button>

      {mounted && open
        ? createPortal(
            <div className="fixed inset-0 z-50 flex">
              <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={() => setOpen(false)} />
              <aside className="ml-auto flex h-full w-full max-w-xl flex-col gap-6 overflow-y-auto border-l border-white/20 bg-gradient-to-b from-white/95 via-[#f7f9fd] to-white/90 p-6 shadow-[0_30px_120px_rgba(15,23,42,0.25)] backdrop-blur-2xl">
                <header className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Profile</p>
                    <h2 className="text-2xl font-semibold text-foreground">{mergedDisplayName}</h2>
                  </div>
                  <button
                    onClick={() => setOpen(false)}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-border/70 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </header>
                <div className="space-y-8 pb-16">
                  <ProfileHeader
                    displayName={mergedDisplayName}
                    email={mergedEmail}
                    role={mergedRole}
                    reliability={98}
                    timezone={profile?.timezone}
                    currency={profile?.currency}
                  />
                  <div id="workspaces">
                    <WorkspaceSwitcher />
                  </div>
                  <ProfileStats />
                  <ProfileConnections />
                  <ProfileSettings
                    data={{
                      name: mergedDisplayName,
                      email: mergedEmail,
                      timezone: profile?.timezone,
                      currency: profile?.currency,
                      reminderTone: profile?.reminderTone,
                      backupEmail: profile?.backupEmail,
                    }}
                  />
                  <ProfileSecurity />
                  <ProfileBilling />
                  <ProfileDangerZone />
                  <button
                    type="button"
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="flex w-full items-center justify-center gap-2 rounded-full border border-border/70 px-4 py-3 text-sm font-semibold text-muted-foreground transition hover:-translate-y-0.5 hover:border-destructive hover:text-destructive"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                  {loading && <p className="text-center text-sm text-muted-foreground">Refreshing profile...</p>}
                </div>
              </aside>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
