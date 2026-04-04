"use client";

import { memo, useState, useCallback } from "react";
import { X, Eye, Code, ChevronDown } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";

interface TemplateVariable {
  key: string;
  label: string;
  example: string;
}

const TEMPLATE_VARIABLES: TemplateVariable[] = [
  { key: "{{clientName}}", label: "Client Name", example: "Acme Corp" },
  { key: "{{invoiceId}}", label: "Invoice Number", example: "#INV-001" },
  { key: "{{amount}}", label: "Invoice Amount", example: "₹12,400" },
  { key: "{{dueDate}}", label: "Due Date", example: "December 20, 2025" },
  { key: "{{paymentLink}}", label: "Invoice Link", example: "https://paperchai.com/inv/abc123" },
  { key: "{{companyName}}", label: "Company Name", example: "PaperChai" },
];

// Sample data for preview
const SAMPLE_DATA: Record<string, string> = {
  "{{clientName}}": "Acme Corp",
  "{{invoiceId}}": "#INV-001",
  "{{amount}}": "₹12,400",
  "{{dueDate}}": "December 20, 2025",
  "{{paymentLink}}": "https://paperchai.com/inv/abc123",
  "{{companyName}}": "PaperChai",
};

interface TemplateEditorDrawerProps {
  open: boolean;
  onClose: () => void;
  template?: {
    id: string;
    slug?: string;
    name: string;
    timing?: string;
    channel: "email" | "whatsapp";
    subject?: string;
    body: string;
  };
  onSave?: (template: { subject?: string; body: string }) => void;
}

const VariableChip = memo(function VariableChip({
  variable,
  onClick,
}: {
  variable: TemplateVariable;
  onClick: (key: string) => void;
}) {
  return (
    <button
      onClick={() => onClick(variable.key)}
      className="px-2 py-1 text-xs bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded-md hover:bg-violet-200 dark:hover:bg-violet-900/50 transition-colors"
      title={`Example: ${variable.example}`}
    >
      {variable.label}
    </button>
  );
});

