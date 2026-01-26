/**
 * Notion OAuth Callback Endpoint
 * GET /api/integrations/notion/oauth/callback
 *
 * Handles OAuth callback, verifies state, exchanges code for token
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/encryption";
import { verifyOAuthState, exchangeCodeForToken } from "@/lib/notion-client";
import { notionOAuthCallbackSchema } from "@/lib/validation/integration-schemas";
import { ensureActiveWorkspace } from "@/lib/workspace";

export async function GET(request: NextRequest) {
  try {
    // 1. Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.redirect(
        new URL("/login?callbackUrl=/settings/integrations", request.url)
      );
    }

    // 2. Ensure workspace exists
    const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);
    if (!workspace) {
      console.error("[Notion OAuth] Failed to initialize workspace");
      return NextResponse.redirect(
        new URL("/settings/integrations?error=workspace_init_failed", request.url)
      );
    }

    // 3. Parse and validate query parameters
    const searchParams = request.nextUrl.searchParams;
    const params = {
      code: searchParams.get("code") || undefined,
      state: searchParams.get("state") || undefined,
      error: searchParams.get("error") || undefined,
    };

    // Check for OAuth errors from Notion
    if (params.error) {
      console.error("[Notion OAuth] Error from Notion:", params.error);
      return NextResponse.redirect(
        new URL(`/settings/integrations?error=notion_denied&details=${params.error}`, request.url)
      );
    }

    // Validate input
    const validated = notionOAuthCallbackSchema.safeParse(params);
    if (!validated.success || !validated.data.code || !validated.data.state) {
      console.error("[Notion OAuth] Invalid callback params:", validated.error);
      return NextResponse.redirect(
        new URL("/settings/integrations?error=invalid_callback", request.url)
      );
    }

    // 4. Verify CSRF state
    const stateData = verifyOAuthState(validated.data.state);
    if (!stateData) {
      console.error("[Notion OAuth] Invalid or expired state");
      return NextResponse.redirect(
        new URL("/settings/integrations?error=invalid_state", request.url)
      );
    }

    // 5. Verify workspace matches (use actual workspace from ensureActiveWorkspace)
    if (stateData.workspaceId !== workspace.id) {
      console.error("[Notion OAuth] Workspace mismatch");
      return NextResponse.redirect(
        new URL("/settings/integrations?error=workspace_mismatch", request.url)
      );
    }

    // 5. Exchange code for token
    const tokenResponse = await exchangeCodeForToken(validated.data.code);

    if (!tokenResponse.access_token) {
      console.error("[Notion OAuth] Token exchange failed:", tokenResponse.error);
      return NextResponse.redirect(
        new URL(
          `/settings/integrations?error=token_exchange_failed&details=${tokenResponse.error}`,
          request.url
        )
      );
    }

    // 6. Encrypt token before storing
    const encryptedToken = encrypt(tokenResponse.access_token);

    // 7. Create or update integration connection
    await prisma.integrationConnection.upsert({
      where: {
        workspaceId_provider: {
          workspaceId: workspace.id,
          provider: "NOTION",
        },
      },
      create: {
        workspaceId: workspace.id,
        provider: "NOTION",
        status: "CONNECTED",
        accessToken: encryptedToken,
        providerWorkspaceId: tokenResponse.workspace_id,
        providerWorkspaceName: tokenResponse.workspace_name,
      },
      update: {
        status: "CONNECTED",
        accessToken: encryptedToken,
        providerWorkspaceId: tokenResponse.workspace_id,
        providerWorkspaceName: tokenResponse.workspace_name,
        lastError: null,
        lastErrorAt: null,
        updatedAt: new Date(),
      },
    });

    // 8. Success - redirect to integrations page or custom URL
    const redirectUrl = stateData.redirectTo
      ? `${stateData.redirectTo}?success=notion_connected`
      : "/settings/integrations?success=notion_connected";

    return NextResponse.redirect(new URL(redirectUrl, request.url));
  } catch (error) {
    console.error("[Notion OAuth Callback Error]", error);
    return NextResponse.redirect(new URL("/settings/integrations?error=oauth_failed", request.url));
  }
}
