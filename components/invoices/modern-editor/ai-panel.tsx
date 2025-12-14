"use client";

import { useState, useRef } from "react";
import { X, Sparkles, Loader2, Check, AlertTriangle, RotateCcw, Upload, FileText, User, FolderOpen, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { InvoiceFormState } from "../invoice-form";

type AIPanelProps = {
  onClose: () => void;
  onGenerate: (data: Partial<InvoiceFormState>) => void;
  onClientCreated?: (client: { id: string; name: string }) => void;
  onProjectCreated?: (project: { id: string; name: string }) => void;
  clientName?: string;
  projectName?: string;
  currency?: string;
};

type GeneratedResult = {
  items: Array<{
    title: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
  }>;
  notes?: string | null;
  terms?: string | null;
  taxSuggestion?: { type: string; rate: number } | null;
  warnings?: string[];
};

type ExtractedProject = {
  name: string;
  description?: string;
  type?: string;
  totalBudget?: number;
  currency?: string;
  milestones?: Array<{
    title: string;
    amount?: number;
    description?: string;
  }>;
};

type ExtractedData = {
  client?: {
    name?: string;
    email?: string;
    company?: string;
    phone?: string;
  };
  projects?: ExtractedProject[];
  warnings?: string[];
};

type TabType = "generate" | "upload";

export function AIPanel({
  onClose,
  onGenerate,
  onClientCreated,
  onProjectCreated,
  clientName,
  projectName,
  currency
}: AIPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>("generate");
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GeneratedResult | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());

  // File upload state
  const [uploadLoading, setUploadLoading] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [creatingClient, setCreatingClient] = useState(false);
  const [creatingProject, setCreatingProject] = useState(false);
  const [createdClientId, setCreatedClientId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/ai/invoice/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          clientName,
          projectName,
          currency,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate");
      }

      setResult(data);
      setSelectedItems(new Set(data.items?.map((_: any, i: number) => i) || []));
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadLoading(true);
    setError(null);
    setExtractedData(null);
    setFileName(file.name);

    try {
      // Read file as base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];

        const res = await fetch("/api/ai/projects/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileMeta: {
              fileKey: `upload-${Date.now()}`,
              fileName: file.name,
              mimeType: file.type,
              size: file.size,
            },
            fileData: base64,
            isBase64: true,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to extract data");
        }

        setExtractedData(data.extract);
        setUploadLoading(false);
      };

      reader.onerror = () => {
        setError("Failed to read file");
        setUploadLoading(false);
      };

      reader.readAsDataURL(file);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
      setUploadLoading(false);
    }
  };

  const handleCreateClient = async () => {
    if (!extractedData?.client?.name) return;

    setCreatingClient(true);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: extractedData.client.name,
          email: extractedData.client.email || null,
          company: extractedData.client.company || null,
          phone: extractedData.client.phone || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create client");

      setCreatedClientId(data.client.id);
      onClientCreated?.(data.client);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreatingClient(false);
    }
  };

  const handleCreateProject = async (project: ExtractedProject) => {
    if (!createdClientId) {
      setError("Create the client first");
      return;
    }

    setCreatingProject(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: project.name,
          description: project.description || null,
          clientId: createdClientId,
          type: project.type || "FIXED",
          totalBudget: project.totalBudget || null,
          currency: project.currency || currency || "INR",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create project");

      onProjectCreated?.(data.project);

      // If project has milestones, convert to invoice items
      if (project.milestones?.length) {
        const items = project.milestones.map((m: { title: string; amount?: number; description?: string }) => ({
          title: m.title,
          description: m.description || "",
          quantity: 1,
          unitPrice: (m.amount || 0) / 100, // Convert from smallest unit
          taxRate: 0,
        }));
        setResult({ items, warnings: [] });
        setSelectedItems(new Set(items.map((_: any, i: number) => i)));
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreatingProject(false);
    }
  };

  const handleApply = () => {
    if (!result) return;

    const selectedItemsList = result.items.filter((_, i) => selectedItems.has(i));

    const generatedData: Partial<InvoiceFormState> = {
      items: selectedItemsList.map(item => ({
        title: item.title,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxRate: item.taxRate,
      })),
    };

    if (result.notes) generatedData.notes = result.notes;
    if (result.terms) generatedData.terms = result.terms;

    onGenerate(generatedData);
    setResult(null);
    setPrompt("");
    setExtractedData(null);
  };

  const toggleItem = (index: number) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency || "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const resetAll = () => {
    setResult(null);
    setExtractedData(null);
    setPrompt("");
    setFileName(null);
    setError(null);
    setCreatedClientId(null);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border/60 bg-white shadow-[0_-8px_32px_rgba(0,0,0,0.15)]">
      <div className="mx-auto max-w-4xl px-6 py-4">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-emerald-500 to-teal-500">
            <Sparkles className="h-5 w-5 text-white" />
          </div>

          <div className="flex-1 min-w-0">
            {/* Header with Tabs */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">PaperChai AI</h3>
                  <p className="text-xs text-muted-foreground">Generate items or upload a document</p>
                </div>
                {/* Tabs */}
                {!result && !extractedData && (
                  <div className="flex bg-muted/50 rounded-lg p-0.5">
                    <button
                      onClick={() => setActiveTab("generate")}
                      className={cn(
                        "px-3 py-1 text-xs font-medium rounded-md transition",
                        activeTab === "generate"
                          ? "bg-white text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Sparkles className="h-3 w-3 inline mr-1" />
                      Generate
                    </button>
                    <button
                      onClick={() => setActiveTab("upload")}
                      className={cn(
                        "px-3 py-1 text-xs font-medium rounded-md transition",
                        activeTab === "upload"
                          ? "bg-white text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Upload className="h-3 w-3 inline mr-1" />
                      Upload File
                    </button>
                  </div>
                )}
              </div>
              <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted/50">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-3 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertTriangle className="h-4 w-4" />
                {error}
                <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}

            {/* === GENERATE TAB === */}
            {activeTab === "generate" && !result && !extractedData && (
              <>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && !loading && handleGenerate()}
                    placeholder="e.g., Create invoice for website redesign, 3 milestones, add 18% GST"
                    className="flex-1 rounded-lg border border-border/60 bg-white px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                    disabled={loading}
                  />
                  <Button
                    onClick={handleGenerate}
                    disabled={loading || !prompt.trim()}
                    className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-5 shadow-lg shadow-emerald-200"
                  >
                    {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Generating...</> : <><Sparkles className="h-4 w-4 mr-2" /> Generate</>}
                  </Button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {["3 items for web design", "UI/UX package with GST", "Monthly retainer", "Consulting invoice"].map(s => (
                    <button key={s} onClick={() => setPrompt(s)} className="rounded-full border bg-muted/30 px-3 py-1 text-xs font-medium text-muted-foreground hover:border-emerald-400 hover:text-emerald-600">{s}</button>
                  ))}
                </div>
              </>
            )}

            {/* === UPLOAD TAB === */}
            {activeTab === "upload" && !result && !extractedData && (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/30 transition"
              >
                <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.txt,image/*" onChange={handleFileUpload} className="hidden" />
                {uploadLoading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
                    <p className="text-sm text-slate-600">Analyzing {fileName}...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="p-3 bg-emerald-100 rounded-full">
                      <Upload className="h-6 w-6 text-emerald-600" />
                    </div>
                    <p className="text-sm font-medium text-slate-700">Drop a file or click to upload</p>
                    <p className="text-xs text-slate-400">PDF, DOC, TXT or Image (max 10MB)</p>
                  </div>
                )}
              </div>
            )}

            {/* === EXTRACTED DATA PREVIEW === */}
            {extractedData && !result && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <FileText className="h-4 w-4" />
                  <span>Extracted from: {fileName}</span>
                </div>

                {/* Client Card */}
                {extractedData.client?.name && (
                  <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-blue-600" />
                        <div>
                          <p className="text-sm font-medium text-slate-800">{extractedData.client.name}</p>
                          {extractedData.client.email && <p className="text-xs text-slate-500">{extractedData.client.email}</p>}
                        </div>
                      </div>
                      {!createdClientId ? (
                        <Button size="sm" variant="outline" onClick={handleCreateClient} disabled={creatingClient} className="h-7 text-xs">
                          {creatingClient ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Plus className="h-3 w-3 mr-1" />}
                          Create Client
                        </Button>
                      ) : (
                        <Badge className="bg-green-100 text-green-700"><Check className="h-3 w-3 mr-1" /> Created</Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Projects */}
                {extractedData.projects?.map((project, idx) => (
                  <div key={idx} className="rounded-lg border border-purple-200 bg-purple-50/50 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <FolderOpen className="h-4 w-4 text-purple-600" />
                        <div>
                          <p className="text-sm font-medium text-slate-800">{project.name}</p>
                          {project.totalBudget && <p className="text-xs text-slate-500">Budget: {formatCurrency(project.totalBudget / 100)}</p>}
                        </div>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => handleCreateProject(project)} disabled={creatingProject || !createdClientId} className="h-7 text-xs">
                        {creatingProject ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Plus className="h-3 w-3 mr-1" />}
                        {createdClientId ? "Create Project" : "Create Client First"}
                      </Button>
                    </div>
                    {project.milestones && project.milestones.length > 0 && (
                      <div className="mt-2 pl-6 space-y-1">
                        {project.milestones.map((m, i) => (
                          <div key={i} className="flex justify-between text-xs text-slate-600">
                            <span>{m.title}</span>
                            {m.amount && <span className="font-medium">{formatCurrency(m.amount / 100)}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {/* Warnings */}
                {extractedData.warnings && extractedData.warnings.length > 0 && (
                  <div className="rounded-lg bg-amber-50 px-3 py-2">
                    {extractedData.warnings.map((w: string, i: number) => <p key={i} className="text-xs text-amber-700">⚠️ {w}</p>)}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" onClick={resetAll}><RotateCcw className="h-4 w-4 mr-2" /> Start Over</Button>
                </div>
              </div>
            )}

            {/* === GENERATED ITEMS RESULT === */}
            {result && (
              <div className="space-y-3">
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 overflow-hidden">
                  <div className="px-4 py-2 bg-emerald-100/50 border-b border-emerald-200">
                    <span className="text-xs font-medium text-emerald-700">Items ({result.items.length})</span>
                  </div>
                  <div className="divide-y divide-emerald-100 max-h-48 overflow-auto">
                    {result.items.map((item, index) => (
                      <div key={index} onClick={() => toggleItem(index)} className={cn("flex items-center gap-3 px-4 py-2 cursor-pointer transition", selectedItems.has(index) ? "bg-white" : "bg-slate-50 opacity-50")}>
                        <input type="checkbox" checked={selectedItems.has(index)} onChange={() => toggleItem(index)} className="h-4 w-4 rounded border-emerald-300 text-emerald-500" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{item.title}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-medium text-slate-800">{formatCurrency(item.unitPrice * item.quantity)}</p>
                        </div>
                        {item.taxRate > 0 && <Badge variant="secondary" className="text-[10px]">{item.taxRate}%</Badge>}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleApply} disabled={selectedItems.size === 0} className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-200">
                    <Check className="h-4 w-4 mr-2" /> Apply {selectedItems.size} Item{selectedItems.size !== 1 ? "s" : ""}
                  </Button>
                  <Button variant="outline" onClick={resetAll}><RotateCcw className="h-4 w-4 mr-2" /> Start Over</Button>
                  <Button variant="ghost" onClick={onClose}>Cancel</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
