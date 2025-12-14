"use client";

import { Loader2, Upload, CheckCircle, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type UploadStepProps = {
    file: File | null;
    isExtracting: boolean;
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onExtract: () => void;
};

export function UploadStep({ file, isExtracting, onFileChange, onExtract }: UploadStepProps) {
    return (
        <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
            <div className="h-16 w-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6">
                <Upload className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Upload Project Brief or Contract
            </h3>
            <p className="text-sm text-slate-500 text-center max-w-md mb-8">
                Upload a PDF, Doc, or plain text file. Our AI will extract client details, project scope,
                billing terms, and milestones automatically.
            </p>

            <div className="w-full max-w-sm">
                <Input
                    type="file"
                    accept=".txt,.md,.json,.csv,.pdf"
                    onChange={onFileChange}
                    disabled={isExtracting}
                    className="mb-4 bg-white"
                />
                <Button
                    onClick={onExtract}
                    disabled={!file || isExtracting}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                >
                    {isExtracting ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Analyzing Document...
                        </>
                    ) : (
                        <>
                            <Wand2 className="mr-2 h-4 w-4" />
                            Analyze & Extract
                        </>
                    )}
                </Button>
            </div>

            <div className="mt-8 flex items-center gap-2 text-xs text-slate-400">
                <CheckCircle className="h-3 w-3" /> Secure Processing
                <span className="mx-1">•</span>
                <CheckCircle className="h-3 w-3" /> Human Review Required
            </div>
        </div>
    );
}
