export function getAppBaseUrl(): string {
  const raw = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || "http://localhost:3000";
  const normalized =
    raw.startsWith("http://") || raw.startsWith("https://") ? raw : `https://${raw}`;
  return normalized.replace(/\/+$/, "");
}

export function buildAppUrl(path: string): string {
  const safePath = path.startsWith("/") ? path : `/${path}`;
  return `${getAppBaseUrl()}${safePath}`;
}
