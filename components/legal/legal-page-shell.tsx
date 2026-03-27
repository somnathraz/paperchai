import Link from "next/link";

export function LegalPageShell({
  eyebrow,
  title,
  updatedAt,
  children,
}: {
  eyebrow: string;
  title: string;
  updatedAt: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-[#f8fbfd] to-[#eef4f8]">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <Link href="/" className="text-sm font-medium text-primary hover:underline">
            Back to PaperChai
          </Link>
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{eyebrow}</p>
        </div>

        <div className="rounded-3xl border border-white/20 bg-white/85 p-8 shadow-[0_32px_140px_-80px_rgba(0,0,0,0.45)] backdrop-blur-2xl sm:p-10">
          <div className="border-b border-border/60 pb-6">
            <h1 className="text-3xl font-semibold text-foreground sm:text-4xl">{title}</h1>
            <p className="mt-3 text-sm text-muted-foreground">Last updated: {updatedAt}</p>
          </div>
          <div className="prose prose-slate mt-8 max-w-none prose-headings:font-semibold prose-headings:text-foreground prose-p:text-muted-foreground prose-li:text-muted-foreground">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
