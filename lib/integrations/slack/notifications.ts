import { prisma } from "@/lib/prisma";
import { decrypt, hash } from "@/lib/encryption";
import { postMessage } from "@/lib/slack-client";

type SlackApprovalNotificationInput = {
  workspaceId: string;
  invoiceId: string;
  status: "APPROVED" | "REJECTED";
  text: string;
  responseUrl?: string;
  channelId?: string;
  threadTs?: string;
};

async function postToResponseUrl(responseUrl: string, payload: Record<string, unknown>) {
  const response = await fetch(responseUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Slack response_url returned ${response.status}`);
  }
}

export async function notifySlackApprovalResult(
  input: SlackApprovalNotificationInput
): Promise<void> {
  const { workspaceId, invoiceId, status, text, responseUrl, channelId, threadTs } = input;

  const metadata = {
    invoiceId,
    status,
    channelId,
    threadTs,
  };

  const payload = {
    response_type: "ephemeral",
    replace_original: false,
    text,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text,
        },
      },
    ],
  };

  const logBase = {
    workspaceId,
    provider: "SLACK" as const,
    targetExternalId: channelId || "response_url",
    messageType: "approval_result",
    payloadHash: hash(JSON.stringify(payload)),
    metadata,
  };

  try {
    if (responseUrl) {
      await postToResponseUrl(responseUrl, payload);
      await prisma.outboundMessageLog.create({
        data: {
          ...logBase,
          status: "SENT",
          sentAt: new Date(),
        },
      });
      return;
    }

    if (!channelId) {
      await prisma.outboundMessageLog.create({
        data: {
          ...logBase,
          status: "SKIPPED",
          errorMessage: "Missing responseUrl and channelId for Slack approval notification",
        },
      });
      return;
    }

    const connection = await prisma.integrationConnection.findFirst({
      where: {
        workspaceId,
        provider: "SLACK",
        status: "CONNECTED",
      },
      select: {
        accessToken: true,
      },
    });

    if (!connection?.accessToken) {
      await prisma.outboundMessageLog.create({
        data: {
          ...logBase,
          status: "FAILED",
          errorMessage: "Slack token not available",
        },
      });
      return;
    }

    const accessToken = decrypt(connection.accessToken);
    const post = await postMessage(accessToken, channelId, text, [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text,
        },
      },
    ]);

    await prisma.outboundMessageLog.create({
      data: {
        ...logBase,
        status: post.ok ? "SENT" : "FAILED",
        providerMessageId: post.ts,
        errorMessage: post.ok ? null : post.error || "Slack message failed",
        sentAt: post.ok ? new Date() : null,
      },
    });
  } catch (error) {
    await prisma.outboundMessageLog.create({
      data: {
        ...logBase,
        status: "FAILED",
        errorMessage: error instanceof Error ? error.message : "Unknown Slack send error",
      },
    });
  }
}
