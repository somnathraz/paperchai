"use client";
/* eslint-disable @next/next/no-img-element */

import { useState, useRef } from "react";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { motion } from "framer-motion";

type WorkspaceLogoUploadProps = {
  logo: string | null;
  onLogoChange: (logo: string | null) => void;
};

export function WorkspaceLogoUpload({ logo, onLogoChange }: WorkspaceLogoUploadProps) {
  const [preview, setPreview] = useState<string | null>(logo);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      alert("File size must be less than 2MB");
      return;
    }

    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setPreview(result);
      onLogoChange(result);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => {
    setDragging(false);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemove = () => {
    setPreview(null);
    onLogoChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-foreground">Workspace Logo</label>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
        className={`relative flex cursor-pointer items-center justify-center rounded-xl border-2 border-dashed transition ${
          dragging
            ? "border-primary bg-primary/5"
            : preview
            ? "border-border/70 bg-white/80"
            : "border-border/50 bg-slate-50/50 hover:border-primary/50 hover:bg-primary/5"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileSelect(file);
          }}
          className="hidden"
        />

        {preview ? (
          <div className="relative p-4">
            <img src={preview} alt="Workspace logo" className="h-20 w-20 rounded-lg object-cover" />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleRemove();
              }}
              className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white transition hover:bg-red-600"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 p-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Upload className="h-6 w-6 text-primary" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">Upload logo</p>
              <p className="text-xs text-muted-foreground">PNG, JPG — 2MB max</p>
            </div>
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground">Appears on invoices, reminders, and month-end recaps.</p>
    </div>
  );
}
