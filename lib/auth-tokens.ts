import crypto from "crypto";

export function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function addHours(date: Date, hours: number): Date {
  const copy = new Date(date);
  copy.setHours(copy.getHours() + hours);
  return copy;
}
