"use client";

import { ChevronRight, Star, Flame } from "lucide-react";
import { cn } from "@/lib/utils";

const TEMPLATES = [
  { slug: "classic-gray", name: "Classic Gray", isPro: false, tags: "Free, Corporate" },
  { slug: "minimal-light", name: "Minimal Light", isPro: false, tags: "Free, Minimal" },
  { slug: "duo-card", name: "Duo Card", isPro: false, tags: "Free, Modern" },
  { slug: "invoice-compact", name: "Invoice Compact", isPro: false, tags: "Free, Compact" },
  { slug: "soft-pastel", name: "Soft Pastel", isPro: false, tags: "Free, Pastel" },
  { slug: "neat-receipt", name: "Neat Receipt", isPro: false, tags: "Free, Receipt" },
  { slug: "studio-bold", name: "Studio Bold", isPro: false, tags: "Free, Bold" },
  { slug: "essential-pro", name: "Essential Pro", isPro: true, tags: "Pro, SaaS" },
  { slug: "folio-modern", name: "Folio Modern", isPro: true, tags: "Pro, Editorial" },
  { slug: "gradient-aura", name: "Gradient Aura", isPro: true, tags: "Pro, Gradient" },
  { slug: "luxe-gold", name: "Luxe Gold", isPro: true, tags: "Pro, Luxury" },
  { slug: "multi-brand-dynamic", name: "Multi Brand", isPro: true, tags: "Pro, Agency" },
  { slug: "neo-dark", name: "Neo Dark", isPro: true, tags: "Pro, Dark" },
  { slug: "split-hero", name: "Split Hero", isPro: true, tags: "Pro, Visual" },
  { slug: "edge-minimal-pro", name: "Edge Minimal", isPro: true, tags: "Pro, Minimal" },
];

type TemplateSidebarProps = {
  currentTemplate: string;
  onTemplateChange: (slug: string) => void;
  open: boolean;
  onClose: () => void;
};

export function TemplateSidebar({ currentTemplate, onTemplateChange, open, onClose }: TemplateSidebarProps) {
  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer - Fixed position, slides from right */}
      <div className="fixed right-0 top-0 z-50 h-full w-80 border-l border-border/60 bg-white shadow-2xl">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/60 px-4 py-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Templates</h2>
              <p className="mt-1 text-xs text-muted-foreground">Choose a template</p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-muted-foreground transition hover:bg-muted/50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Template List */}
          <div className="flex-1 overflow-y-auto px-2 py-2">
            <div className="space-y-1">
              {TEMPLATES.map((template) => {
                const isAvailable = template.slug === "classic-gray";
                return (
                  <button
                    key={template.slug}
                    onClick={() => isAvailable && onTemplateChange(template.slug)}
                    disabled={!isAvailable}
                    className={cn(
                      "group relative w-full rounded-lg border px-3 py-2.5 text-left transition-all",
                      !isAvailable && "opacity-60 cursor-not-allowed",
                      currentTemplate === template.slug && isAvailable
                        ? "border-primary/50 bg-primary/5 shadow-sm"
                        : isAvailable
                        ? "border-transparent hover:border-border/60 hover:bg-muted/30"
                        : "border-transparent"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground truncate">{template.name}</span>
                          {!isAvailable ? (
                            <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full flex-shrink-0">
                              Soon
                            </span>
                          ) : template.isPro ? (
                            <Flame className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" />
                          ) : (
                            <Star className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground truncate">{template.tags}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

