import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { QuickFacts } from "./QuickFacts";
import { ReactNode } from "react";

type AuthLayoutProps = {
  badgeText: string;
  title: string;
  subtitle: string;
  quickFacts: { label: string; value: string }[];
  children: ReactNode;
};

export function AuthLayout({ badgeText, title, subtitle, quickFacts, children }: AuthLayoutProps) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-white via-[#f6f9fc] to-[#eef3f7]">
      {/* Background accents */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_20%,rgba(16,185,129,0.14),transparent_45%),radial-gradient(ellipse_at_80%_0%,rgba(99,102,241,0.16),transparent_40%)]" />
        <div className="absolute inset-0 opacity-[0.04] mix-blend-overlay">
          <div
            className="h-full w-full"
            style={{
              backgroundImage:
                "url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZmlsdGVyIGlkPSJuIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iMC45IiBudW1PY3RhdmVzPSI0Ii8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjQwMCIgaGVpZ2h0PSI0MDAiIGZpbHRlcj0idXJsKCNuKSIvPjwvc3ZnPg==)",
            }}
          />
        </div>
        <div className="absolute -right-40 top-20 h-[300px] w-[300px] rounded-full bg-primary/15 blur-[120px]" />
        <div className="absolute -left-40 bottom-20 h-[240px] w-[240px] rounded-full bg-emerald-400/15 blur-[100px]" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col gap-12 px-6 py-24 sm:px-10 lg:flex-row lg:items-center lg:justify-between lg:py-24">
        <div className="max-w-xl space-y-6 self-center">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary/70 hover:text-primary hover:underline">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to home
          </Link>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary shadow-lg shadow-primary/20">
            {badgeText}
          </div>
          <div className="space-y-3">
            <h1 className="text-4xl font-bold leading-tight sm:text-5xl">{title}</h1>
            <p className="text-lg text-muted-foreground">{subtitle}</p>
          </div>
          <QuickFacts items={quickFacts} />
        </div>

        {children}
      </div>
    </main>
  );
}
