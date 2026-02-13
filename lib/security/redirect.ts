import { NextRequest } from "next/server";

/**
 * Allow only same-origin relative redirects to avoid open redirect attacks.
 */
export function buildSafeAppRedirect(
  request: NextRequest,
  candidatePath: string | undefined,
  fallbackPath: string
): URL {
  const fallback = fallbackPath.startsWith("/") ? fallbackPath : `/${fallbackPath}`;

  if (!candidatePath) {
    return new URL(fallback, request.url);
  }

  // Only allow absolute-path redirects ("/dashboard"), block full URLs.
  if (!candidatePath.startsWith("/") || candidatePath.startsWith("//")) {
    return new URL(fallback, request.url);
  }

  return new URL(candidatePath, request.url);
}
