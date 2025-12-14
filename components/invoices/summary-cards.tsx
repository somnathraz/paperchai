type SummaryCard = {
  label: string;
  value: string;
  sub: string;
};

export function SummaryCards({ cards }: { cards: SummaryCard[] }) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-2xl border border-white/30 bg-white/80 p-4 shadow-[0_18px_60px_-40px_rgba(15,23,42,0.5)]"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{card.label}</p>
              <p className="text-2xl font-semibold text-foreground">{card.value}</p>
              <p className="text-xs text-muted-foreground">{card.sub}</p>
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}
