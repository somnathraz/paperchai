
"use client";

import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Loader2, CheckCircle, AlertCircle, Upload } from "lucide-react";
import { toast } from "sonner";
import { useProjects } from "../hooks/useProjects";

export function DocumentsPanel({ documents, projectId }: { documents: any[], projectId: string }) {
    const { fetchProject } = useProjects();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type (PDFs, images, docs)
        const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        if (!allowedTypes.includes(file.type)) {
            toast.error("Unsupported file type", {
                description: "Please upload PDF, images, or Word documents."
            });
            return;
        }

        setIsUploading(true);
        try {
            // Convert to base64 for upload
            const base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            const res = await fetch(`/api/projects/${projectId}/documents`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    fileName: file.name,
                    fileType: file.type,
                    fileData: base64,
                    sourceType: "UPLOAD"
                })
            });

            if (!res.ok) throw new Error("Upload failed");

            toast.success("Document uploaded!", {
                description: "AI analysis will begin shortly."
            });

            // Refresh project data to show new document
            fetchProject(projectId);

        } catch (error) {
            toast.error("Failed to upload document");
        } finally {
            setIsUploading(false);
            // Reset input
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    return (
        <Card>
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Project Documents</CardTitle>
                    <div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                        >
                            {isUploading ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <Upload className="h-4 w-4 mr-2" />
                            )}
                            Upload Document
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {documents.length === 0 ? (
                        <div className="text-center py-8">
                            <FileText className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                            <p className="text-slate-500">No documents uploaded.</p>
                            <p className="text-sm text-slate-400 mt-1">Upload contracts, proposals, or other project files.</p>
                        </div>
                    ) : (
                        documents.map((doc: any) => (
                            <div key={doc.id} className="flex items-start justify-between border p-3 rounded-lg hover:bg-slate-50 transition-colors">
                                <div className="flex gap-3">
                                    <div className="p-2 bg-slate-100 rounded text-slate-500">
                                        <FileText className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-slate-900">{doc.fileName}</p>
                                        <p className="text-xs text-slate-500">{new Date(doc.createdAt).toLocaleDateString()} • {doc.sourceType}</p>
                                        {doc.aiSummary && (
                                            <p className="text-sm text-slate-600 mt-1 bg-slate-50 p-2 rounded border border-slate-100">
                                                AI Summary: {doc.aiSummary}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    {doc.aiStatus === 'PENDING' && <Badge variant="outline" className="text-yellow-600 bg-yellow-50"><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Processing</Badge>}
                                    {doc.aiStatus === 'PROCESSED' && <Badge variant="outline" className="text-green-600 bg-green-50"><CheckCircle className="h-3 w-3 mr-1" /> Analyzed</Badge>}
                                    {doc.aiStatus === 'FAILED' && <Badge variant="destructive" className="bg-red-50 text-red-600 border-red-200"><AlertCircle className="h-3 w-3 mr-1" /> Failed</Badge>}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
