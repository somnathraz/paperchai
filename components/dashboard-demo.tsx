"use client";

import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";

export default function DashboardDemo() {
  return (
    <div className="w-full mx-auto rounded-3xl bg-white/95 border border-white/60 shadow-[0_12px_60px_rgba(0,0,0,0.08)] backdrop-blur-xl overflow-hidden">
      {/* ---------------- TOP BAR ---------------- */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-slate-200/30 bg-slate-50/70">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-400 flex items-center justify-center text-sm text-white">
            🍵
          </div>
          <div className="text-[13px] font-semibold text-slate-800">PaperChai</div>
        </div>

        <span className="text-[11px] px-2.5 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
          Live sync
        </span>
      </div>

      {/* ---------------- MAIN CONTENT ---------------- */}
      <div className="p-5 py-6 space-y-6">
        {/* Metrics Row */}
        <div className="grid grid-cols-3 gap-3">
          <MiniMetric label="Outstanding" value="₹1.82L" tone="red" />
          <MiniMetric label="Paid (mo)" value="₹4.82L" tone="green" />
          <MiniMetric label="Reliability" value="98%" tone="blue" />
        </div>

        {/* Chart */}
        <ChartPreview />

        {/* Mini List */}
        <Card className="rounded-2xl border-white/10 bg-white shadow-none">
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-800">
                Recent invoices
              </span>
              <span className="text-[11px] px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                1 overdue
              </span>
            </div>

            <MiniInvoice client="Nova Labs" amount="₹18,200" status="Paid" />
            <MiniInvoice client="Outlier Studio" amount="₹24,500" status="Overdue" />
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ---------------- Subcomponents ---------------- */

function MiniMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "red" | "green" | "blue";
}) {
  const map = {
    red: "text-red-600 bg-red-50",
    green: "text-emerald-600 bg-emerald-50",
    blue: "text-sky-600 bg-sky-50",
  };

  // Special handling for Reliability to reduce font size and weight
  const isReliability = label === "Reliability";
  const valueSize = isReliability ? "text-[18px]" : "text-[20px]";
  const valueWeight = isReliability ? "font-medium" : "font-semibold";

  return (
    <Card className="rounded-2xl border-slate-200/70 bg-slate-50/80 shadow-none">
      <div className="p-3 space-y-1">
        <p className="text-[11px] text-slate-500 uppercase tracking-[0.14em] font-medium">
          {label}
        </p>
        <p className={`${valueSize} ${valueWeight} text-slate-900`}>{value}</p>
        <span
          className={`inline-block px-2 py-0.5 text-[10px] rounded-full font-medium ${map[tone]}`}
        >
          • updated
        </span>
      </div>
    </Card>
  );
}

function ChartPreview() {
  // Data for line graph
  const lineData = [45, 52, 48, 61, 68, 72, 78, 82];
  const maxValue = Math.max(...lineData);
  
  return (
    <Card className="rounded-2xl border-slate-200/70 bg-gradient-to-b from-slate-50 to-white shadow-none">
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.14em]">
            Cash flow
          </span>
          <span className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-2 py-1">
            +18%
          </span>
        </div>

        {/* Reduced height and added small line graph */}
        <div className="space-y-2">
          {/* Bar chart - reduced height */}
          <div className=" w-full flex items-end gap-1.5 px-1 pb-1">
            {[30, 55, 42, 78, 64, 90].map((h, i) => (
              <div key={i} className="flex-1 flex items-end">
                <div
                  className="w-full rounded-full bg-emerald-400/80"
                  style={{ height: `${h}%` }}
                />
              </div>
            ))}
          </div>
          
          {/* Small line graph */}
          <div className="h-12 w-full relative">
            <svg className="w-full h-full" viewBox="0 0 200 40" preserveAspectRatio="none">
              <defs>
                <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgb(16, 185, 129)" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="rgb(16, 185, 129)" stopOpacity="0.9" />
                </linearGradient>
              </defs>
              {/* Area fill */}
              <motion.polygon
                points={`0,40 ${lineData.map((val, i) => `${(i / (lineData.length - 1)) * 200},${40 - (val / maxValue) * 35}`).join(" ")} 200,40`}
                fill="url(#lineGradient)"
                fillOpacity="0.15"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.5, delay: 0.3 }}
              />
              {/* Line */}
              <motion.polyline
                points={lineData.map((val, i) => `${(i / (lineData.length - 1)) * 200},${40 - (val / maxValue) * 35}`).join(" ")}
                fill="none"
                stroke="url(#lineGradient)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.5, delay: 0.3 }}
              />
            </svg>
          </div>
        </div>
      </div>
    </Card>
  );
}

function MiniInvoice({
  client,
  amount,
  status,
}: {
  client: string;
  amount: string;
  status: "Paid" | "Overdue";
}) {
  const map: Record<"Paid" | "Overdue", string> = {
    Paid: "bg-emerald-50 text-emerald-700",
    Overdue: "bg-red-50 text-red-700",
  };

  return (
    <div className="flex items-center justify-between text-sm py-1.5 border-b last:border-0 border-white/10">
      <div className="min-w-0 flex-1">
        <p className="font-medium text-slate-800 truncate">{client}</p>
        {/* Shortened to premium label */}
        <p className="text-[10px] text-slate-500 truncate">Auto-reminders</p>
      </div>
      <div className="text-right flex-shrink-0 ml-3">
        <p className="font-semibold text-slate-900">{amount}</p>
        <span
          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${map[status]}`}
        >
          {status}
        </span>
      </div>
    </div>
  );
}
