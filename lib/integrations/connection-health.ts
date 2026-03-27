import { ConnectionStatus, IntegrationProvider } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const PROVIDER_AUTH_ERRORS: Record<IntegrationProvider, Set<string>> = {
  NOTION: new Set(["unauthorized", "invalid_grant", "invalid_token"]),
  SLACK: new Set([
    "invalid_auth",
    "account_inactive",
    "token_revoked",
    "not_authed",
    "missing_scope",
  ]),
};

function normalizeErrorCode(code?: string | null) {
  return String(code || "")
    .trim()
    .toLowerCase();
}

export function isProviderAuthError(provider: IntegrationProvider, code?: string | null) {
  const normalized = normalizeErrorCode(code);
  if (!normalized) return false;
  return PROVIDER_AUTH_ERRORS[provider]?.has(normalized) ?? false;
}

export function getReconnectMessage(provider: IntegrationProvider) {
  return `${provider === "SLACK" ? "Slack" : "Notion"} connection expired or was revoked. Reconnect from Settings > Integrations.`;
}

export async function markIntegrationConnectionError(args: {
  connectionId: string;
  provider: IntegrationProvider;
  reason?: string | null;
  status?: ConnectionStatus;
}) {
  await prisma.integrationConnection.update({
    where: { id: args.connectionId },
    data: {
      status: args.status ?? ConnectionStatus.ERROR,
      lastError: args.reason || getReconnectMessage(args.provider),
      lastErrorAt: new Date(),
      updatedAt: new Date(),
    },
  });
}

export async function clearIntegrationConnectionError(connectionId: string) {
  await prisma.integrationConnection.update({
    where: { id: connectionId },
    data: {
      lastError: null,
      lastErrorAt: null,
      updatedAt: new Date(),
    },
  });
}
