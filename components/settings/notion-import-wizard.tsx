"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    Loader2, CheckCircle2, AlertCircle, ArrowRight, Settings2,
    Database, Table, Zap, FileSpreadsheet, ChevronRight, Check,
    RefreshCw, User as UserIcon, Folder as FolderIcon, FileText as FileTextIcon, StickyNote as StickyNoteIcon
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Step = "type" | "database" | "mapping" | "preview" | "automation" | "importing" | "success";
type ImportType = "CLIENT" | "PROJECT" | "AGREEMENT" | "MEETING_NOTE";

interface Database {
    id: string;
    title: Array<{ plain_text: string }>;
    properties: Record<string, any>;
}

export function NotionImportWizard({ onClose }: { onClose: () => void }) {
    const router = useRouter();
    const [step, setStep] = useState<Step>("type");
    const [importType, setImportType] = useState<ImportType | null>(null);
    const [databases, setDatabases] = useState<Database[]>([]);
    const [selectedDb, setSelectedDb] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [previewData, setPreviewData] = useState<any[]>([]);

    // Field mapping state
    const [mapping, setMapping] = useState<Record<string, string>>({});
    const [availableProps, setAvailableProps] = useState<string[]>([]);

    // Automation settings
    const [autoSync, setAutoSync] = useState(false);
    const [autoDraft, setAutoDraft] = useState(false);

    // Stats
    const [importStats, setImportStats] = useState<{ imported: number; skipped: number } | null>(null);

    useEffect(() => {
        // Fetch databases on mount
        fetchDatabases();
    }, []);

    const fetchDatabases = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/integrations/notion/databases");
            const data = await res.json();
            if (data.results) {
                setDatabases(data.results);
            }
        } catch (err) {
            setError("Failed to load Notion databases");
        } finally {
            setLoading(false);
        }
    };

    const handleDbSelect = (dbId: string) => {
        setSelectedDb(dbId);
        const db = databases.find(d => d.id === dbId);
        if (db) {
            setAvailableProps(Object.keys(db.properties));
            // Smart defaults based on import type
            const defaults: Record<string, string> = {};
            if (importType === "CLIENT") {
                defaults.name = findProp(db.properties, ["Name", "Client Name", "Client"]);
                defaults.email = findProp(db.properties, ["Email", "Contact Email"]);
                defaults.phone = findProp(db.properties, ["Phone", "Mobile"]);
                defaults.taxId = findProp(db.properties, ["GSTIN", "Tax ID", "VAT"]);
            } else if (importType === "PROJECT") {
                defaults.name = findProp(db.properties, ["Name", "Project Name", "Title"]);
                defaults.client = findProp(db.properties, ["Client", "Customer"]);
                defaults.rate = findProp(db.properties, ["Rate", "Budget", "Amount"]);
                defaults.status = findProp(db.properties, ["Status", "State"]);
            }
            setMapping(defaults);
        }
    };

    const findProp = (props: Record<string, any>, candidates: string[]) => {
        return candidates.find(c => props[c]) || "";
    };

    const loadPreview = async () => {
        if (!importType || !selectedDb) return;
        setLoading(true);
        setError(null);

        const endpointMap = {
            CLIENT: "/api/integrations/notion/import/clients",
            PROJECT: "/api/integrations/notion/import/projects",
            AGREEMENT: "/api/integrations/notion/import/agreements",
            MEETING_NOTE: "/api/integrations/notion/import/notes"
        };

        try {
            const res = await fetch(endpointMap[importType], {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    databaseId: selectedDb,
                    fieldMapping: mapping,
                    preview: true
                })
            });
            const data = await res.json();
            if (data.success && data.preview) {
                setPreviewData(data.data);
                setStep("preview");
            } else {
                setError(data.error || "Failed to load preview");
            }
        } catch (err) {
            setError("Failed to generate preview");
        } finally {
            setLoading(false);
        }
    };

    const runImport = async () => {
        if (!importType || !selectedDb) return;
        setStep("importing");
        setLoading(true);

        const endpointMap = {
            CLIENT: "/api/integrations/notion/import/clients",
            PROJECT: "/api/integrations/notion/import/projects",
            AGREEMENT: "/api/integrations/notion/import/agreements",
            MEETING_NOTE: "/api/integrations/notion/import/notes"
        };

        try {
            const res = await fetch(endpointMap[importType], {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    databaseId: selectedDb,
                    fieldMapping: mapping,
                    preview: false
                })
            });
            const data = await res.json();
            if (data.success) {
                setImportStats({ imported: data.imported, skipped: data.skipped });
                setStep("success");
            } else {
                setError(data.error || "Import failed");
                setStep("preview"); // Go back
            }
        } catch (err) {
            setError("Import failed");
            setStep("preview");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-stone-900 w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden border border-stone-200 dark:border-stone-800 flex flex-col max-h-[90vh]"
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-stone-200 dark:border-stone-800 flex justify-between items-center bg-stone-50 dark:bg-stone-900/50">
                    <div>
                        <h2 className="text-lg font-semibold text-stone-900 dark:text-white">Import from Notion</h2>
                        <p className="text-sm text-stone-500 dark:text-stone-400">Step {getStepNumber(step)} of 4</p>
                    </div>
                    <button onClick={onClose} className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200">
                        ✕
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <AnimatePresence mode="wait">
                        {step === "type" && (
                            <motion.div
                                key="type"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-4"
                            >
                                <h3 className="text-lg font-medium mb-4">What would you like to import?</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    {[
                                        { id: "CLIENT", label: "Clients", icon: UserIcon, desc: "Import client CRM data" },
                                        { id: "PROJECT", label: "Projects", icon: FolderIcon, desc: "Import projects & status" },
                                        { id: "AGREEMENT", label: "Agreements", icon: FileTextIcon, desc: "SOWs & Contracts" },
                                        { id: "MEETING_NOTE", label: "Meeting Notes", icon: StickyNoteIcon, desc: "Sync meeting summaries" }
                                    ].map((type) => (
                                        <button
                                            key={type.id}
                                            onClick={() => {
                                                setImportType(type.id as ImportType);
                                                setStep("database");
                                            }}
                                            className="flex flex-col items-center p-6 border rounded-xl hover:bg-stone-50 dark:hover:bg-stone-800/50 hover:border-violet-500 transition-all text-center gap-3 group"
                                        >
                                            <div className="p-3 bg-stone-100 dark:bg-stone-800 rounded-full group-hover:bg-violet-100 dark:group-hover:bg-violet-900/30 group-hover:text-violet-600 transition-colors">
                                                <type.icon className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <div className="font-semibold">{type.label}</div>
                                                <div className="text-xs text-stone-500">{type.desc}</div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {step === "database" && (
                            <motion.div
                                key="database"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div>
                                    <h3 className="text-lg font-medium mb-2">Select Source Database</h3>
                                    <p className="text-sm text-stone-500 mb-4">Choose the Notion database containing your {importType?.toLowerCase()}s.</p>

                                    {loading ? (
                                        <div className="flex items-center justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-stone-400" /></div>
                                    ) : (
                                        <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-2">
                                            {databases.map(db => (
                                                <button
                                                    key={db.id}
                                                    onClick={() => handleDbSelect(db.id)}
                                                    className={`w-full text-left px-4 py-3 rounded-md flex items-center gap-3 transition-colors ${selectedDb === db.id ? "bg-violet-50 dark:bg-violet-900/20 border-violet-200" : "hover:bg-stone-50 dark:hover:bg-stone-800"}`}
                                                >
                                                    <Database className="w-4 h-4 text-stone-400" />
                                                    <span className="truncate flex-1">
                                                        {db.title?.[0]?.plain_text || "Untitled Database"}
                                                    </span>
                                                    {selectedDb === db.id && <Check className="w-4 h-4 text-violet-600" />}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {selectedDb && (
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-medium">Map Properties</h3>
                                        <div className="grid gap-3">
                                            {Object.keys(importType === "CLIENT" ? { name: "", email: "", phone: "", taxId: "" } : { name: "", client: "", rate: "", status: "" }).map(field => (
                                                <div key={field} className="grid grid-cols-2 gap-4 items-center">
                                                    <label className="text-sm font-medium text-stone-600 dark:text-stone-400 capitalize">{field}</label>
                                                    <select
                                                        value={mapping[field] || ""}
                                                        onChange={(e) => setMapping(prev => ({ ...prev, [field]: e.target.value }))}
                                                        className="text-sm border rounded-md p-2 bg-transparent"
                                                    >
                                                        <option value="">Select Property...</option>
                                                        {availableProps.map(p => (
                                                            <option key={p} value={p}>{p}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {step === "preview" && (
                            <motion.div
                                key="preview"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div>
                                    <h3 className="text-lg font-medium mb-2">Preview Data</h3>
                                    <p className="text-sm text-stone-500 mb-4">Review how your Notion data maps to PaperChai.</p>

                                    <div className="border rounded-lg overflow-hidden">
                                        <table className="w-full text-sm">
                                            <thead className="bg-stone-50 dark:bg-stone-800 text-stone-500">
                                                <tr>
                                                    {Object.keys(mapping).map(k => <th key={k} className="px-4 py-2 text-left font-medium capitalize">{k}</th>)}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {previewData.map((row, i) => (
                                                    <tr key={i} className="hover:bg-stone-50/50">
                                                        {Object.keys(mapping).map(k => (
                                                            <td key={k} className="px-4 py-2 text-stone-700 dark:text-stone-300">
                                                                {row.mapped[k] || <span className="text-stone-300 italic">Empty</span>}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {step === "automation" && (
                            <motion.div
                                key="automation"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div className="text-center py-6">
                                    <div className="w-16 h-16 bg-violet-100 text-violet-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Zap className="w-8 h-8" />
                                    </div>
                                    <h3 className="text-xl font-bold mb-2">Supercharge your Import</h3>
                                    <p className="text-stone-500 max-w-md mx-auto">Importing is just the start. Enable automations to keep PaperChai in sync with Notion.</p>
                                </div>

                                <div className="space-y-4">
                                    <div className="border rounded-xl p-4 flex items-start gap-4 hover:border-violet-300 transition-colors p-4">
                                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                            <RefreshCw className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-center mb-1">
                                                <h4 className="font-medium">Auto-Sync Daily</h4>
                                                <Toggle checked={autoSync} onChange={setAutoSync} />
                                            </div>
                                            <p className="text-sm text-stone-500">Automatically check for new {importType?.toLowerCase()}s every 24 hours.</p>
                                            <div className="mt-2 text-xs bg-amber-100 text-amber-800 inline-block px-2 py-0.5 rounded-full font-medium">Premium Feature</div>
                                        </div>
                                    </div>

                                    {importType === "PROJECT" && (
                                        <div className="border rounded-xl p-4 flex items-start gap-4">
                                            <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                                                <FileSpreadsheet className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-center mb-1">
                                                    <h4 className="font-medium">Draft on Status Change</h4>
                                                    <Toggle checked={autoDraft} onChange={setAutoDraft} />
                                                </div>
                                                <p className="text-sm text-stone-500">Automatically draft an invoice when Notion status changes to &quot;Ready to Bill&quot;.</p>
                                                <div className="mt-2 text-xs bg-amber-100 text-amber-800 inline-block px-2 py-0.5 rounded-full font-medium">Premium Feature</div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {step === "importing" && (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <Loader2 className="w-12 h-12 text-violet-600 animate-spin mb-4" />
                                <h3 className="text-lg font-medium mb-2">Importing from Notion...</h3>
                                <p className="text-stone-500">This might take a moment depending on database size.</p>
                            </div>
                        )}

                        {step === "success" && (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                                    <CheckCircle2 className="w-8 h-8" />
                                </div>
                                <h3 className="text-xl font-bold mb-2">Import Complete!</h3>
                                <p className="text-stone-500 mb-6">Successfully imported {importStats?.imported ?? 0} items. {(importStats?.skipped ?? 0) > 0 && `Skipped ${importStats?.skipped}.`}</p>
                                <button
                                    onClick={onClose}
                                    className="bg-stone-900 text-white px-6 py-2 rounded-lg hover:bg-stone-800"
                                >
                                    Done
                                </button>
                            </div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Footer */}
                {step !== "importing" && step !== "success" && (
                    <div className="px-6 py-4 border-t border-stone-200 dark:border-stone-800 flex justify-between bg-stone-50 dark:bg-stone-900/50">
                        <button
                            onClick={() => {
                                if (step === "type") onClose();
                                else if (step === "database") setStep("type");
                                else if (step === "preview") setStep("database");
                                else if (step === "automation") setStep("preview");
                            }}
                            className="px-4 py-2 text-stone-600 hover:text-stone-900"
                        >
                            {step === "type" ? "Cancel" : "Back"}
                        </button>

                        <button
                            disabled={!canProceed()}
                            onClick={() => {
                                if (step === "type") setStep("database");
                                else if (step === "database") loadPreview();
                                else if (step === "preview") setStep("automation");
                                else if (step === "automation") runImport();
                            }}
                            className={`px-6 py-2 rounded-lg font-medium flex items-center gap-2 ${canProceed() ? "bg-violet-600 text-white hover:bg-violet-700" : "bg-stone-200 text-stone-400 cursor-not-allowed"}`}
                        >
                            {step === "automation" ? "Start Import" : "Continue"}
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {error && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-100 text-red-700 px-4 py-2 rounded-full text-sm flex items-center gap-2 shadow-lg">
                        <AlertCircle className="w-4 h-4" /> {error}
                    </div>
                )}
            </motion.div>
        </div>
    );

    function canProceed() {
        if (step === "type") return !!importType;
        if (step === "database") return !!selectedDb;
        if (step === "preview") return true;
        if (step === "automation") return true;
        return false;
    }
}

function getStepNumber(s: Step) {
    if (s === "type") return 1;
    if (s === "database") return 2;
    if (s === "preview" || s === "automation") return 3;
    return 4;
}

function Toggle({ checked, onChange }: { checked: boolean, onChange: (v: boolean) => void }) {
    return (
        <button
            onClick={() => onChange(!checked)}
            className={`w-11 h-6 flex items-center rounded-full transition-colors ${checked ? "bg-violet-600" : "bg-stone-300"}`}
        >
            <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`} />
        </button>
    )
}
