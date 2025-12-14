"use client";

import Link from "next/link";
import { Palette, Zap, Sparkles, ShieldCheck, Play, Sparkle, Flame, Star, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { TemplatePreviewModal } from "./template-preview-modal";
import { renderTemplate } from "./templates/registry";

type TemplateGalleryProps = {
  firstName: string;
  templates: {
    slug: string;
    name: string;
    isPro: boolean;
    tags?: string | null;
    accent?: string | null;
    category?: string | null;
  }[];
};

const METRICS = [
  { label: "Templates", value: "15+", icon: Palette },
  { label: "AI suggestions", value: "Live", icon: Sparkles },
  { label: "Reminder-ready", value: "100%", icon: Zap },
  { label: "Reliability powered", value: "Yes", icon: ShieldCheck },
];

export function TemplateGallery({ firstName, templates }: TemplateGalleryProps) {
  const [filter, setFilter] = useState<string>("All");
  const [previewTemplate, setPreviewTemplate] = useState<TemplateGalleryProps["templates"][number] | null>(null);
  const [sort, setSort] = useState<"default" | "pro" | "az">("default");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    let results = templates;

    // Apply filter
    if (filter === "All") {
      results = templates;
    } else if (filter === "Free") {
      results = templates.filter((t) => !t.isPro);
    } else if (filter === "Pro") {
      results = templates.filter((t) => t.isPro);
    } else {
      // Filter by tag (Light, Dark, Gradient, Bold, etc.)
      const key = filter.toLowerCase();
      results = templates.filter((t) => (t.tags || "").toLowerCase().includes(key));
    }

    // Apply search query if present
    if (query.trim()) {
      const q = query.toLowerCase();
      results = results.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          (t.tags || "").toLowerCase().includes(q) ||
          (t.category || "").toLowerCase().includes(q)
      );
    }

    return results;
  }, [filter, templates, query]);

  const sorted = useMemo(() => {
    if (sort === "pro") return [...filtered].sort((a, b) => Number(b.isPro) - Number(a.isPro));
    if (sort === "az") return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
    return filtered;
  }, [filtered, sort]);

  const renderMock = (template: TemplateGalleryProps["templates"][number]) => {
    const mockData = {
      businessName: "Your Business",
      invoiceNumber: "INV-2024-001",
      clientName: "Client Name",
      total: "₹24,600",
      subtotal: "₹22,600",
      tax: "₹2,000",
      items: [
        { name: "Service Item 1", amount: "₹12,000" },
        { name: "Service Item 2", amount: "₹12,600" },
      ],
      notes: "Thank you for your business!",
      paymentTerms: "Net 30 days",
    };

    return (
      <div className="mt-4 h-[180px] overflow-hidden rounded-lg bg-neutral-100">
        <div className="h-full scale-[0.22] origin-top-left" style={{ width: '454%', height: '454%' }}>
          {renderTemplate(template.slug, {
            preview: true,
            modalPreview: true,
            mockData,
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 pt-4 pb-8 space-y-8">
      {/* 2️⃣ header section */}
      <section className="mb-4 sm:mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Invoices</p>
          <h1 className="text-2xl sm:text-3xl font-bold leading-tight">Pick a template and billing, {firstName}.</h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Choose a layout, preview instantly, then jump into the editor. PaperChai wires reminders, WhatsApp nudges, and payment links out of the box.
          </p>
        </div>
      </section>

      {/* Metrics Row - 2 cols mobile, 4 cols desktop */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {METRICS.map((metric) => (
          <div key={metric.label} className="rounded-2xl border border-white/30 bg-white/90 p-4 shadow-[0_20px_80px_-60px_rgba(15,23,42,0.45)]">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              <metric.icon className="h-4 w-4 text-primary" />
              {metric.label}
            </div>
            <p className="mt-2 text-2xl font-semibold text-foreground">{metric.value}</p>
          </div>
        ))}
      </div>

      {/* 3️⃣ filters row */}
      <section className="mb-6 space-y-3">
        {/* Chips - scrollable on mobile */}
        <div className="-mx-4 overflow-x-auto sm:mx-0 no-scrollbar">
          <div className="flex min-w-max gap-2 px-4 sm:px-0">
            {[
              { label: "All", icon: Sparkle },
              { label: "Free", icon: Star },
              { label: "Pro", icon: Flame },
              { label: "Light", icon: Palette },
              { label: "Dark", icon: ShieldCheck },
              { label: "Gradient", icon: Zap },
              { label: "Bold", icon: Sparkles },
            ].map((tab) => (
              <button
                key={tab.label}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setFilter(tab.label);
                }}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold whitespace-nowrap transition cursor-pointer ${filter === tab.label
                  ? "border-primary/50 bg-primary/10 text-foreground"
                  : "border-border/70 text-muted-foreground hover:border-primary/30"
                  }`}
              >
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sort + Search */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            Sort:
            <div className="relative">
              <select
                className="appearance-none rounded-full border border-border/60 bg-white px-3 py-1 pr-6 text-xs font-semibold outline-none focus:border-primary/50"
                value={sort}
                onChange={(e) => setSort(e.target.value as typeof sort)}
              >
                <option value="default">Trending</option>
                <option value="pro">Pro first</option>
                <option value="az">A-Z</option>
              </select>
              {/* Custom arrow for appearance if needed, or rely on browser default */}
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-border/60 bg-white px-3 py-1.5 w-full sm:w-auto">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search templates"
              className="w-full sm:w-48 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>
      </section>

      {/* 4️⃣ templates grid */}
      <section className="mb-6">
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">
          {sorted.length} Templates
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sorted.map((template) => {
            const isAvailable = template.slug === "classic-gray";
            const tag = template.isPro ? "Pro" : "Free";
            const tagBadge = (template.tags || "").split(",")[0]?.trim();
            return (
              <article
                key={template.slug}
                className={`group relative flex flex-col justify-between rounded-2xl border ${template.isPro ? "border-amber-200/80" : "border-border/60"
                  } bg-white p-4 shadow-sm transition-all ${isAvailable ? "hover:-translate-y-1 hover:shadow-md" : "opacity-75"
                  }`}
              >
                <div className="space-y-4">
                  {/* Header: Name + Badge */}
                  <div className="flex items-center justify-between relative z-10">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{template.name}</p>
                      {tagBadge && <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{tagBadge}</p>}
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${tag === "Pro" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                        }`}
                    >
                      {tag}
                    </span>
                  </div>

                  {/* Preview Mock wrapper with fixed height constraint */}
                  <div className="relative z-10 overflow-hidden rounded-xl border border-border/40 bg-slate-50">
                    {renderMock(template)}
                  </div>
                </div>

                {/* Actions: Use + Preview */}
                <div className="mt-4 flex flex-col sm:flex-row gap-2 relative z-20">
                  {isAvailable ? (
                    <>
                      <Link
                        href={`/invoices/new?template=${template.slug}`}
                        className="w-full sm:flex-1 text-center rounded-lg bg-primary text-primary-foreground font-medium text-xs px-3 py-2.5 shadow-sm hover:bg-primary/90 transition"
                      >
                        Use template
                      </Link>
                      <button
                        type="button"
                        className="w-full sm:w-auto rounded-lg border border-border px-3 py-2.5 text-muted-foreground hover:bg-muted/30 transition flex items-center justify-center"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setPreviewTemplate(template);
                        }}
                      >
                        <Play className="h-3.5 w-3.5" />
                        <span className="ml-2 sm:hidden text-xs">Preview</span>
                      </button>
                    </>
                  ) : (
                    <div className="w-full rounded-lg bg-muted text-muted-foreground font-medium text-xs px-3 py-2.5 text-center cursor-not-allowed">
                      Coming Soon
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        {sorted.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-muted/40 p-10 text-sm text-muted-foreground text-center">
            <p>No templates found for &ldquo;{query || filter}&rdquo;.</p>
            <button onClick={() => { setFilter("All"); setQuery(""); }} className="mt-2 text-primary underline">Clear filters</button>
          </div>
        )}
      </section>

      {/* 6️⃣ Marketplace Section */}
      <section className="mt-8 sm:mt-10 rounded-2xl border border-dashed border-primary/40 bg-primary/5 px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <p className="text-xs uppercase tracking-wider text-primary font-semibold">Marketplace</p>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">Soon</span>
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-foreground">Community & Designer Templates</h3>
            <p className="text-sm text-muted-foreground max-w-xl">
              Get access to thousands of community-made invoices, AI themes, and direct imports from Canva/Figma.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
            <button className="w-full sm:w-auto rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm">
              Notify me
            </button>
            <button className="w-full sm:w-auto rounded-lg border border-primary/20 bg-white px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/5">
              Submit a template
            </button>
          </div>
        </div>
      </section>

      {/* Quick action FAB - Mobile only optional or keep fixed */}
      <Link
        href="/invoices/new"
        className="fixed bottom-6 right-6 z-30 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-white shadow-lg shadow-primary/30 transition hover:scale-105 active:scale-95 sm:hidden"
      >
        <Zap className="h-4 w-4 fill-white" />
        <span className="font-semibold">New</span>
      </Link>

      {previewTemplate && (
        <TemplatePreviewModal template={previewTemplate} onClose={() => setPreviewTemplate(null)} />
      )}
    </div>
  );
}
