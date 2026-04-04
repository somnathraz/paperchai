/**
 * Slack OAuth Callback Endpoint
 * GET /api/integrations/slack/oauth/callback
 *
 * Handles OAuth callback, verifies state, exchanges code for token
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/encryption";
import { verifyOAuthState, exchangeCodeForToken } from "@/lib/slack-client";
import { slackOAuthCallbackSchema } from "@/lib/validation/integration-schemas";
import { buildSafeAppRedirect } from "@/lib/security/redirect";
import { ensureActiveWorkspace } from "@/lib/workspace";
import { requireIntegrationManager } from "@/lib/integrations/access";

export async function GET(request: NextRequest) {
  try {
    // 1. Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.redirect(
        new URL("/login?callbackUrl=/settings/integrations", request.url)
      );
    }

    // 2. Parse and validate query parameters
    const searchParams = request.nextUrl.searchParams;
    const params = {
      code: searchParams.get("code") || undefined,
      state: searchParams.get("state") || undefined,
      error: searchParams.get("error") || undefined,
    };

    // Check for OAuth errors from Slack
    if (params.error) {
      console.error("[Slack OAuth] Error from Slack:", params.error);
      return NextResponse.redirect(
        new URL(`/settings/integrations?error=slack_denied&details=${params.error}`, request.url)
      );
    }

    // Validate input
    const validated = slackOAuthCallbackSchema.safeParse(params);
    if (!validated.success || !validated.data.code || !validated.data.state) {
      console.error("[Slack OAuth] Invalid callback params:", validated.error);
      return NextResponse.redirect(
        new URL("/settings/integrations?error=invalid_callback", request.url)
      );
    }

    // 3. Verify CSRF state
    const stateData = verifyOAuthState(validated.data.state);
    if (!stateData) {
      console.error("[Slack OAuth] Invalid or expired state");
      return NextResponse.redirect(
        new URL("/settings/integrations?error=invalid_state", request.url)
      );
    }

    // 4. Verify workspace matches active workspace resolved from DB.
    const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);
    if (!workspace || stateData.workspaceId !== workspace.id) {
      console.error("[Slack OAuth] Workspace mismatch");
      return NextResponse.redirect(
        new URL("/settings/integrations?error=workspace_mismatch", request.url)
      );
    }
    const canManage = await requireIntegrationManager(session.user.id, workspace.id);
    if (!canManage) {
      return NextResponse.redirect(new URL("/settings/integrations?error=forbidden", request.url));
    }

    // 5. Exchange code for token
    const tokenResponse = await exchangeCodeForToken(validated.data.code);

    if (!tokenResponse.ok || !tokenResponse.access_token) {
      console.error("[Slack OAuth] Token exchange failed:", tokenResponse.error);
      return NextResponse.redirect(
        new URL(
          `/settings/integrations?error=token_exchange_failed&details=${tokenResponse.error}`,
          request.url
        )
      );
    }

    if (!tokenResponse.team?.id) {
      console.error("[Slack OAuth] Missing Slack team id in OAuth response");
      return NextResponse.redirect(
        new URL("/settings/integrations?error=slack_missing_team_id", request.url)
      );
    }

    const conflictingConnection = await prisma.integrationConnection.findFirst({
      where: {
        provider: "SLACK",
        providerWorkspaceId: tokenResponse.team.id,
        workspaceId: { not: stateData.workspaceId },
        status: "CONNECTED",
      },
      select: { id: true, workspaceId: true },
    });

    if (conflictingConnection) {
      console.error("[Slack OAuth] Team already connected to another workspace", {
        teamId: tokenResponse.team.id,
        workspaceId: conflictingConnection.workspaceId,
      });
      return NextResponse.redirect(
        new URL("/settings/integrations?error=slack_team_already_connected", request.url)
      );
    }

    // 6. Encrypt token before storing
    const encryptedToken = encrypt(tokenResponse.access_token);

    // 7. Create or update integration connection
    await prisma.integrationConnection.upsert({
      where: {
        workspaceId_provider: {
          workspaceId: stateData.workspaceId,
          provider: "SLACK",
        },
      },
      create: {
        workspaceId: stateData.workspaceId,
        provider: "SLACK",
        status: "CONNECTED",
        accessToken: encryptedToken,
        providerWorkspaceId: tokenResponse.team.id,
        providerWorkspaceName: tokenResponse.team.name,
        scopes: tokenResponse.scope,
      },
      update: {
        status: "CONNECTED",
        accessToken: encryptedToken,
        providerWorkspaceId: tokenResponse.team.id,
        providerWorkspaceName: tokenResponse.team.name,
        scopes: tokenResponse.scope,
        lastError: null,
        lastErrorAt: null,
        updatedAt: new Date(),
      },
    });

    // 7b. Seed integrationIdentity for the installer so their first command works
    //     without needing a users.info email lookup.
    if (tokenResponse.authed_user?.id) {
      const membership = await prisma.workspaceMember.findFirst({
        where: { workspaceId: stateData.workspaceId, userId: session.user.id, removedAt: null },
        select: { role: true },
      });
      if (membership) {
        await prisma.integrationIdentity.upsert({
          where: {
            workspaceId_provider_externalUserId: {
              workspaceId: stateData.workspaceId,
              provider: "SLACK",
              externalUserId: tokenResponse.authed_user.id,
            },
          },
          create: {
            workspaceId: stateData.workspaceId,
            provider: "SLACK",
            externalUserId: tokenResponse.authed_user.id,
            internalUserId: session.user.id,
            roleSnapshot: membership.role,
            active: true,
          },
          update: {
            internalUserId: session.user.id,
            roleSnapshot: membership.role,
            active: true,
          },
        });
      }
    }

    // 8. Success - redirect to integrations page or custom URL
    const redirectPath = stateData.redirectTo
      ? `${stateData.redirectTo}${stateData.redirectTo.includes("?") ? "&" : "?"}success=slack_connected`
      : "/settings/integrations?success=slack_connected";

    return NextResponse.redirect(
      buildSafeAppRedirect(request, redirectPath, "/settings/integrations?success=slack_connected")
    );
  } catch (error) {
    console.error("[Slack OAuth Callback Error]", error);
    return NextResponse.redirect(new URL("/settings/integrations?error=oauth_failed", request.url));
  }
}
