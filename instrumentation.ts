/**
 * Next.js instrumentation hook — runs once when the server starts.
 * Use this to validate required environment variables so the app
 * fails fast with a clear message instead of crashing mid-request.
 */
export async function register() {
  // Only validate in the Node.js runtime (not Edge)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const missing: string[] = [];
    const invalid: string[] = [];

    // Required for encryption of OAuth tokens
    const encKey = process.env.ENCRYPTION_KEY;
    if (!encKey) {
      missing.push("ENCRYPTION_KEY");
    } else if (encKey.length !== 64) {
      invalid.push("ENCRYPTION_KEY (must be 64 hex characters / 32 bytes)");
    }

    // Required for session signing
    if (!process.env.NEXTAUTH_SECRET) {
      missing.push("NEXTAUTH_SECRET");
    }

    // Required for database access
    if (!process.env.DATABASE_URL) {
      missing.push("DATABASE_URL");
    }

    // Required for AI features
    if (!process.env.GOOGLE_API_KEY) {
      // Warn but don't block — app works without AI if key is missing
      console.warn("[startup] GOOGLE_API_KEY is not set — AI features will be unavailable");
    }

    if (missing.length > 0) {
      console.error(`[startup] Missing required environment variables:\n  ${missing.join("\n  ")}`);
      // Throw in production so the deployment is rejected immediately
      if (process.env.NODE_ENV === "production") {
        throw new Error(`Server cannot start: missing env vars: ${missing.join(", ")}`);
      }
    }

    if (invalid.length > 0) {
      console.error(`[startup] Invalid environment variables:\n  ${invalid.join("\n  ")}`);
      if (process.env.NODE_ENV === "production") {
        throw new Error(`Server cannot start: invalid env vars: ${invalid.join(", ")}`);
      }
    }
  }
}
