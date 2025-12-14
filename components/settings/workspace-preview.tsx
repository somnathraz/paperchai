"use client";

import { Check, X, Mail, FileText } from "lucide-react";

type WorkspacePreviewProps = {
  name: string;
  logo: string;
  plan?: string;
  email?: string;
  address?: string;
  taxId?: string;
};

export function WorkspacePreview({ name, logo, address, taxId }: WorkspacePreviewProps) {
  return (
    <div className="space-y-4">
      {/* Footer Preview */}
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
  );
}