const PreviewPanel = memo(function PreviewPanel({
  subject,
  body,
  channel,
}: {
  subject?: string;
  body: string;
  channel: "email" | "whatsapp";
}) {
  // Replace variables with sample data
  const replaceVariables = (text: string) => {
    let result = text;
    Object.entries(SAMPLE_DATA).forEach(([key, value]) => {
      result = result.replace(new RegExp(key.replace(/[{}]/g, "\\$&"), "g"), value);
    });
    return result;
  };

  const previewSubject = subject ? replaceVariables(subject) : "";
  const previewBody = replaceVariables(body);

  return (
    <div className="bg-muted/50 rounded-lg p-4 h-full overflow-y-auto">
      <div className="flex items-center gap-2 mb-3">
        <Eye className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium">Live Preview</span>
        <Badge variant="outline" className="text-xs ml-auto">
          {channel === "email" ? "Email" : "WhatsApp"}
        </Badge>
      </div>

      {channel === "email" ? (
        <div className="bg-background rounded-lg border shadow-sm overflow-hidden">
          {/* Email header */}
          <div className="p-3 border-b bg-muted/30">
            <div className="text-xs text-muted-foreground mb-1">Subject:</div>
            <div className="font-medium text-sm">{previewSubject || "(No subject)"}</div>
          </div>
          {/* Email body */}
          <div className="p-4">
            <div className="text-sm whitespace-pre-wrap leading-relaxed">
              {previewBody || "(No content)"}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#e5ddd5] dark:bg-[#0d1418] rounded-lg p-4">
          {/* WhatsApp message bubble */}
          <div className="bg-[#dcf8c6] dark:bg-[#005c4b] rounded-lg p-3 max-w-[85%] ml-auto shadow">
            <div className="text-sm whitespace-pre-wrap leading-relaxed text-[#111b21] dark:text-white">
              {previewBody || "(No content)"}
            </div>
            <div className="text-[10px] text-[#667781] dark:text-[#8696a0] text-right mt-1">
              10:30 AM ✓✓
            </div>
          </div>
        </div>
      )}

      {/* Sample data reference */}
      <div className="mt-4 p-3 bg-background rounded-lg border">
        <div className="text-xs font-medium text-muted-foreground mb-2">Sample Data Used:</div>
        <div className="grid grid-cols-2 gap-1 text-xs">
          {Object.entries(SAMPLE_DATA)
            .slice(0, 4)
            .map(([key, value]) => (
              <div key={key} className="flex justify-between gap-2">
                <span className="text-muted-foreground truncate">{key}</span>
                <span className="font-medium truncate">{value}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
});

export const TemplateEditorDrawer = memo(function TemplateEditorDrawer({
  open,
  onClose,
  template,
  onSave,
}: TemplateEditorDrawerProps) {
  const [subject, setSubject] = useState(template?.subject || "");
  const [body, setBody] = useState(template?.body || "");
  const [activeField, setActiveField] = useState<"subject" | "body">("body");

  // Handle variable insertion
  const insertVariable = useCallback(
    (variable: string) => {
      if (activeField === "subject") {
        setSubject((prev) => prev + variable);
      } else {
        setBody((prev) => prev + variable);
      }
    },
    [activeField]
  );

  // Handle save
  const handleSave = useCallback(() => {
    onSave?.({ subject, body });
    onClose();
  }, [subject, body, onSave, onClose]);

  // Reset form when template changes
  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) {
        onClose();
      } else if (template) {
        setSubject(template.subject || "");
        setBody(template.body || "");
      }
    },
    [template, onClose]
  );

  const channel = template?.channel || "email";
  const title = template?.timing
    ? `Edit Template – ${template.timing} ${template.timing.includes("+") ? "Overdue" : "Reminder"}`
    : "Edit Template";

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:max-w-[800px] p-0 flex flex-col">
        <SheetHeader className="p-4 sm:p-6 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg">{title}</SheetTitle>
            <Badge variant="outline" className="text-xs">
              {channel === "email" ? "Email" : "WhatsApp"}
            </Badge>
          </div>
        </SheetHeader>

        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Editor Panel */}
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto border-b lg:border-b-0 lg:border-r">
            <div className="space-y-4">
              {/* Variable insertion */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Insert Variable</Label>
                <div className="flex flex-wrap gap-2">
                  {TEMPLATE_VARIABLES.slice(0, 4).map((variable) => (
                    <VariableChip key={variable.key} variable={variable} onClick={insertVariable} />
                  ))}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-7 text-xs">
                        More <ChevronDown className="w-3 h-3 ml-1" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      {TEMPLATE_VARIABLES.slice(4).map((variable) => (
                        <DropdownMenuItem
                          key={variable.key}
                          onClick={() => insertVariable(variable.key)}
                        >
                          <Code className="w-3 h-3 mr-2" />
                          {variable.label}
                          <span className="ml-auto text-xs text-muted-foreground">
                            {variable.example}
                          </span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <Separator />

              {/* Subject (email only) */}
              {channel === "email" && (
                <div>
                  <Label htmlFor="subject" className="text-sm font-medium mb-2 block">
                    Subject Line
                  </Label>
                  <Input
                    id="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    onFocus={() => setActiveField("subject")}
                    placeholder="Enter email subject..."
                    className="w-full"
                  />
                </div>
              )}

              {/* Body */}
              <div>
                <Label htmlFor="body" className="text-sm font-medium mb-2 block">
                  Message Body
                </Label>
                <Textarea
                  id="body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  onFocus={() => setActiveField("body")}
                  placeholder={`Enter ${channel === "email" ? "email" : "WhatsApp"} message...`}
                  className="w-full min-h-[200px] sm:min-h-[300px] resize-none"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Tip: Click a variable chip above to insert it at the cursor position.
                </p>
              </div>
            </div>
          </div>

          {/* Preview Panel */}
          <div className="lg:w-[320px] p-4 sm:p-6 bg-muted/30 overflow-y-auto">
            <PreviewPanel subject={subject} body={body} channel={channel} />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t bg-background flex flex-col sm:flex-row gap-3 sm:justify-end">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="w-full sm:w-auto bg-violet-600 hover:bg-violet-700"
          >
            Save Template
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
});
