type ProfileHeaderProps = {
  displayName: string;
  email?: string | null;
  role?: string;
  reliability?: number;
  timezone?: string | null;
  currency?: string | null;
};

import Link from "next/link";

export function ProfileHeader({
  displayName,
  email,
  role = "Workspace",
  reliability = 98,
  timezone,
  currency,
}: ProfileHeaderProps) {
  const initials = displayName
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/30 via-primary/60 to-emerald-400/60 text-xl font-semibold text-white shadow-inner shadow-primary/30">
          {initials}
        </div>
        <div>
          <p className="text-lg font-semibold text-foreground">{displayName}</p>
          {email && <p className="text-sm text-muted-foreground">{email}</p>}
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{role}</p>
          {(timezone || currency) && (
            <p className="text-xs text-muted-foreground">
              {timezone && <span>{timezone}</span>}
              {timezone && currency && <span> · </span>}
              {currency && <span>{currency}</span>}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{reliability}% reliable</span>
        <Link href="/settings/profile" className="rounded-full border border-border/70 px-3 py-1 text-xs font-semibold text-foreground">
          Edit profile
        </Link>
        <a href="#workspaces" className="rounded-full border border-border/70 px-3 py-1 text-xs font-semibold text-foreground">
          Switch workspace
        </a>
      </div>
    </div>
  );
}
