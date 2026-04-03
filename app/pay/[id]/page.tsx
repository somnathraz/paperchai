import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { FileText, CheckCircle, AlertCircle, Clock } from "lucide-react";

type Props = { params: { id: string } };

export default async function PayInvoicePage({ params }: Props) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: params.id },
    include: {
      client: { select: { name: true } },
      workspace: { select: { name: true, registeredEmail: true } },
    },
  });

  if (!invoice) notFound();

  const isPaid = invoice.status === "paid";
  const isCancelled = invoice.status === "cancelled";
  const total = Number(invoice.total).toLocaleString(undefined, {
    style: "currency",
    currency: invoice.currency || "INR",
  });
  const dueDate = invoice.dueDate
    ? new Date(invoice.dueDate).toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900">
            <FileText className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-xs text-slate-500">{invoice.workspace.name}</p>
            <h1 className="text-lg font-bold text-slate-900">Invoice {invoice.number}</h1>
          </div>
        </div>

        {/* Amount */}
        <div className="mb-6 rounded-xl bg-slate-50 p-5 text-center">
          <p className="text-sm text-slate-500">Amount due</p>
          <p className="mt-1 text-4xl font-bold text-slate-900">{total}</p>
          {dueDate && <p className="mt-1 text-sm text-slate-500">Due {dueDate}</p>}
        </div>

        {/* Status / CTA */}
        {isPaid ? (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <CheckCircle className="h-5 w-5 shrink-0 text-emerald-600" />
            <div>
              <p className="text-sm font-semibold text-emerald-800">Invoice paid</p>
              <p className="text-xs text-emerald-700">Thank you — this invoice has been settled.</p>
            </div>
          </div>
        ) : isCancelled ? (
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <AlertCircle className="h-5 w-5 shrink-0 text-slate-500" />
            <p className="text-sm text-slate-600">This invoice has been cancelled.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Online payments coming soon</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Please contact{" "}
                  <a
                    href={`mailto:${invoice.workspace.registeredEmail || ""}`}
                    className="underline"
                  >
                    {invoice.workspace.name}
                  </a>{" "}
                  to arrange payment.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-100 p-4 text-sm text-slate-600">
              <p className="font-medium text-slate-800">Payment details</p>
              <p className="mt-1">
                Invoice: <span className="font-mono">{invoice.number}</span>
              </p>
              <p>Client: {invoice.client?.name || "—"}</p>
              {dueDate && <p>Due: {dueDate}</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
