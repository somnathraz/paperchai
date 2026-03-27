/**
 * Document Text Extraction Pipeline
 * ==================================
 * OWASP-compliant: Extract TEXT ONLY from documents.
 * Never send raw PDF/doc content directly to LLM.
 *
 * Pipeline: Upload → Validate → Text Extract → Sanitize → Cache
 */

import crypto from "crypto";
import { sanitizeForLlm, removeInvisibleUnicode } from "./ai-prompt-security";

// ================================================================
// TIER-BASED CONFIGURATION
// ================================================================

export type ExtractionTier = "FREE" | "PREMIUM" | "PREMIER";

export const EXTRACTION_LIMITS: Record<
  ExtractionTier,
  {
    maxFileSizeBytes: number;
    maxPdfPages: number;
    maxTextLength: number;
  }
> = {
  FREE: {
    maxFileSizeBytes: 5 * 1024 * 1024, // 5 MB
    maxPdfPages: 20,
    maxTextLength: 20000, // ~5,000 tokens
  },
  PREMIUM: {
    maxFileSizeBytes: 15 * 1024 * 1024, // 15 MB
    maxPdfPages: 50,
    maxTextLength: 50000, // ~12,500 tokens
  },
  PREMIER: {
    maxFileSizeBytes: 25 * 1024 * 1024, // 25 MB
    maxPdfPages: 100,
    maxTextLength: 100000, // ~25,000 tokens
  },
};

export const EXTRACTION_CONFIG = {
  // Timeouts
  extractionTimeoutMs: 30000, // 30 seconds

  // Allowed types for text extraction
  allowedMimeTypes: ["application/pdf", "text/plain", "text/markdown", "text/csv"],
} as const;

// ================================================================
// TYPES
// ================================================================

export interface ExtractedDocument {
  id: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  textContent: string;
  textHash: string;
  pageCount?: number;
  extractedAt: Date;
  metadata: {
    hadInvisibleChars: boolean;
    originalTextLength: number;
    truncated: boolean;
  };
}

export interface ExtractionResult {
  success: boolean;
  document?: ExtractedDocument;
  error?: string;
  errorCode?:
    | "FILE_TOO_LARGE"
    | "UNSUPPORTED_TYPE"
    | "EXTRACTION_FAILED"
    | "TIMEOUT"
    | "MALICIOUS_CONTENT";
}

// ================================================================
// PDF TEXT EXTRACTION (Using pdf-parse)
// ================================================================

/**
 * Extract text from PDF using pdf-parse library.
 * Handles modern PDFs with compressed streams and complex encodings.
 */
async function extractTextFromPdfBuffer(buffer: Buffer): Promise<string> {
  try {
    // pdf-parse v1.x exports a function directly
    console.log("[PDF Extract] CWD:", process.cwd());
    const pdfParse = require("pdf-parse");
    const data = await pdfParse(buffer);

    console.log(`[PDF Extract] Extracted ${data.text.length} chars from ${data.numpages} pages`);
    return data.text;
  } catch (error) {
    console.error("[PDF Extract] pdf-parse failed, falling back to regex:", error);
    // Fallback to basic regex extraction (for simple PDFs)
    return extractTextFromPdfBufferFallback(buffer);
  }
}

/**
 * Fallback: Extract text from PDF using basic regex patterns.
 * Only used if pdf-parse fails.
 */
function extractTextFromPdfBufferFallback(buffer: Buffer): string {
  const content = buffer.toString("latin1");
  const textParts: string[] = [];

  // Extract text between BT (begin text) and ET (end text) markers
  const textRegex = /BT[\s\S]*?ET/g;
  const matches = content.match(textRegex) || [];

  for (const match of matches) {
    // Extract text from Tj and TJ operators
    const tjRegex = /\(([^)]*)\)\s*Tj/g;
    let tjMatch;
    while ((tjMatch = tjRegex.exec(match)) !== null) {
      textParts.push(tjMatch[1]);
    }

    // Extract text from TJ arrays
    const tjArrayRegex = /\[(.*?)\]\s*TJ/g;
    let tjArrayMatch;
    while ((tjArrayMatch = tjArrayRegex.exec(match)) !== null) {
      const items = tjArrayMatch[1].match(/\(([^)]*)\)/g) || [];
      for (const item of items) {
        textParts.push(item.slice(1, -1));
      }
    }
  }

  const result = textParts.join(" ");
  console.log(`[PDF Extract Fallback] Extracted ${result.length} chars`);
  return result;
}

