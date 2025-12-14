export function ProfileDangerZone() {
  return (
    <section className="space-y-3">
      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Danger zone</p>
      <div className="space-y-3 rounded-2xl border border-red-200 bg-red-50/80 p-4 text-sm text-red-700">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold">Delete workspace</p>
            <p className="text-xs text-red-500">This action is irreversible.</p>
          </div>
          <button className="rounded-full border border-red-400 px-3 py-1 text-xs font-semibold text-red-700">Delete</button>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold">Export data</p>
            <p className="text-xs text-red-500">Download invoices, payments, logs.</p>
          </div>
          <button className="rounded-full border border-red-400 px-3 py-1 text-xs font-semibold text-red-700">Export</button>
        </div>
      </div>
    </section>
  );
}
