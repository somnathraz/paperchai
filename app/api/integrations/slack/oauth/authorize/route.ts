/**
 * Slack OAuth Authorize Endpoint
 * GET /api/integrations/slack/oauth/authorize
 * 
 * Initiates Slack OAuth flow with CSRF protection
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requirePremium } from "@/lib/middleware/premium-check";
import { generateOAuthState } from "@/lib/slack-client";

export async function GET(request: NextRequest) {
    try {
        // 1. Authentication
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.redirect(
                new URL("/login?callbackUrl=/settings/integrations", request.url)
            );
        }

        // 2. Premium Check (Temporarily disabled for development)
        // const premiumError = await requirePremium(request);
        // if (premiumError) {
        //     return NextResponse.redirect(
        //         new URL("/settings/billing?error=premium_required&feature=slack", request.url)
        //     );
        // }

        // 3. Get workspace ID from database
        const { prisma } = await import("@/lib/prisma");
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { activeWorkspaceId: true }
        });

        const workspaceId = user?.activeWorkspaceId;
        if (!workspaceId) {
            return NextResponse.redirect(
                new URL("/settings/workspace?error=no_workspace", request.url)
            );
        }

        // 4. Generate CSRF state
        const redirectTo = request.nextUrl.searchParams.get("next") || undefined;
        const state = generateOAuthState(workspaceId, redirectTo);

        // 5. Build Slack OAuth URL
        const clientId = process.env.SLACK_CLIENT_ID;
        if (!clientId) {
            console.error("[Slack OAuth] Missing SLACK_CLIENT_ID");
            return NextResponse.redirect(
                new URL("/settings/integrations?error=config_missing", request.url)
            );
        }

        const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/integrations/slack/oauth/callback`;

        // Required scopes for the integration
        const scopes = [
            "channels:history",
            "channels:read",
            "chat:write",
            "commands",
            "users:read",
            "team:read"
        ].join(",");

        const slackAuthUrl = new URL("https://slack.com/oauth/v2/authorize");
        slackAuthUrl.searchParams.set("client_id", clientId);
        slackAuthUrl.searchParams.set("scope", scopes);
        slackAuthUrl.searchParams.set("redirect_uri", redirectUri);
        slackAuthUrl.searchParams.set("state", state);

        // 6. Redirect to Slack
        return NextResponse.redirect(slackAuthUrl.toString());

    } catch (error) {
        console.error("[Slack OAuth Authorize Error]", error);
        return NextResponse.redirect(
            new URL("/settings/integrations?error=oauth_failed", request.url)
        );
    }
}
