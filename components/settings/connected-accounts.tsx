"use client";

import { motion } from "framer-motion";
import { Plug, CheckCircle2, XCircle, Mail, MessageCircle, Slack, FileCode, Settings } from "lucide-react";
import Link from "next/link";

type Integration = {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  status: "active" | "verified" | "not_connected";
  description: string;
};

const integrations: Integration[] = [
  {
    name: "Email sending",
    icon: Mail,
    status: "verified",
    description: "Verified and ready to send reminders",
  },
  {
    name: "WhatsApp reminders",
    icon: MessageCircle,
    status: "active",
    description: "Connected and active",
  },
  {
    name: "Slack",
    icon: Slack,
    status: "not_connected",
    description: "Connect to receive notifications",
  },
  {
    name: "Notion",
    icon: FileCode,
    status: "not_connected",
    description: "Sync invoices and clients",
  },
];

export function ConnectedAccounts() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.25 }}
      className="rounded-2xl border border-white/20 bg-white/70 p-6 shadow-[0_18px_60px_-40px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-8"
    >
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Plug className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold">Connected Accounts</h2>
        </div>
        <Link
          href="/settings/integrations"
          className="flex items-center gap-2 rounded-lg border border-border/70 bg-white px-4 py-2 text-sm font-semibold text-foreground transition hover:border-primary hover:bg-primary/5"
        >
          <Settings className="h-4 w-4" />
          Manage
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {integrations.map((integration, index) => {
          const Icon = integration.icon;
          const isConnected = integration.status !== "not_connected";

          return (
            <motion.div
              key={integration.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.3 + index * 0.05 }}
              className={`flex items-center gap-4 rounded-xl border p-4 transition ${
                isConnected
                  ? "border-emerald-200/50 bg-emerald-50/30"
                  : "border-border/50 bg-slate-50/50"
              }`}
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                  isConnected ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"
                }`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">{integration.name}</p>
                  {isConnected ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-slate-400" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{integration.description}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

