"use client";

import { useState, useEffect } from "react";
import { Database, Loader2, CheckCircle, AlertCircle, RefreshCw, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NotionDatabase {
  id: string;
  title: string;
  propertyCount: number;
}

interface ImportResult {
  success: boolean;
  message: string;
  count?: number;
}

export function NotionImportPanel() {
  const [databases, setDatabases] = useState<NotionDatabase[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, ImportResult>>({});

  useEffect(() => {
    fetchDatabases();
  }, []);

  async function fetchDatabases() {
    try {
      const res = await fetch("/api/integrations/notion/databases");
      if (!res.ok) throw new Error("Failed to fetch databases");
      const data = await res.json();

      const formatted =
        data.results?.map((db: any) => ({
          id: db.id,
          title: db.title?.[0]?.plain_text || "Untitled",
          propertyCount: Object.keys(db.properties || {}).length,
        })) || [];

      setDatabases(formatted);
    } catch (error) {
      console.error("Error fetching databases:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleImport(databaseId: string, importType: "clients" | "projects") {
    setImporting(databaseId);
    setResults({ ...results, [databaseId]: { success: false, message: "Importing..." } });

    try {
      const res = await fetch(`/api/integrations/notion/import/${importType}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ databaseId, allowDuplicates: false }),
      });

      const data = await res.json();

      if (res.ok) {
        setResults({
          ...results,
          [databaseId]: {
            success: true,
            message: data.message || `Imported ${data.count || 0} ${importType}`,
            count: data.count,
          },
        });
      } else {
        setResults({
          ...results,
          [databaseId]: {
            success: false,
            message: data.error || "Import failed",
          },
        });
      }
    } catch (error) {
      setResults({
        ...results,
        [databaseId]: {
          success: false,
          message: "Network error",
        },
      });
    } finally {
      setImporting(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
      </div>
    );
  }

  if (databases.length === 0) {
    return (
      <div className="text-center py-8 text-stone-500">
        <Database className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="text-sm">No databases found in your Notion workspace</p>
        <p className="text-xs mt-1">Make sure your integration has access to databases</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Available Databases ({databases.length})</h3>
        <Button variant="outline" size="sm" onClick={fetchDatabases} disabled={loading}>
          <RefreshCw className="w-3 h-3 mr-1" />
          Refresh
        </Button>
      </div>

      <div className="space-y-3">
        {databases.map((db) => {
          const result = results[db.id];
          const isImporting = importing === db.id;

          return (
            <div
              key={db.id}
              className="border border-stone-200 dark:border-stone-800 rounded-lg p-4 bg-white dark:bg-stone-900/50"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Database className="w-4 h-4 text-stone-400" />
                    <h4 className="font-medium text-sm">{db.title}</h4>
                  </div>
                  <p className="text-xs text-stone-500">{db.propertyCount} properties</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleImport(db.id, "clients")}
                  disabled={isImporting}
                >
                  {isImporting ? (
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  ) : (
                    <Download className="w-3 h-3 mr-1" />
                  )}
                  Import as Clients
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleImport(db.id, "projects")}
                  disabled={isImporting}
                >
                  {isImporting ? (
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  ) : (
                    <Download className="w-3 h-3 mr-1" />
                  )}
                  Import as Projects
                </Button>
              </div>

              {result && (
                <div
                  className={`mt-3 p-2 rounded text-xs flex items-center gap-2 ${
                    result.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                  }`}
                >
                  {result.success ? (
                    <CheckCircle className="w-3 h-3" />
                  ) : (
                    <AlertCircle className="w-3 h-3" />
                  )}
                  {result.message}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
