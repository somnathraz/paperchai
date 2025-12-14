"use client";
/* eslint-disable @next/next/no-img-element */

import { FileText, Mail, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

type WorkspacePreviewProps = {
  name: string;
  businessType: string;
  logo: string | null;
  address: string;
  taxId: string;
};

export function WorkspacePreview({ name, businessType, logo, address, taxId }: WorkspacePreviewProps) {
  return (
    <div className="space-y-4 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 via-white to-emerald-50/30 p-6">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Preview</h3>
      </div>

      <div className="space-y-4">
        {/* Invoice Header Preview */}
        <div className="rounded-lg border border-border/50 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between border-b border-border/30 pb-3">
            <div className="flex items-center gap-3">
              {logo ? (
                <img src={logo} alt={name} className="h-10 w-10 rounded-lg object-cover" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileText className="h-5 w-5" />
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-foreground">{name || "Your Workspace"}</p>
                <p className="text-xs text-muted-foreground">{businessType}</p>
              </div>
            </div>
            <span className="text-xs font-semibold text-primary">INVOICE #001</span>
          </div>
          <p className="text-xs text-muted-foreground">Invoice header preview</p>
        </div>

        {/* Reminder Footer Preview */}
        <div className="rounded-lg border border-border/50 bg-white p-4 shadow-sm">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Mail className="h-3 w-3" />
              <span className="font-semibold">Reminder footer</span>
            </div>
            <div className="space-y-1 text-xs text-foreground">
              <p className="font-semibold">{name || "Your Workspace"}</p>
              {address && <p className="text-muted-foreground">{address}</p>}
              {taxId && (
                <p className="text-muted-foreground">
                  <span className="font-medium">GST:</span> {taxId}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Recap Preview */}
        <div className="rounded-lg border border-border/50 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            {logo ? (
              <img src={logo} alt={name} className="h-8 w-8 rounded object-cover" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded bg-primary/10 text-primary">
                <FileText className="h-4 w-4" />
              </div>
            )}
            <div>
              <p className="text-xs font-semibold text-foreground">Month-end Recap</p>
              <p className="text-xs text-muted-foreground">Logo + name automatically included</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
