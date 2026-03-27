import { ensureActiveWorkspace } from "@/lib/workspace";
import { isWorkspaceApprover } from "@/lib/invoices/approval-routing";

export async function resolveIntegrationWorkspace(userId: string, userName?: string | null) {
  return ensureActiveWorkspace(userId, userName);
}

export async function requireIntegrationManager(userId: string, workspaceId: string) {
  return isWorkspaceApprover(workspaceId, userId);
}
