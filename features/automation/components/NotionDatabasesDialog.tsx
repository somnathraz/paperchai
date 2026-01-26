"use client";

import { useState, useEffect } from "react";
import {
  X,
  Database,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FileText,
  ExternalLink,
  ArrowLeft,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { AiProjectWizard } from "@/components/clients/ai-project-wizard";
import type { ExtractedData } from "@/components/clients/ai-project-wizard/types";
import { PendingAutomationsDialog } from "./PendingAutomationsDialog";

interface NotionDatabase {
  id: string;
  title: string;
  properties: string[];
  url: string;
}

interface NotionPage {
  id: string;
  title: string;
  url: string;
}

interface AnalysisResult {
  pageId: string;
  title: string;
  status: "success" | "error";
  entityType?: "project" | "client" | string;
  data?: {
    client: { name: string; email?: string; company?: string; phone?: string };
    project: {
      name: string;
      description?: string;
      type?: string;
      totalBudget?: number;
      currency?: string;
      startDate?: string;
      endDate?: string;
    };
    milestones: Array<{
      title: string;
      amount: number;
      description?: string;
      expectedDate?: string;
      dueDate?: string;
    }>;
  };
  summary?: string;
  confidence?: number;
  error?: string;
}

interface NotionDatabasesDialogProps {
  open: boolean;
  onClose: () => void;
}

export function NotionDatabasesDialog({ open, onClose }: NotionDatabasesDialogProps) {
  // View State: 'list' | 'analyzing' | 'wizard' | 'preview'
  const [view, setView] = useState<"list" | "analyzing" | "wizard" | "preview">("list");

  // Data State
  const [databases, setDatabases] = useState<NotionDatabase[]>([]);
  const [expandedDb, setExpandedDb] = useState<string | null>(null);
  const [selectedDatabaseId, setSelectedDatabaseId] = useState<string | null>(null); // Track selected DB
  const [dbPages, setDbPages] = useState<Record<string, NotionPage[]>>({});
  const [selectedPages, setSelectedPages] = useState<Record<string, Set<string>>>({});

  // Analysis State
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
  const [currentResultIndex, setCurrentResultIndex] = useState(0);
  const [wizardData, setWizardData] = useState<ExtractedData | null>(null);

  // UI/Loading State
  const [loadingPages, setLoadingPages] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [creating, setCreating] = useState(false); // Track creation state
  const [error, setError] = useState<string | null>(null);
  const [pendingAutomationsDialogOpen, setPendingAutomationsDialogOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setView("list");
      fetchDatabases();
      setAnalysisResults([]);
      setSelectedPages({});
      setCurrentResultIndex(0);
      setWizardData(null);
    }
  }, [open]);

  const fetchDatabases = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/integrations/notion/databases");
      if (!response.ok) {
        throw new Error("Failed to fetch databases");
      }
      const data = await response.json();
      setDatabases(data.databases || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDatabasePages = async (databaseId: string) => {
    if (dbPages[databaseId]) {
      setExpandedDb(expandedDb === databaseId ? null : databaseId);
      return;
    }

    setLoadingPages(databaseId);
    setExpandedDb(databaseId);

    try {
      const response = await fetch(`/api/integrations/notion/databases/${databaseId}/pages`);
      if (!response.ok) {
        throw new Error("Failed to fetch pages");
      }
      const data = await response.json();
      setDbPages((prev) => ({
        ...prev,
        [databaseId]: data.pages || [],
      }));
      if (!selectedPages[databaseId]) {
        setSelectedPages((prev) => ({ ...prev, [databaseId]: new Set() }));
      }
    } catch (err) {
      console.error("Failed to fetch pages:", err);
      setExpandedDb(null);
    } finally {
      setLoadingPages(null);
    }
  };

  const togglePageSelection = (databaseId: string, pageId: string) => {
    setSelectedPages((prev) => {
      const currentSet = new Set(prev[databaseId] || []);
      if (currentSet.has(pageId)) {
        currentSet.delete(pageId);
      } else {
        currentSet.add(pageId);
      }
      return { ...prev, [databaseId]: currentSet };
    });
  };

  const toggleAllPages = (databaseId: string) => {
    const pages = dbPages[databaseId] || [];
    const currentSet = selectedPages[databaseId] || new Set();
    const allSelected = pages.length > 0 && pages.every((p) => currentSet.has(p.id));

    setSelectedPages((prev) => {
      const newSet = new Set(prev[databaseId] || []);
      if (allSelected) {
        pages.forEach((p) => newSet.delete(p.id));
      } else {
        pages.forEach((p) => newSet.add(p.id));
      }
      return { ...prev, [databaseId]: newSet };
    });
  };

  const handleAnalyze = async (databaseId: string) => {
    const selectedIds = Array.from(selectedPages[databaseId] || []);
    if (selectedIds.length === 0) return;

    // Store which database we're importing from
    setSelectedDatabaseId(databaseId);
    setView("analyzing");

    try {
      const response = await fetch("/api/integrations/notion/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          databaseId,
          pageIds: selectedIds,
          importType: "AUTO",
        }),
      });

      if (!response.ok) {
        throw new Error("Analyze request failed");
      }

      const result = await response.json();
      const results: AnalysisResult[] = result.results || [];

      if (results.length === 0 || results.every((r) => r.status === "error")) {
        setError("No data could be extracted from selected pages.");
        setView("list");
        return;
      }

      setAnalysisResults(results);

      // Option 1: Open wizard for review (current flow)
      const firstSuccess = results.find((r) => r.status === "success");
      if (firstSuccess && firstSuccess.data) {
        openWizardWithData(firstSuccess.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setView("list");
    }
  };

  // NEW: Create project directly from analysis results
  const createFromAnalysis = async (result: AnalysisResult) => {
    if (!result.pageId || !selectedDatabaseId || !result.data) return;

    setCreating(true);
    setError(null);

    try {
      const response = await fetch("/api/integrations/notion/create-from-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType: result.entityType || "project",
          data: result.data,
          notionPageId: result.pageId,
          notionDatabaseId: selectedDatabaseId,
          notionPageTitle: result.title,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create entity");
      }

      const created = await response.json();
      console.log("[Notion] Created:", created);

      // Check for suggested automations
      if (created.suggestedAutomations && created.suggestedAutomations > 0) {
        // Show pending automations dialog
        setPendingAutomationsDialogOpen(true);
      }

      // Success! Remove this result from the list and continue to next
      const remainingResults = analysisResults.filter((r) => r.pageId !== result.pageId);
      setAnalysisResults(remainingResults);

      if (remainingResults.length === 0) {
        // All done! Close dialog
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Creation failed");
    } finally {
      setCreating(false);
    }
  };

  const openWizardWithData = (data: AnalysisResult["data"]) => {
    if (!data) return;

    // Transform to ExtractedData format for the wizard
    // Use empty string fallbacks only for required fields (name)
    // Use undefined for optional validated fields (email, phone) to avoid validation errors
    const wizardFormat: ExtractedData = {
      client: {
        name: data.client?.name || data.client?.company || "Unnamed Client",
        email: data.client?.email && data.client.email.includes("@") ? data.client.email : "",
        company: data.client?.company || "",
        phone: data.client?.phone || "",
        notes: "",
      },
      project: {
        name: data.project?.name || "Imported Project",
        description: data.project?.description || "",
        type: (data.project?.type as any) || "MILESTONE",
        billingStrategy: "PER_MILESTONE",
        totalBudget: data.project?.totalBudget || 0,
        currency: data.project?.currency || "INR",
        startDate: data.project?.startDate,
        endDate: data.project?.endDate,
        autoInvoiceEnabled: true,
        autoRemindersEnabled: true,
      },
      milestones: (data.milestones || []).map((m, i) => ({
        title: m.title || `Milestone ${i + 1}`,
        description: m.description || "",
        amount: m.amount || 0,
        expectedDate: m.expectedDate,
        dueDate: m.dueDate,
        billingTrigger: "ON_COMPLETION" as const,
        status: "PLANNED" as const,
      })),
      confidence: {
        client: 0.7,
        project: 0.8,
        milestones: 0.7,
      },
      warnings: [],
    };

    setWizardData(wizardFormat);
    setView("wizard");
  };

  const handleWizardSuccess = () => {
    // Move to next result if any
    const nextIndex = currentResultIndex + 1;
    const remainingResults = analysisResults.slice(nextIndex);
    const nextSuccess = remainingResults.find((r) => r.status === "success");

    if (nextSuccess && nextSuccess.data) {
      setCurrentResultIndex(analysisResults.indexOf(nextSuccess));
      openWizardWithData(nextSuccess.data);
    } else {
      // All done
      setView("list");

      // Check if we should show pending automations dialog (fetch it to be sure?)
      // Or just blindly open it - the dialog handles empty state by returning null
      setPendingAutomationsDialogOpen(true);
    }
  };

  const handleBack = () => {
    setView("list");
    setError(null);
    setWizardData(null);
  };

  // If wizard view, render the AiProjectWizard
  if (view === "wizard" && wizardData) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="p-6 pb-0 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Import from Notion
                <Badge variant="secondary" className="ml-2">
                  {currentResultIndex + 1} /{" "}
                  {analysisResults.filter((r) => r.status === "success").length}
                </Badge>
              </DialogTitle>
              <Button variant="ghost" size="sm" onClick={handleBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Selection
              </Button>
            </div>
            <DialogDescription>
              Review and edit the extracted data, then create the client and project.
            </DialogDescription>
          </DialogHeader>
          <div className="p-6">
            {/* The AiProjectWizard handles its own state, 
                            but we pre-populate it via sessionStorage */}
            <AiProjectWizardWithData
              data={wizardData}
              onSuccess={handleWizardSuccess}
              onBack={handleBack}
            />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-0 gap-0">
          <DialogHeader className="p-6 pb-2">
            <div className="flex items-center justify-between">
              <DialogTitle>
                {view === "list" && "Import from Notion"}
                {view === "analyzing" && "Analyzing Documents..."}
              </DialogTitle>
              {view === "list" && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground text-xs gap-1"
                  onClick={() => window.open("https://www.notion.so/my-integrations", "_blank")}
                >
                  <ExternalLink className="w-3 h-3" />
                  Connect more pages
                </Button>
              )}
            </div>
            <DialogDescription>
              {view === "list" && "Select pages from your Notion databases to import as projects."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 pt-2">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-600">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            {/* LIST VIEW */}
            {view === "list" && (
              <div>
                {isLoading ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Loading databases...
                  </div>
                ) : databases.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    No databases found. Make sure you&apos;ve shared databases with PaperChai.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {databases.map((db) => {
                      const pagesCallback = dbPages[db.id] || [];
                      const selectedCount = (selectedPages[db.id] || new Set()).size;
                      const isExpanded = expandedDb === db.id;

                      return (
                        <Card key={db.id} className="overflow-hidden">
                          <div className="p-4">
                            <div className="flex items-center justify-between gap-4">
                              <button
                                onClick={() => fetchDatabasePages(db.id)}
                                className="flex items-center gap-2 flex-1 min-w-0 text-left hover:opacity-70 transition-opacity"
                              >
                                {loadingPages === db.id ? (
                                  <Loader2 className="w-4 h-4 flex-shrink-0 animate-spin text-muted-foreground" />
                                ) : isExpanded ? (
                                  <ChevronDown className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                                )}
                                <Database className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                <h3 className="font-medium truncate">{db.title}</h3>
                              </button>
                            </div>

                            {isExpanded && pagesCallback && (
                              <div className="mt-3 space-y-2 border-t pt-3">
                                {pagesCallback.length === 0 ? (
                                  <p className="text-sm text-muted-foreground py-2 pl-8">
                                    No pages found
                                  </p>
                                ) : (
                                  <>
                                    <div className="flex items-center gap-2 pl-8 pb-2">
                                      <Checkbox
                                        checked={
                                          pagesCallback.length > 0 &&
                                          selectedCount === pagesCallback.length
                                        }
                                        onCheckedChange={() => toggleAllPages(db.id)}
                                      />
                                      <span className="text-xs text-muted-foreground font-medium">
                                        Select All
                                      </span>
                                    </div>
                                    <div className="max-h-60 overflow-y-auto space-y-1 pl-8">
                                      {pagesCallback.map((page) => (
                                        <div
                                          key={page.id}
                                          className="flex items-center gap-2 text-sm py-1"
                                        >
                                          <Checkbox
                                            checked={selectedPages[db.id]?.has(page.id)}
                                            onCheckedChange={() =>
                                              togglePageSelection(db.id, page.id)
                                            }
                                          />
                                          <FileText className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                                          <span
                                            className="truncate cursor-pointer"
                                            onClick={() => togglePageSelection(db.id, page.id)}
                                          >
                                            {page.title || "Untitled"}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </>
                                )}

                                <div className="pl-8 pt-2">
                                  <Button
                                    size="sm"
                                    className="w-full"
                                    disabled={selectedCount === 0}
                                    onClick={() => handleAnalyze(db.id)}
                                  >
                                    Analyze Selected ({selectedCount})
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ANALYZING VIEW */}
            {view === "analyzing" && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                <h3 className="text-lg font-medium mb-1">Analyzing pages with AI...</h3>
                <p className="text-muted-foreground max-w-xs mx-auto">
                  Extracting Client, Project details, and Milestones from your agreements.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Pending Automations Dialog */}
      <PendingAutomationsDialog
        open={pendingAutomationsDialogOpen}
        onClose={() => setPendingAutomationsDialogOpen(false)}
        onApproved={() => {
          setPendingAutomationsDialogOpen(false);
        }}
      />
    </>
  );
}

// Wrapper component that pre-populates the wizard via sessionStorage
function AiProjectWizardWithData({
  data,
  onSuccess,
  onBack,
}: {
  data: ExtractedData;
  onSuccess: () => void;
  onBack: () => void;
}) {
  useEffect(() => {
    // Pre-populate the wizard state via sessionStorage
    sessionStorage.setItem(
      "ai_wizard_state",
      JSON.stringify({
        data,
        step: "review",
      })
    );
  }, [data]);

  return <AiProjectWizard onSuccess={onSuccess} />;
}
