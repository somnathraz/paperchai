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

        // 4. Verify workspace matches
        const userWorkspaceId = (session.user as any).activeWorkspaceId;
        if (stateData.workspaceId !== userWorkspaceId) {
            console.error("[Slack OAuth] Workspace mismatch");
            return NextResponse.redirect(
                new URL("/settings/integrations?error=workspace_mismatch", request.url)
            );
        }

        // 5. Exchange code for token
        const tokenResponse = await exchangeCodeForToken(validated.data.code);

        if (!tokenResponse.ok || !tokenResponse.access_token) {
            console.error("[Slack OAuth] Token exchange failed:", tokenResponse.error);
            return NextResponse.redirect(
                new URL(`/settings/integrations?error=token_exchange_failed&details=${tokenResponse.error}`, request.url)
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
                providerWorkspaceId: tokenResponse.team?.id,
                providerWorkspaceName: tokenResponse.team?.name,
                scopes: tokenResponse.scope,
            },
            update: {
                status: "CONNECTED",
                accessToken: encryptedToken,
                providerWorkspaceId: tokenResponse.team?.id,
                providerWorkspaceName: tokenResponse.team?.name,
                scopes: tokenResponse.scope,
                lastError: null,
                lastErrorAt: null,
                updatedAt: new Date(),
            },
        });

        // 8. Success - redirect to integrations page
        return NextResponse.redirect(
            new URL("/settings/integrations?success=slack_connected", request.url)
        );

    } catch (error) {
        console.error("[Slack OAuth Callback Error]", error);
        return NextResponse.redirect(
            new URL("/settings/integrations?error=oauth_failed", request.url)
        );
    }
}
