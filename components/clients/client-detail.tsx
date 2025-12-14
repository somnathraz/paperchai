"use client";

import { useMemo } from "react";
import { CalendarClock, FileText, Mail, Phone, Upload, MapPin, Globe, Tag, Sparkles, Receipt, ShieldCheck, CheckCircle2, AlertCircle, Play, Pause, ExternalLink, Plus } from "lucide-react";
import Link from 'next/link';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type ClientDetailProps = {
  client: any;
  userName?: string | null;
  userEmail?: string | null;
  onNewProject?: () => void;
  onUploadDocument?: () => void;
  onViewAllProjects?: () => void;
  compact?: boolean;
};

const timelineMock = [
  { label: "Soft reminder sent", time: "2h ago", icon: Mail, color: "text-primary" },
  { label: "WhatsApp delivered", time: "3h ago", icon: Receipt, color: "text-emerald-600" },
  { label: "Invoice FMCC-108 viewed", time: "1d ago", icon: FileText, color: "text-slate-600" },
  { label: "Reliability score updated +4", time: "1d ago", icon: ShieldCheck, color: "text-amber-600" },
];

export function ClientDetail({ client, userName, userEmail, onNewProject, onUploadDocument, onViewAllProjects, compact = false }: ClientDetailProps) {
  const metrics = useMemo(() => {
    return [
      { label: "Reliability", value: client?.reliabilityScore ?? 0, sub: `Avg delay: ${client?.averageDelayDays ?? 0} days` },
      { label: "Unpaid", value: `₹${Number(client?.outstanding || 0).toLocaleString()}`, sub: "Dues" },
      { label: "Paid this year", value: "₹4.2L", sub: "Total" },
      { label: "Last payment", value: "14 days ago", sub: "Timestamp" },
    ];
  }, [client]);

  if (!client) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-slate-500">
        Select a client to view details.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header - Hidden in compact mode */}
      {!compact && (
        <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xl font-semibold text-slate-900">{client.name}</p>
              <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${(client.reliabilityScore ?? 0) >= 80
                ? "bg-emerald-100 text-emerald-700"
                : (client.reliabilityScore ?? 0) >= 60
                  ? "bg-amber-100 text-amber-700"
                  : "bg-rose-100 text-rose-700"
                }`}>{client.reliabilityScore ?? 0}</span>
            </div>
            <p className="text-sm text-slate-500">Last updated {(client.updatedAt && new Date(client.updatedAt).toLocaleDateString()) || "—"}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
            <button className="rounded-full border border-slate-200 bg-white px-4 py-2 text-slate-700 transition hover:border-primary/40 hover:text-primary">Edit client</button>
            <button className="rounded-full bg-gradient-to-r from-primary via-emerald-500 to-primary px-5 py-2 text-white shadow-primary/30 hover:shadow-primary/50">Add invoice</button>
            <button className="rounded-full border border-slate-200 bg-white px-3 py-2 text-slate-700">⋯</button>
          </div>
        </div>
      )}

      {/* Metrics - Hidden in compact mode */}
      {!compact && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((m) => (
            <div key={m.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{m.label}</p>
              <p className="mt-2 text-xl font-semibold text-slate-900">{m.value}</p>
              <p className="text-xs text-slate-500">{m.sub}</p>
            </div>
          ))}
        </div>
      )}

      <div className={cn("grid gap-4", compact ? "grid-cols-1" : "lg:grid-cols-[1.2fr_0.8fr]")}>
        {/* Timeline + Invoices */}

        <div className="space-y-6">

          {/* Active Projects Hub */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Active Projects</h3>
                <Badge variant="secondary" className="rounded-full px-2 text-xs font-normal text-slate-500">
                  {client?.projects?.filter((p: any) => p.status === 'ACTIVE').length || 0}
                </Badge>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="h-8 rounded-full text-xs text-slate-500 hover:text-primary" onClick={onNewProject}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> New
                </Button>
                <Button variant="outline" size="sm" className="h-8 rounded-full text-xs" onClick={onViewAllProjects}>
                  View All
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              {client?.projects?.map((project: any) => {
                const totalMilestones = project.milestones?.length || 0;
                const completedMilestones = project.milestones?.filter((m: any) => m.status === 'COMPLETED' || m.status === 'PAID').length || 0;
                const progress = totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0;
                const nextMilestone = project.milestones?.find((m: any) => m.status !== 'COMPLETED' && m.status !== 'PAID');

                return (
                  <div key={project.id} className="group rounded-xl border border-slate-100 bg-slate-50/50 p-4 transition-all hover:border-slate-200 hover:bg-white hover:shadow-sm">
                    <div className="flex items-start justify-between">
                      <div>
                        <Link href={`/projects/${project.id}`} className="font-semibold text-slate-900 hover:text-blue-600 transition-colors flex items-center gap-2">
                          {project.name}
                          <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-50" />
                        </Link>
                        <p className="mt-1 text-xs text-slate-500 line-clamp-1">{project.description || "No description provided."}</p>
                      </div>
                      <Badge variant={project.status === 'ACTIVE' ? 'default' : 'secondary'} className={cn("text-[10px] uppercase tracking-wider", project.status === 'ACTIVE' && "bg-emerald-100 text-emerald-700 hover:bg-emerald-100")}>
                        {project.status}
                      </Badge>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                        <span>Progress</span>
                        <span>{Math.round(progress)}% ({completedMilestones}/{totalMilestones})</span>
                      </div>
                      <Progress value={progress} className="h-1.5 bg-slate-200" indicatorClassName="bg-blue-600" />
                    </div>

                    {/* Next Milestone */}
                    {nextMilestone && (
                      <div className="mt-4 flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                          <CheckCircle2 className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-slate-700">Next: {nextMilestone.title}</p>
                          <p className="text-[10px] text-slate-500">Due: {nextMilestone.expectedDate ? new Date(nextMilestone.expectedDate).toLocaleDateString() : 'TBD'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-slate-900">₹{(nextMilestone.amount / 100).toLocaleString()}</p>
                        </div>
                      </div>
                    )}

                    {/* Automation Controls */}
                    <div className="mt-4 flex items-center gap-4 border-t border-slate-100 pt-3">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={project.autoInvoiceEnabled}
                          className="scale-75 data-[state=checked]:bg-indigo-600"
                        />
                        <span className="text-xs font-medium text-slate-600">Auto-Invoice</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={project.autoRemindersEnabled}
                          className="scale-75 data-[state=checked]:bg-indigo-600"
                        />
                        <span className="text-xs font-medium text-slate-600">Auto-Reminders</span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {(!client.projects || client.projects.length === 0) && (
                <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <p className="text-sm text-slate-500">No active projects.</p>
                  <Button variant="link" className="text-blue-600">Create your first project</Button>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-slate-900">Recent Activity</p>
            <div className="mt-4 space-y-4">
              {timelineMock.map((item, idx) => (
                <div key={idx} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 ${item.color}`}>
                      <item.icon className="h-4 w-4" />
                    </div>
                    {idx < timelineMock.length - 1 && <div className="h-full w-px bg-slate-200" />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                    <p className="text-xs text-slate-500">{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900">Invoices</p>
              <button className="text-xs font-semibold text-primary">View all</button>
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead className="text-left text-xs uppercase tracking-[0.2em] text-slate-500">
                  <tr className="border-b border-slate-200">
                    <th className="py-2">Invoice</th>
                    <th className="py-2">Amount</th>
                    <th className="py-2">Status</th>
                    <th className="py-2">Due</th>
                    <th className="py-2">Last reminder</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {client?.invoices?.map((inv: any) => (
                    <tr key={inv.id} className="hover:bg-slate-50">
                      <td className="py-3">{inv.number || inv.id}</td>
                      <td className="py-3 font-semibold">₹{Number(inv.total || 0).toLocaleString()}</td>
                      <td className="py-3">
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold capitalize">{inv.status}</span>
                      </td>
                      <td className="py-3">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "—"}</td>
                      <td className="py-3 text-slate-500">{new Date(inv.updatedAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                  {client?.invoices?.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-500">
                        No invoices yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right column: info cards */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-slate-900">AI Insights</p>
            <div className="mt-3 space-y-2 text-sm text-slate-700">
              <p>Invoice likely to be paid in next 48 hours.</p>
              <p>Suggested reminder tone: Warm + Polite.</p>
              <p>Pricing suggestion: +12% next project.</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-slate-900">Attachments</p>
            <div className="mt-3 space-y-2 text-sm text-slate-700">
              {client.documents && client.documents.length > 0 ? (
                client.documents.map((doc: any) => (
                  <div key={doc.id} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer group">
                    <FileText className="h-4 w-4 text-slate-400 group-hover:text-blue-500" />
                    <span className="truncate flex-1">{doc.title || doc.fileName}</span>
                    <span className="text-[10px] text-slate-400 opacity-0 group-hover:opacity-100">{new Date(doc.createdAt).toLocaleDateString()}</span>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-400 italic py-2 text-center">No documents uploaded.</div>
              )}

              <button onClick={onUploadDocument} className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-primary hover:text-primary hover:bg-slate-50 transition-all">
                <Upload className="h-4 w-4" />
                Upload New
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm font-semibold text-slate-900">Contact info</p>
              <div className="mt-3 space-y-2 text-sm text-slate-700">
                <div className="flex items-center gap-2 text-slate-600">
                  <Mail className="h-4 w-4" /> {client.email || "No email"}
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Phone className="h-4 w-4" /> {client.phone || "No phone"}
                </div>
                <div className="flex items-start gap-2 text-slate-600">
                  <MapPin className="h-4 w-4" /> {client.addressLine1 || "No address"}
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Globe className="h-4 w-4" /> {client.website || "No website"}
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm font-semibold text-slate-900">Business info</p>
              <div className="mt-3 space-y-2 text-sm text-slate-700">
                <div className="flex items-center gap-2 text-slate-600">
                  <Tag className="h-4 w-4" /> Tags: {client.tags || "Design, Tech"}
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Sparkles className="h-4 w-4" /> Notes: {client.notes || "No notes"}
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <CalendarClock className="h-4 w-4" /> Created: {new Date(client.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