/**
 * Extract plain text content from various file types.
 * TEXT ONLY - no images, no embedded objects.
 */
export async function extractTextFromBuffer(
  buffer: Buffer,
  mimeType: string,
  filename: string,
  tier: ExtractionTier = "FREE"
): Promise<ExtractionResult> {
  const startTime = Date.now();
  const limits = EXTRACTION_LIMITS[tier];

  try {
    // 1. Size check (tier-based)
    if (buffer.length > limits.maxFileSizeBytes) {
      const maxMB = Math.round(limits.maxFileSizeBytes / 1024 / 1024);
      return {
        success: false,
        error: `File too large (max ${maxMB}MB for ${tier} tier)`,
        errorCode: "FILE_TOO_LARGE",
      };
    }

    // 2. Type check
    if (!EXTRACTION_CONFIG.allowedMimeTypes.includes(mimeType as any)) {
      return {
        success: false,
        error: `Unsupported file type: ${mimeType}`,
        errorCode: "UNSUPPORTED_TYPE",
      };
    }

    // 3. Extract text based on type
    let rawText: string;
    let pageCount: number | undefined;

    switch (mimeType) {
      case "text/plain":
      case "text/markdown":
      case "text/csv":
        rawText = buffer.toString("utf-8");
        break;

      case "application/pdf":
        rawText = await extractTextFromPdfBuffer(buffer);
        // Estimate page count from PDF markers
        const pageMatches = buffer.toString("latin1").match(/\/Type\s*\/Page[^s]/g);
        pageCount = pageMatches?.length || 1;

        // Page limit check (tier-based)
        if (pageCount > limits.maxPdfPages) {
          return {
            success: false,
            error: `PDF has too many pages (max ${limits.maxPdfPages} for ${tier} tier)`,
            errorCode: "FILE_TOO_LARGE",
          };
        }
        break;

      default:
        return {
          success: false,
          error: `Cannot extract text from ${mimeType}`,
          errorCode: "UNSUPPORTED_TYPE",
        };
    }

    // 4. Check timeout
    if (Date.now() - startTime > EXTRACTION_CONFIG.extractionTimeoutMs) {
      return {
        success: false,
        error: "Extraction timed out",
        errorCode: "TIMEOUT",
      };
    }

    // 5. Clean invisible unicode
    const { cleaned, hadSuspiciousChars } = removeInvisibleUnicode(rawText);

    // 6. Sanitize for LLM (tier-based text length)
    const sanitized = sanitizeForLlm(cleaned, limits.maxTextLength);

    // 7. Generate hash for caching
    const textHash = crypto.createHash("sha256").update(sanitized).digest("hex").substring(0, 32);

    // 8. Generate document ID
    const docId = `doc_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

    const document: ExtractedDocument = {
      id: docId,
      originalFilename: filename,
      mimeType,
      sizeBytes: buffer.length,
      textContent: sanitized,
      textHash,
      pageCount,
      extractedAt: new Date(),
      metadata: {
        hadInvisibleChars: hadSuspiciousChars,
        originalTextLength: rawText.length,
        truncated: rawText.length > limits.maxTextLength,
      },
    };

    return { success: true, document };
  } catch (error) {
    console.error("[EXTRACTION] Failed:", error);
    return {
      success: false,
      error: "Text extraction failed",
      errorCode: "EXTRACTION_FAILED",
    };
  }
}

/**
 * Extract text from File object (browser/API upload)
 */
export async function extractTextFromFile(
  file: File,
  tier: ExtractionTier = "FREE"
): Promise<ExtractionResult> {
  const buffer = Buffer.from(await file.arrayBuffer());
  return extractTextFromBuffer(buffer, file.type, file.name, tier);
}
