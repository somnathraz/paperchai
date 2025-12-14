"use client";

import { useCallback, useEffect, useState } from "react";

type Workspace = {
  id: string;
  name: string;
  slug: string;
  role: string;
  active: boolean;
};

type Toast = {
  type: "success" | "error";
  message: string;
};

export function WorkspaceSwitcher() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  const showToast = (payload: Toast) => {
    setToast(payload);
    setTimeout(() => setToast(null), 3000);
  };

  const loadWorkspaces = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/workspaces");
    if (res.ok) {
      const data = await res.json();
      setWorkspaces(data.workspaces);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadWorkspaces();
  }, [loadWorkspaces]);

  const switchWorkspace = async (workspaceId: string) => {
    const res = await fetch("/api/workspaces/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId }),
    });
    if (res.ok) {
      showToast({ type: "success", message: "Switched workspace. Refreshing..." });
      window.location.reload();
    } else {
      showToast({ type: "error", message: "Could not switch workspace." });
    }
  };

  const createWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast({ type: "error", message: "Enter a workspace name." });
      return;
    }
    setCreating(true);
    const res = await fetch("/api/workspaces", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    if (res.ok) {
      setName("");
      setShowForm(false);
      showToast({ type: "success", message: "Workspace created." });
      await loadWorkspaces();
    } else {
      showToast({ type: "error", message: "Could not create workspace." });
    }
    setCreating(false);
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Workspaces</p>
        <span className="text-xs text-muted-foreground">{workspaces.length} total</span>
      </div>

      <div className="space-y-2">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading workspaces...</p>
        ) : workspaces.length ? (
          workspaces.map((workspace) => (
            <button
              key={workspace.id}
              onClick={() => switchWorkspace(workspace.id)}
              className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
                workspace.active
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-border/60 bg-white/70 text-foreground hover:border-primary/30"
              }`}
            >
              <div>
                <p>{workspace.name}</p>
                <p className="text-xs text-muted-foreground">{workspace.role}</p>
              </div>
              {workspace.active && <span className="text-xs uppercase tracking-[0.2em]">Active</span>}
            </button>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No workspaces yet.</p>
        )}
      </div>

      {showForm ? (
        <form onSubmit={createWorkspace} className="space-y-3 rounded-2xl border border-white/15 bg-white/70 p-4 shadow-inner">
          <p className="text-sm font-semibold text-foreground">Workspace name</p>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Nova Studio"
            className="w-full rounded-2xl border border-border/70 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={creating}
              className="flex-1 rounded-full bg-gradient-to-r from-primary via-emerald-500 to-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow-[0_16px_50px_-20px_rgba(16,185,129,0.6)] disabled:opacity-60"
            >
              {creating ? "Creating..." : "Create workspace"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setName("");
              }}
              className="rounded-full border border-border/70 px-4 py-2 text-sm font-semibold text-muted-foreground"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="w-full rounded-2xl border border-dashed border-border/70 px-4 py-3 text-sm font-semibold text-muted-foreground hover:border-primary/40 hover:text-primary"
        >
          + New workspace
        </button>
      )}

      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 rounded-2xl px-4 py-2 text-sm text-white shadow-lg ${
            toast.type === "success" ? "bg-emerald-500" : "bg-red-500"
          }`}
        >
          {toast.message}
        </div>
      )}
    </section>
  );
}
