"use client";

import { Plus, GripHorizontal } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { InvoiceSection } from "../types";

type SectionsTabProps = {
  sections: InvoiceSection[];
  onSectionsChange: (sections: InvoiceSection[]) => void;
  addCustomSection: () => void;
  renameSection: (id: string, title: string) => void;
  toggleSectionVisibility: (id: string) => void;
  updateCustomContent: (id: string, content: string) => void;
  updateCustomItems: (id: string, items: { label: string; value: string }[]) => void;
  // Drag and drop props
  draggedSectionId: string | null;
  dragOverIndex: number | null;
  handleDragStart: (e: React.DragEvent, id: string) => void;
  handleDragEnd: (e: React.DragEvent) => void;
  handleDragOver: (e: React.DragEvent, index: number) => void;
  handleDrop: (e: React.DragEvent, index: number) => void;
  handleDragLeave: () => void;
};

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border/60 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {title}
        </p>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

export function SectionsTab({
  sections,
  onSectionsChange,
  addCustomSection,
  renameSection,
  toggleSectionVisibility,
  updateCustomContent,
  updateCustomItems,
  draggedSectionId,
  dragOverIndex,
  handleDragStart,
  handleDragEnd,
  handleDragOver,
  handleDrop,
  handleDragLeave,
}: SectionsTabProps) {
  return (
    <SectionCard title="Sections">
      <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/40 px-3 py-2">
        <p className="text-xs text-muted-foreground">
          Show, rename, reorder, and add custom sections.
        </p>
        <Button
          onClick={addCustomSection}
          size="sm"
          variant="outline"
          className="h-8 gap-1 text-[11px]"
        >
          <Plus className="h-3.5 w-3.5" />
          Custom
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {[
          {
            id: "signature",
            label: "Signature",
            section: {
              id: `signature_${Date.now()}`,
              title: "Signature",
              visible: true,
              custom: true,
              customType: "signature" as const,
            },
          },
          {
            id: "bank",
            label: "Bank details",
            section: {
              id: `bank_${Date.now()}`,
              title: "Bank Details",
              visible: true,
              custom: true,
              customType: "keyValue" as const,
              items: [
                { label: "Account Name", value: "Your Name" },
                { label: "Account No", value: "XXXX XXXX XXXX" },
                { label: "IFSC", value: "XXXX0000" },
              ],
            },
          },
          {
            id: "milestone",
            label: "Milestones",
            section: {
              id: `milestone_${Date.now()}`,
              title: "Milestones",
              visible: true,
              custom: true,
              customType: "text" as const,
              content: "Phase 1: Design\nPhase 2: Build\nPhase 3: QA",
            },
          },
        ].map((preset) => (
          <button
            key={preset.id}
            onClick={() => onSectionsChange([...sections, preset.section])}
            className="rounded-md border border-dashed border-border/60 px-2 py-1 text-[11px] font-semibold text-muted-foreground hover:border-primary/50 hover:text-primary"
          >
            + {preset.label}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {sections.map((section, index) => (
          <div
            key={section.id}
            draggable
            onDragStart={(e) => handleDragStart(e, section.id)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={(e) => handleDrop(e, index)}
            onDragLeave={handleDragLeave}
            className={cn(
              "rounded-lg border border-border/60 bg-white px-3 py-2 transition-all cursor-move",
              draggedSectionId === section.id && "opacity-50",
              dragOverIndex === index &&
                draggedSectionId !== section.id &&
                "border-primary border-2 shadow-md"
            )}
          >
            <div className="flex items-center gap-2">
              <div className="flex flex-col gap-0.5 cursor-grab active:cursor-grabbing">
                <GripHorizontal className="h-3 w-4 text-muted-foreground" />
                <GripHorizontal className="h-3 w-4 text-muted-foreground" />
              </div>
              <Input
                className="flex-1 text-xs font-medium"
                value={section.title}
                onChange={(e) => renameSection(section.id, e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              />
              <Switch
                checked={section.visible}
                onCheckedChange={() => toggleSectionVisibility(section.id)}
                onClick={(e) => e.stopPropagation()}
              />
              {section.custom && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSectionsChange(sections.filter((s) => s.id !== section.id));
                  }}
                >
                  ×
                </Button>
              )}
            </div>
            {section.custom && (
              <div className="mt-2 space-y-2">
                <div className="flex items-center gap-2">
                  <Label className="text-[11px] text-muted-foreground">Type</Label>
                  <Select
                    value={section.customType || "text"}
                    onValueChange={(v) =>
                      onSectionsChange(
                        sections.map((s) =>
                          s.id === section.id
                            ? { ...s, customType: v as "text" | "keyValue" | "signature" }
                            : s
                        )
                      )
                    }
                  >
                    <SelectTrigger className="h-8 w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Text block</SelectItem>
                      <SelectItem value="keyValue">Key / value list</SelectItem>
                      <SelectItem value="signature">Signature</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {section.customType !== "keyValue" && (
                  <Textarea
                    className="h-20 text-xs"
                    placeholder="Custom section content (optional)"
                    value={section.content || ""}
                    onChange={(e) => updateCustomContent(section.id, e.target.value)}
                  />
                )}

                {section.customType === "keyValue" && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold text-muted-foreground">
                      Key/value rows
                    </p>
                    {(section.items || []).map((row, idx) => (
                      <div key={idx} className="grid grid-cols-2 gap-2">
                        <Input
                          placeholder="Label"
                          value={row.label}
                          onChange={(e) => {
                            const items = [...(section.items || [])];
                            items[idx] = { ...items[idx], label: e.target.value };
                            updateCustomItems(section.id, items);
                          }}
                        />
                        <div className="flex gap-2">
                          <Input
                            placeholder="Value"
                            value={row.value}
                            onChange={(e) => {
                              const items = [...(section.items || [])];
                              items[idx] = { ...items[idx], value: e.target.value };
                              updateCustomItems(section.id, items);
                            }}
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              const items = (section.items || []).filter((_, i) => i !== idx);
                              updateCustomItems(section.id, items);
                            }}
                          >
                            ×
                          </Button>
                        </div>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        updateCustomItems(section.id, [
                          ...(section.items || []),
                          { label: "", value: "" },
                        ])
                      }
                      className="h-8 text-[11px]"
                    >
                      + Add row
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
