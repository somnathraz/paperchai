/**
 * Token Encryption Utilities
 * 
 * Provides AES-256-GCM encryption for OAuth tokens before storing in database.
 * Uses environment variable ENCRYPTION_KEY for encryption/decryption.
 */

import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16; // For GCM mode
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 64;

/**
 * Get encryption key from environment variable
 * Key must be 32 bytes (64 hex characters)
 */
function getEncryptionKey(): Buffer {
    const key = process.env.ENCRYPTION_KEY;

    if (!key) {
        throw new Error("ENCRYPTION_KEY environment variable is not set");
    }

    if (key.length !== 64) {
        throw new Error("ENCRYPTION_KEY must be 64 hex characters (32 bytes)");
    }

    return Buffer.from(key, "hex");
}

/**
 * Encrypt a string (e.g., OAuth token)
 * Returns encrypted string in format: iv:authTag:encrypted
 */
export function encrypt(text: string): string {
    if (!text) {
        throw new Error("Cannot encrypt empty text");
    }

    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");

    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:encrypted
    return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

/**
 * Decrypt an encrypted string
 * Expects format: iv:authTag:encrypted
 */
export function decrypt(encryptedText: string): string {
    if (!encryptedText) {
        throw new Error("Cannot decrypt empty text");
    }

    const key = getEncryptionKey();
    const parts = encryptedText.split(":");

    if (parts.length !== 3) {
        throw new Error("Invalid encrypted text format");
    }

    const iv = Buffer.from(parts[0], "hex");
    const authTag = Buffer.from(parts[1], "hex");
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
}

/**
 * Generate a random encryption key (for initial setup)
 * Returns a 64-character hex string (32 bytes)
 */
export function generateEncryptionKey(): string {
    return crypto.randomBytes(32).toString("hex");
}

/**
 * Hash a string using SHA-256 (for non-reversible hashing)
 * Useful for webhook signature verification
 */
export function hash(text: string): string {
    return crypto.createHash("sha256").update(text).digest("hex");
}

/**
 * Create HMAC signature (for webhook verification)
 */
export function createHmacSignature(text: string, secret: string): string {
    return crypto.createHmac("sha256", secret).update(text).digest("hex");
}

/**
 * Verify HMAC signature
 */
export function verifyHmacSignature(
    text: string,
    signature: string,
    secret: string
): boolean {
    const expectedSignature = createHmacSignature(text, secret);
    return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
    );
}
