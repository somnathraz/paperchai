import Link from "next/link";
import { Mail, MessageCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ensureActiveWorkspace } from "@/lib/workspace";

function statusClass(status: string) {
  if (status === "Paid") return "bg-emerald-50 text-emerald-700";
  if (status === "Overdue") return "bg-red-50 text-red-700";
  if (status === "Sent") return "bg-blue-50 text-blue-700";
  return "bg-slate-100 text-slate-700";
}

export async function InvoiceTable() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);
  if (!workspace) return null;

  const invoices = await prisma.invoice.findMany({
    where: { workspaceId: workspace.id },
    include: { client: { select: { name: true } } },
    orderBy: { updatedAt: "desc" },
    take: 8,
  });

  const rows = invoices.map((inv) => {
    const due = inv.dueDate ? new Date(inv.dueDate) : null;
    let dueLabel = "—";
    if (due) {
      const diff = Math.floor((due.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (diff === 0) dueLabel = "Today";
      else if (diff > 0) dueLabel = `Due in ${diff}d`;
      else dueLabel = `${Math.abs(diff)}d ago`;
    }
    const channels: string[] = [];
    if (inv.deliveryChannel === "email") channels.push("Email");
    else if (inv.deliveryChannel === "whatsapp") channels.push("WhatsApp");
    else if (inv.deliveryChannel === "both") channels.push("Email", "WhatsApp");

    // Map internal status to display
    const statusMap: Record<string, string> = {
      draft: "Draft",
      scheduled: "Scheduled",
      sent: "Sent",
      paid: "Paid",
      overdue: "Overdue",
    };

    return {
      id: inv.id,
      number: inv.number,
      client: inv.client?.name || "—",
      amount: inv.total ? new Intl.NumberFormat("en-IN", { style: "currency", currency: inv.currency || "INR", maximumFractionDigits: 0 }).format(typeof inv.total === 'object' ? Number(inv.total) : inv.total) : "—",
      status: statusMap[inv.status] || inv.status,
      due: dueLabel,
      channel: channels.length ? channels : ["Email"],
    };
  });

  return (
    <section className="w-full max-w-full overflow-hidden rounded-3xl border border-white/20 bg-white/90 p-6 shadow-[0_32px_140px_-80px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Invoices</p>
          <h2 className="text-xl font-semibold">Recent invoices</h2>
        </div>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">Drafts & Scheduled included</span>
      </div>
      <div className="mt-4 w-full overflow-x-auto no-scrollbar rounded-2xl border border-border/60">
        <table className="min-w-max w-full text-sm">
          <thead className="bg-muted/60 text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Invoice</th>
              <th className="px-4 py-3 text-left font-semibold">Client</th>
              <th className="px-4 py-3 text-left font-semibold">Amount</th>
              <th className="px-4 py-3 text-left font-semibold">Status</th>
              <th className="px-4 py-3 text-left font-semibold">Due</th>
              <th className="px-4 py-3 text-left font-semibold">Reminder</th>
              <th className="px-4 py-3 text-left font-semibold">Open</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                  No invoices yet. Drafts and scheduled invoices will appear here.
                </td>
              </tr>
            )}
            {rows.map((inv, idx) => (
              <tr
                key={inv.id + idx}
                className={`${idx % 2 === 0 ? "bg-white/70" : "bg-white/50"} transition hover:bg-primary/5`}
              >
                <td className="px-4 py-3 font-semibold text-foreground">
                  <Link href={`/invoices/new?id=${inv.id}`} className="hover:underline">
                    {inv.number}
                  </Link>
                </td>
                <td className="px-4 py-3 text-foreground">{inv.client}</td>
                <td className="px-4 py-3 font-semibold text-foreground">{inv.amount}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusClass(inv.status)}`}>{inv.status}</span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{inv.due}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  <div className="flex items-center gap-2">
                    {inv.channel.map((chan) => (
                      <span key={chan} className="rounded-full bg-muted px-2 py-1 text-[10px] font-semibold text-muted-foreground">
                        {chan === "Email" ? <Mail className="mr-1 inline h-3 w-3" /> : <MessageCircle className="mr-1 inline h-3 w-3" />}
                        {chan}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-primary">
                  <Link href={`/invoices/new?id=${inv.id}`} className="text-xs font-semibold hover:underline">
                    Open
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
