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

    // 2. Premium Check (Temporarily disabled for development)
    // const premiumError = await requirePremium(request);
    // if (premiumError) {
    //     return NextResponse.redirect(
    //         new URL("/settings/billing?error=premium_required&feature=notion", request.url)
    //     );
    // }
    // 3. Get or create workspace
    const { ensureActiveWorkspace } = await import("@/lib/workspace");
    const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);

    if (!workspace) {
      return NextResponse.redirect(
        new URL("/settings/workspace?error=workspace_creation_failed", request.url)
      );
    }

    // 4. Generate CSRF state
    const redirectTo = request.nextUrl.searchParams.get("next") || undefined;
    const state = generateOAuthState(workspace.id, redirectTo);

    // 5. Build Notion OAuth URL
    const clientId = process.env.NOTION_CLIENT_ID;
    if (!clientId) {
      console.error("[Notion OAuth] Missing NOTION_CLIENT_ID");
      return NextResponse.redirect(
        new URL("/settings/integrations?error=config_missing", request.url)
      );
    }

    // IMPORTANT: Redirect URI must EXACTLY match what's registered in Notion integration
    // Production: https://paperchaiapp.com/api/integrations/notion/oauth/callback
    // Development: http://localhost:3000/api/integrations/notion/oauth/callback
    const redirectUri =
      process.env.NODE_ENV === "production"
        ? "https://paperchaiapp.com/api/integrations/notion/oauth/callback"
        : "http://localhost:3000/api/integrations/notion/oauth/callback";

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
    return NextResponse.redirect(new URL("/settings/integrations?error=oauth_failed", request.url));
  }
}
