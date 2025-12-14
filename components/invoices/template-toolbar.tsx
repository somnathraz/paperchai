import { useState } from "react";
import { TemplateModal } from "./template-modal";

const templates = [
  { name: "Minimal Light", tag: "Free" },
  { name: "Studio Bold", tag: "Free" },
  { name: "Gradient Aura", tag: "Pro" },
  { name: "Neat Receipt", tag: "Free" },
  { name: "Neo Dark", tag: "Pro" },
];

type TemplateToolbarProps = {
  onOpenPicker: () => void;
  showModal: boolean;
  onCloseModal: () => void;
};

export function TemplateToolbar({ onOpenPicker, showModal, onCloseModal }: TemplateToolbarProps) {
  return (
    <>
      <section className="flex flex-col gap-4 rounded-3xl border border-white/20 bg-white/90 p-6 shadow-[0_20px_80px_-60px_rgba(15,23,42,0.45)] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Templates</p>
          <h2 className="text-xl font-semibold">Pick a layout</h2>
          <p className="text-sm text-muted-foreground">Browse free + pro templates, instantly preview, and switch on the fly.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button className="rounded-full bg-gradient-to-r from-primary via-emerald-500 to-primary px-4 py-2 text-sm font-semibold text-primary-foreground" onClick={onOpenPicker}>
            Choose template
          </button>
          <button className="rounded-full border border-border/60 px-4 py-2 text-sm font-semibold text-muted-foreground">
            Template marketplace
          </button>
        </div>
      </section>
      {showModal && <TemplateModal templates={templates} onClose={onCloseModal} />}
    </>
  );
}
