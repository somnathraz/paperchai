"use client";

import { useEffect } from "react";

const FONT_MAP: Record<string, string> = {
  Inter: "Inter:wght@400;500;600;700",
  Sora: "Sora:wght@400;500;600;700",
  Poppins: "Poppins:wght@400;500;600;700",
  Manrope: "Manrope:wght@400;500;600;700",
  "DM Sans": "DM+Sans:wght@400;500;600;700",
};

export function useFontLoader(fontFamily?: string) {
  useEffect(() => {
    if (!fontFamily || fontFamily === "Inter") return; // Inter is usually available by default

    const fontKey = FONT_MAP[fontFamily];
    if (!fontKey) return;

    // Check if font is already loaded
    const existingLink = document.querySelector(`link[data-font="${fontFamily}"]`);
    if (existingLink) return;

    // Load Google Font
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${fontKey}&display=swap`;
    link.setAttribute("data-font", fontFamily);
    document.head.appendChild(link);
  }, [fontFamily]);
}

export function getFontFamily(fontFamily?: string): string {
  if (!fontFamily || fontFamily === "Inter") {
    return "Inter, system-ui, -apple-system, sans-serif";
  }
  return `"${fontFamily}", Inter, system-ui, -apple-system, sans-serif`;
}

