import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureActiveWorkspace } from "@/lib/workspace";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);
  if (!workspace) {
    return new Response("Workspace not found", { status: 404 });
  }

  const invoices = await prisma.invoice.findMany({
    where: {
      workspaceId: workspace.id,
      status: { in: ["sent", "scheduled", "overdue"] },
    },
    select: {
      number: true,
      status: true,
      total: true,
      amountPaid: true,
      dueDate: true,
      remindersEnabled: true,
      client: { select: { name: true, email: true } },
    },
    orderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }],
  });

  const rows = invoices.map((invoice) => {
    const total = Number(invoice.total || 0);
    const amountPaid = Number(invoice.amountPaid || 0);
    const balanceDue = Math.max(0, total - amountPaid);
    const derivedStatus = amountPaid > 0 && balanceDue > 0 ? "partial_paid" : invoice.status;
    return [
      invoice.number,
      invoice.client?.name || "",
      invoice.client?.email || "",
      derivedStatus,
      total,
      amountPaid,
      balanceDue,
      invoice.dueDate ? invoice.dueDate.toISOString().slice(0, 10) : "",
      invoice.remindersEnabled ? "yes" : "no",
    ];
  });

  const csv = [
    [
      "invoice_number",
      "client_name",
      "client_email",
      "status",
      "total",
      "amount_paid",
      "balance_due",
      "due_date",
      "reminders_enabled",
    ].join(","),
    ...rows.map((row) => row.map(escapeCsv).join(",")),
  ].join("\n");

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="paperchai-receivables-${new Date()
        .toISOString()
        .slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

function escapeCsv(value: string | number) {
  const str = String(value ?? "");
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
