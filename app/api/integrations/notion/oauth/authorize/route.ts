/**
 * Notion OAuth Authorize Endpoint
 * GET /api/integrations/notion/oauth/authorize
 * 
 * Initiates Notion OAuth flow with CSRF protection
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requirePremium } from "@/lib/middleware/premium-check";
import { generateOAuthState } from "@/lib/notion-client";

export async function GET(request: NextRequest) {
    try {
        // 1. Authentication
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.redirect(
                new URL("/login?callbackUrl=/settings/integrations", request.url)
            );
        }

        // 2. Premium Check
        const premiumError = await requirePremium(request);
        if (premiumError) {
            // Redirect to billing page with message
            return NextResponse.redirect(
                new URL("/settings/billing?error=premium_required&feature=notion", request.url)
            );
        }

        // 3. Get workspace ID
        const workspaceId = (session.user as any).activeWorkspaceId;
        if (!workspaceId) {
            return NextResponse.redirect(
                new URL("/settings/workspace?error=no_workspace", request.url)
            );
        }

        // 4. Generate CSRF state
        const state = generateOAuthState(workspaceId);

        // 5. Build Notion OAuth URL
        const clientId = process.env.NOTION_CLIENT_ID;
        if (!clientId) {
            console.error("[Notion OAuth] Missing NOTION_CLIENT_ID");
            return NextResponse.redirect(
                new URL("/settings/integrations?error=config_missing", request.url)
            );
        }

        const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/integrations/notion/oauth/callback`;

        const notionAuthUrl = new URL("https://api.notion.com/v1/oauth/authorize");
        notionAuthUrl.searchParams.set("client_id", clientId);
        notionAuthUrl.searchParams.set("response_type", "code");
        notionAuthUrl.searchParams.set("owner", "user");
        notionAuthUrl.searchParams.set("redirect_uri", redirectUri);
        notionAuthUrl.searchParams.set("state", state);

        // 6. Redirect to Notion
        return NextResponse.redirect(notionAuthUrl.toString());

    } catch (error) {
        console.error("[Notion OAuth Authorize Error]", error);
        return NextResponse.redirect(
            new URL("/settings/integrations?error=oauth_failed", request.url)
        );
    }
}
