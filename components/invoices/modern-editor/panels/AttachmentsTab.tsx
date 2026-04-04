"use client";

import { Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InvoiceFormState } from "../../invoice-form";

type AttachmentsTabProps = {
  formState: InvoiceFormState;
  updateField: <K extends keyof InvoiceFormState>(field: K, value: InvoiceFormState[K]) => void;
};

export function AttachmentsTab({ formState, updateField }: AttachmentsTabProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border-2 border-dashed border-border/60 p-6 text-center">
        <Paperclip className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-xs text-muted-foreground mb-2">
          Drop agreements, SOWs, screenshots here
        </p>
        <Button variant="outline" size="sm">
          Browse files
        </Button>
      </div>
      <div className="space-y-2">
        {(formState.attachments || []).map((att: any, idx: number) => (
          <div key={idx} className="rounded-lg border p-3 flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{att.label || "Attachment"}</p>
              <p className="text-[11px] text-muted-foreground truncate">{att.url}</p>
            </div>
            <div className="flex items-center gap-2">
              <Select defaultValue="reference">
                <SelectTrigger className="h-7 w-24 text-[10px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="agreement">Agreement</SelectItem>
                  <SelectItem value="reference">Reference</SelectItem>
                  <SelectItem value="screenshot">Screenshot</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() =>
                  updateField(
                    "attachments",
                    (formState.attachments || []).filter((_: any, i: number) => i !== idx)
                  )
                }
              >
                ×
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
