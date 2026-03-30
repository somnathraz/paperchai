import { prisma } from "@/lib/prisma";

export async function generateWorkspaceInvoiceNumber(workspaceId: string): Promise<string> {
  const count = await prisma.invoice.count({ where: { workspaceId } });
  let candidate = `INV-${String(count + 1).padStart(4, "0")}`;

  const existing = await prisma.invoice.findFirst({
    where: { workspaceId, number: candidate },
    select: { id: true },
  });

  if (!existing) {
    return candidate;
  }

  return `INV-${Date.now().toString(36).toUpperCase()}`;
}
