"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Mail, Shield, Users, Clock3, RefreshCw, AlertTriangle, UserPlus, MoreHorizontal } from "lucide-react";

type Member = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  lastActive: string;
  twoFactor: boolean;
  isOwner: boolean;
};

type Invite = {
  id: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
};

type WorkspaceMembersPanelProps = {
  members: Member[];
  invites: Invite[];
  plan: string;
  maxMembersLabel: string;
  isOwner: boolean;
};

const ROLE_OPTIONS = ["owner", "admin", "finance", "client-manager", "reminder-only", "viewer"];

export function WorkspaceMembersPanel({ members, invites, plan, maxMembersLabel, isOwner }: WorkspaceMembersPanelProps) {
  const activeMembers = members.filter((m) => m.status === "active").length;
  const pendingInvites = invites.filter((invite) => invite.status === "pending").length;

  return (
    <div className="space-y-6">
      <SummaryCards activeMembers={activeMembers} pendingInvites={pendingInvites} plan={plan} maxMembersLabel={maxMembersLabel} />
      <MemberCard members={members} invites={invites} isOwner={isOwner} />
      <RoleMatrix />
      <ActivityLog members={members} invites={invites} />
    </div>
  );
}

function SummaryCards({ activeMembers, pendingInvites, plan, maxMembersLabel }: { activeMembers: number; pendingInvites: number; plan: string; maxMembersLabel: string }) {
  const cards = [
    { label: "Members", value: activeMembers.toString(), description: "Active teammates" },
    { label: "Pending invites", value: pendingInvites.toString(), description: "Awaiting acceptance" },
    { label: "Plan", value: plan, description: maxMembersLabel },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {cards.map((card) => (
        <div key={card.label} className="rounded-2xl border border-white/20 bg-white/70 p-4 shadow-[0_18px_60px_-40px_rgba(0,0,0,0.45)]">
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{card.label}</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{card.value}</p>
          <p className="text-xs text-muted-foreground">{card.description}</p>
        </div>
      ))}
    </div>
  );
}

