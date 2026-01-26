/**
 * Document Upload Validation
 * ==========================
 * Validates uploaded files to prevent malicious content.
 */

import { z } from "zod";

// ================================================================
// FILE TYPE WHITELIST
// ================================================================

export const ALLOWED_FILE_TYPES = {
    images: ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"],
    documents: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    spreadsheets: ["application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "text/csv"],
} as const;

export const ALL_ALLOWED_TYPES = [
    ...ALLOWED_FILE_TYPES.images,
    ...ALLOWED_FILE_TYPES.documents,
    ...ALLOWED_FILE_TYPES.spreadsheets,
];

// ================================================================
// SIZE LIMITS (in bytes)
// ================================================================

export const FILE_SIZE_LIMITS = {
    image: 5 * 1024 * 1024,       // 5 MB
    document: 10 * 1024 * 1024,   // 10 MB
    logo: 2 * 1024 * 1024,        // 2 MB
    avatar: 1 * 1024 * 1024,      // 1 MB
} as const;

// ================================================================
// DANGEROUS FILE PATTERNS
// ================================================================

const DANGEROUS_PATTERNS = [
    // Executable content
    /\.(exe|dll|bat|cmd|sh|ps1|vbs|js|jar|msi|app|apk|deb|rpm)$/i,
    // Script injection in filenames
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    // Path traversal
    /\.\.\//,
    /\.\.\\/,
    // Null byte injection
    /\x00/,
];

// ================================================================
// PDF SECURITY CHECKS
// ================================================================

const PDF_DANGEROUS_PATTERNS = [
    // JavaScript in PDF
    /\/JavaScript/i,
    /\/JS\s/i,
    // Launch actions (can execute commands)
    /\/Launch/i,
    // GoToR (can open external files)
    /\/GoToR/i,
    // URI actions (can make network requests)
    /\/URI\s/i,
    // SubmitForm (can exfiltrate data)
    /\/SubmitForm/i,
    // ImportData
    /\/ImportData/i,
    // Embedded files (can contain malware)
    /\/EmbeddedFile/i,
    // OpenAction with suspicious content
    /\/OpenAction\s*<<[^>]*\/JavaScript/i,
];

// ================================================================
// VALIDATION FUNCTIONS
// ================================================================

/**
 * Validate filename is safe
 */
export function isFilenameSafe(filename: string): boolean {
    if (!filename || filename.length > 255) return false;

    for (const pattern of DANGEROUS_PATTERNS) {
        if (pattern.test(filename)) return false;
    }

    return true;
}

/**
 * Sanitize filename for storage
 */
export function sanitizeFilename(filename: string): string {
    return filename
        // Remove path separators
        .replace(/[\/\\]/g, "")
        // Remove dangerous characters
        .replace(/[<>:"|?*\x00-\x1F]/g, "_")
        // Remove leading/trailing dots and spaces
        .replace(/^[\s.]+|[\s.]+$/g, "")
        // Limit length
        .substring(0, 200);
}

/**
 * Check if MIME type matches file extension
 */
export function validateMimeType(filename: string, mimeType: string): boolean {
    const ext = filename.split(".").pop()?.toLowerCase();

    const mimeToExt: Record<string, string[]> = {
        "image/jpeg": ["jpg", "jpeg"],
        "image/png": ["png"],
        "image/gif": ["gif"],
        "image/webp": ["webp"],
        "image/svg+xml": ["svg"],
        "application/pdf": ["pdf"],
        "application/msword": ["doc"],
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ["docx"],
        "text/csv": ["csv"],
    };

    const allowedExts = mimeToExt[mimeType];
    if (!allowedExts) return false;

    return allowedExts.includes(ext || "");
}

/**
 * Scan PDF content for dangerous patterns
 * Note: This is a basic check. For production, consider using a proper PDF scanner.
 */
export function scanPdfContent(content: ArrayBuffer): {
    safe: boolean;
    threats: string[];
} {
    const threats: string[] = [];

    // Convert first 50KB to string for pattern matching
    const bytes = new Uint8Array(content.slice(0, 50000));
    const text = new TextDecoder("latin1").decode(bytes);

    for (const pattern of PDF_DANGEROUS_PATTERNS) {
        if (pattern.test(text)) {
            threats.push(pattern.source);
        }
    }

    return {
        safe: threats.length === 0,
        threats,
    };
}

/**
 * Validate file upload
 */
export function validateFileUpload(
    file: File,
    options: {
        allowedTypes?: string[];
        maxSize?: number;
        scanPdf?: boolean;
    } = {}
): {
    valid: boolean;
    error?: string;
} {
    const {
        allowedTypes = ALL_ALLOWED_TYPES,
        maxSize = FILE_SIZE_LIMITS.document,
        scanPdf = true,
    } = options;

    // Check filename
    if (!isFilenameSafe(file.name)) {
        return { valid: false, error: "Invalid filename" };
    }

    // Check MIME type
    if (!allowedTypes.includes(file.type)) {
        return { valid: false, error: `File type ${file.type} not allowed` };
    }

    // Check extension matches MIME type
    if (!validateMimeType(file.name, file.type)) {
        return { valid: false, error: "File extension does not match type" };
    }

    // Check size
    if (file.size > maxSize) {
        const maxMB = Math.round(maxSize / 1024 / 1024);
        return { valid: false, error: `File too large (max ${maxMB}MB)` };
    }

    return { valid: true };
}

// ================================================================
// ZOD SCHEMA FOR FILE UPLOAD
// ================================================================

export const fileUploadSchema = z.object({
    filename: z.string()
        .max(255)
        .refine(isFilenameSafe, "Invalid filename"),
    mimeType: z.string()
        .refine((type) => ALL_ALLOWED_TYPES.includes(type as any), "File type not allowed"),
    size: z.number()
        .max(FILE_SIZE_LIMITS.document, "File too large"),
});

export const imageUploadSchema = z.object({
    filename: z.string()
        .max(255)
        .refine(isFilenameSafe, "Invalid filename"),
    mimeType: z.string()
        .refine((type) => ALLOWED_FILE_TYPES.images.includes(type as any), "Only images allowed"),
    size: z.number()
        .max(FILE_SIZE_LIMITS.image, "Image too large (max 5MB)"),
});

export const logoUploadSchema = z.object({
    filename: z.string()
        .max(255)
        .refine(isFilenameSafe, "Invalid filename"),
    mimeType: z.string()
        .refine((type) => ["image/jpeg", "image/png", "image/webp"].includes(type), "Only JPG, PNG, WebP allowed"),
    size: z.number()
        .max(FILE_SIZE_LIMITS.logo, "Logo too large (max 2MB)"),
});
