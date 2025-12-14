type Template = {
  name: string;
  tag: string;
};

type TemplateModalProps = {
  templates: Template[];
  onClose: () => void;
};

export function TemplateModal({ templates, onClose }: TemplateModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm">
      <div className="w-full max-w-4xl rounded-3xl border border-white/10 bg-white/95 p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Templates</p>
            <h3 className="text-xl font-semibold text-foreground">Choose your starting point</h3>
          </div>
          <button className="rounded-full border border-border/60 px-4 py-2 text-sm font-semibold text-muted-foreground" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <div key={template.name} className="rounded-2xl border border-border/40 bg-white/80 p-4 shadow-sm">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{template.name}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${template.tag === "Pro" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                  {template.tag}
                </span>
              </div>
              <div className="mt-3 h-40 rounded-lg border border-dashed border-border/70 bg-white/90" />
              <button className="mt-4 w-full rounded-full border border-border/60 px-3 py-2 text-sm font-semibold text-primary">Use template</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
