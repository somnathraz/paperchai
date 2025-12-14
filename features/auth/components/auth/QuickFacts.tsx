type QuickFactsProps = {
  items: { label: string; value: string }[];
};

export function QuickFacts({ items }: QuickFactsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="relative overflow-hidden rounded-2xl border border-white/40 bg-white/80 p-4 text-sm shadow-[0_18px_60px_-40px_rgba(0,0,0,0.45)] backdrop-blur-xl after:pointer-events-none after:absolute after:inset-0 after:bg-gradient-to-br after:from-white/30 after:to-transparent after:opacity-40"
        >
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{item.label}</p>
          <p className="mt-1 text-[22px] font-semibold tracking-tight text-foreground">{item.value}</p>
        </div>
      ))}
    </div>
  );
}