function MemberCard({ members, invites, isOwner }: { members: Member[]; invites: Invite[]; isOwner: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const updateRole = (memberId: string, role: string) => {
    startTransition(async () => {
      await fetch("/api/workspace/members/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, role }),
      });
      router.refresh();
    });
  };

  const removeMember = (memberId?: string, inviteId?: string) => {
    startTransition(async () => {
      await fetch("/api/workspace/members/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, inviteId }),
      });
      router.refresh();
    });
  };

  return (
    <div className="space-y-4 rounded-3xl border border-white/20 bg-white/80 p-6 shadow-[0_32px_140px_-80px_rgba(0,0,0,0.5)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Members</p>
          <p className="text-sm text-muted-foreground">Invite teammates, change roles, and manage access.</p>
        </div>
        {isOwner && <InviteMemberButton />}
      </div>

      {members.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border/60">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Member</th>
                <th className="px-4 py-3 text-left">Role</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Last active</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id} className="border-t border-border/40 bg-white/90">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary/25 via-primary/60 to-emerald-400/60 text-sm font-semibold text-white">
                        {member.name
                          .split(" ")
                          .map((part) => part[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{member.name}</p>
                        <p className="text-xs text-muted-foreground">{member.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {isOwner && !member.isOwner ? (
                      <select
                        className="rounded-full border border-border/70 px-3 py-1 text-xs font-semibold"
                        defaultValue={member.role}
                        onChange={(e) => updateRole(member.id, e.target.value)}
                        disabled={isPending}
                      >
                        {ROLE_OPTIONS.map((role) => (
                          <option key={role} value={role}>
                            {toTitleCase(role)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                        {toTitleCase(member.role)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {member.status === "active" ? "Active" : member.status}
                    {member.twoFactor && <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] text-emerald-700">2FA</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{member.lastActive}</td>
                  <td className="px-4 py-3 text-right">
                    {isOwner && !member.isOwner && (
                      <button
                        className="text-xs font-semibold text-red-600 hover:underline"
                        onClick={() => removeMember(member.id)}
                        disabled={isPending}
                      >
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {invites.length > 0 && (
        <div className="rounded-2xl border border-border/60 bg-white/80 p-4">
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Pending invites</p>
          <div className="mt-3 space-y-2 text-sm">
            {invites.map((invite) => (
              <div key={invite.id} className="flex items-center justify-between rounded-xl border border-border/50 bg-white px-3 py-2">
                <div>
                  <p className="font-semibold text-foreground">{invite.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {toTitleCase(invite.role)} • Invited {new Date(invite.createdAt).toLocaleDateString()}
                  </p>
                </div>
                {isOwner && (
                  <button className="text-xs font-semibold text-red-600 hover:underline" onClick={() => removeMember(undefined, invite.id)}>
                    Cancel
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function InviteMemberButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("finance");
  const [isSubmitting, startTransition] = useTransition();

  const submit = () => {
    startTransition(async () => {
      await fetch("/api/workspace/members/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      setEmail("");
      setRole("finance");
      setOpen(false);
      router.refresh();
    });
  };

  if (!open) {
    return (
    <button
      onClick={() => setOpen(true)}
      className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary via-emerald-500 to-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
    >
      <UserPlus className="h-4 w-4" />
      Invite member
    </button>
    );
  }

  return (
    <div className="w-full max-w-sm rounded-2xl border border-border/60 bg-white/90 p-4 shadow-lg">
      <p className="text-sm font-semibold text-foreground">Invite teammate</p>
      <div className="mt-3 space-y-3 text-sm">
        <div>
          <label className="text-xs font-semibold text-muted-foreground">Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-2xl border border-border/70 px-3 py-2 text-sm outline-none" placeholder="teammate@studio.com" />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground">Role</label>
          <select value={role} onChange={(e) => setRole(e.target.value)} className="mt-1 w-full rounded-2xl border border-border/70 px-3 py-2 text-sm outline-none">
            {ROLE_OPTIONS.map((r) => (
              <option value={r} key={r}>
                {toTitleCase(r)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex-1 rounded-full bg-gradient-to-r from-primary via-emerald-500 to-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
            disabled={isSubmitting || !email}
            onClick={submit}
          >
            {isSubmitting ? "Sending..." : "Send invite"}
          </button>
          <button type="button" className="rounded-full border border-border/70 px-3 py-2 text-xs font-semibold text-muted-foreground" onClick={() => setOpen(false)}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function RoleMatrix() {
  const rows = [
    { permission: "Invoices", owner: "Full", admin: "Full", finance: "Full", client: "View", reminder: "—", viewer: "View" },
    { permission: "Clients", owner: "Full", admin: "Full", finance: "Edit", client: "Edit", reminder: "—", viewer: "View" },
    { permission: "Reminders", owner: "Full", admin: "Full", finance: "Full", client: "—", reminder: "Send", viewer: "View" },
    { permission: "Automation", owner: "Full", admin: "Full", finance: "—", client: "—", reminder: "—", viewer: "—" },
    { permission: "Billing", owner: "Full", admin: "View", finance: "—", client: "—", reminder: "—", viewer: "—" },
  ];

  return (
    <div className="space-y-3 rounded-3xl border border-white/20 bg-white/80 p-6 shadow-[0_32px_140px_-80px_rgba(0,0,0,0.5)]">
      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Roles & permissions</p>
      <div className="overflow-x-auto rounded-2xl border border-border/60">
        <table className="min-w-full text-xs">
          <thead className="bg-muted/60 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Permission</th>
              <th className="px-4 py-3 text-left">Owner</th>
              <th className="px-4 py-3 text-left">Admin</th>
              <th className="px-4 py-3 text-left">Finance</th>
              <th className="px-4 py-3 text-left">Client manager</th>
              <th className="px-4 py-3 text-left">Reminder only</th>
              <th className="px-4 py-3 text-left">Viewer</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.permission} className="border-t border-border/40 bg-white/90">
                <td className="px-4 py-3 text-sm font-semibold text-foreground">{row.permission}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{row.owner}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{row.admin}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{row.finance}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{row.client}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{row.reminder}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{row.viewer}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ActivityLog({ members, invites }: { members: Member[]; invites: Invite[] }) {
  const logs = useMemo(() => {
    const memberLogs = members.map((m) => ({
      id: `member-${m.id}`,
      message: `${m.name} (${toTitleCase(m.role)}) active ${m.lastActive}`,
    }));
    const inviteLogs = invites.map((invite) => ({
      id: `invite-${invite.id}`,
      message: `Invite sent to ${invite.email} · ${toTitleCase(invite.role)}`,
    }));
    return [...inviteLogs, ...memberLogs].slice(0, 6);
  }, [members, invites]);

  return (
    <div className="space-y-3 rounded-3xl border border-white/20 bg-white/80 p-6 shadow-[0_32px_140px_-80px_rgba(0,0,0,0.5)]">
      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Workspace activity</p>
      <div className="space-y-2 text-sm text-muted-foreground">
        {logs.map((log) => (
          <div key={log.id} className="flex items-center gap-2">
            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
            <span>{log.message}</span>
          </div>
        ))}
        {logs.length === 0 && <p>No activity yet.</p>}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border/60 bg-white/70 px-6 py-10 text-center text-sm text-muted-foreground">
      <Users className="h-8 w-8 text-muted-foreground" />
      <p>Invite collaborators to share invoices, reminders, and client reliability insights.</p>
    </div>
  );
}

function toTitleCase(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
