"use client";

import { memo } from "react";
import { Mail, MessageSquare, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SequenceStep {
  timing: string; // e.g., "T-3d", "T day", "T+3d"
  channels: ("email" | "whatsapp")[];
  template: string;
}

interface Sequence {
  id: string;
  name: string;
  description: string;
  tone: string;
  channels: string;
  steps: SequenceStep[];
  isDefault?: boolean;
  suggestedFor?: string;
}

const SEQUENCES: Sequence[] = [
  {
    id: "standard",
    name: "Standard Invoice Reminder",
    description: "Used on all invoices by default.",
    tone: "Warm Professional",
    channels: "Email + WhatsApp",
    isDefault: true,
    steps: [
      { timing: "T-3d", channels: ["email"], template: "Gentle Reminder" },
      { timing: "T day", channels: ["email"], template: "Due Date Follow-up" },
      { timing: "T+7d", channels: ["email", "whatsapp"], template: "Overdue Warning" },
    ],
  },
  {
    id: "high-risk",
    name: "High-Risk Client Sequence",
    description: "More aggressive timings for clients on Risk Watchlist.",
    tone: "Firm Professional",
    channels: "Email + WhatsApp",
    suggestedFor: "Risk Watchlist",
    steps: [
      { timing: "T-5d", channels: ["email"], template: "Early Reminder" },
      { timing: "T-1d", channels: ["email"], template: "Due Tomorrow" },
      { timing: "T day", channels: ["email", "whatsapp"], template: "Due Today" },
      { timing: "T+2d", channels: ["email", "whatsapp"], template: "Urgent Follow-up" },
      { timing: "T+5d", channels: ["email", "whatsapp"], template: "Final Notice" },
    ],
  },
];

interface SequenceCardProps {
  sequence: Sequence;
  onEditSteps?: (sequenceId: string) => void;
  onEditCopy?: (sequenceId: string) => void;
  onChangeTone?: (sequenceId: string, tone: string) => void;
  onEnable?: (sequenceId: string) => void;
}

const TimelineVisualization = memo(function TimelineVisualization({
  steps,
}: {
  steps: SequenceStep[];
}) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2">
      {steps.map((step, index) => (
        <div key={index} className="flex items-center gap-2 flex-shrink-0">
          <div className="flex flex-col items-center">
            <div className="text-xs font-medium text-muted-foreground mb-1 whitespace-nowrap">
              {step.timing}
            </div>
            <div className="flex gap-1">
              {step.channels.map((channel) => {
                const Icon = channel === "email" ? Mail : MessageSquare;
                return (
                  <div
                    key={channel}
                    className="p-1.5 rounded bg-violet-100 dark:bg-violet-900/30"
                    title={channel}
                  >
                    <Icon className="w-3 h-3 text-violet-600 dark:text-violet-400" />
                  </div>
                );
              })}
            </div>
          </div>
          {index < steps.length - 1 && <div className="w-4 h-0.5 bg-border" />}
        </div>
      ))}
    </div>
  );
});

const SequenceCard = memo(function SequenceCard({
  sequence,
  onEditSteps,
  onEditCopy,
  onChangeTone,
  onEnable,
}: SequenceCardProps) {
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-base">{sequence.name}</h3>
            {sequence.isDefault && (
              <Badge variant="outline" className="text-xs">
                Default
              </Badge>
            )}
            {sequence.suggestedFor && (
              <Badge
                variant="outline"
                className="text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 border-0"
              >
                Suggested for {sequence.suggestedFor}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{sequence.description}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-4">
        <div className="flex items-center gap-1">
          <span className="font-medium">Tone:</span>
          <span>{sequence.tone}</span>
        </div>
        <span>•</span>
        <div className="flex items-center gap-1">
          <span className="font-medium">Channels:</span>
          <span>{sequence.channels}</span>
        </div>
      </div>

      {/* Timeline */}
      <div className="mb-4 p-3 rounded-lg bg-muted/50">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-medium">Timeline</span>
        </div>
        <TimelineVisualization steps={sequence.steps} />
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          onClick={() => onEditSteps?.(sequence.id)}
          variant="outline"
          size="sm"
          className="w-full sm:flex-1"
        >
          Edit steps
        </Button>
        <Button
          onClick={() => onEditCopy?.(sequence.id)}
          variant="outline"
          size="sm"
          className="w-full sm:flex-1"
        >
          Edit copy
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="w-full sm:w-auto">
              Change tone ▾
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onChangeTone?.(sequence.id, "Warm Professional")}>
              Warm Professional
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onChangeTone?.(sequence.id, "Firm Professional")}>
              Firm Professional
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onChangeTone?.(sequence.id, "Friendly Casual")}>
              Friendly Casual
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onChangeTone?.(sequence.id, "Formal")}>
              Formal
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {sequence.suggestedFor && !sequence.isDefault && (
        <Button
          onClick={() => onEnable?.(sequence.id)}
          className="w-full mt-3 bg-violet-600 hover:bg-violet-700"
          size="sm"
        >
          Enable for {sequence.suggestedFor}
        </Button>
      )}
    </Card>
  );
});

export const SequencesSection = memo(function SequencesSection({
  onEditSteps,
  onEditCopy,
  onChangeTone,
  onEnable,
}: {
  onEditSteps?: (sequenceId: string) => void;
  onEditCopy?: (sequenceId: string) => void;
  onChangeTone?: (sequenceId: string, tone: string) => void;
  onEnable?: (sequenceId: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold mb-1">Sequences & Templates</h2>
        <p className="text-sm text-muted-foreground">How your reminders actually go out.</p>
      </div>

      <div className="space-y-4">
        {SEQUENCES.map((sequence) => (
          <SequenceCard
            key={sequence.id}
            sequence={sequence}
            onEditSteps={onEditSteps}
            onEditCopy={onEditCopy}
            onChangeTone={onChangeTone}
            onEnable={onEnable}
          />
        ))}
      </div>
    </div>
  );
});
