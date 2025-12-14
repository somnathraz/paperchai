/**
 * Slack API Client
 * 
 * Wrapper for Slack Web API with security utilities
 */

import crypto from "crypto";
import { encrypt, decrypt } from "@/lib/encryption";

const SLACK_API_BASE = "https://slack.com/api";

// ===== Slack Signature Verification =====

/**
 * Verify Slack request signature
 * Prevents webhook spoofing attacks
 */
export function verifySlackSignature(
    signature: string | null,
    timestamp: string | null,
    body: string
): boolean {
    if (!signature || !timestamp) {
        return false;
    }

    const signingSecret = process.env.SLACK_SIGNING_SECRET;
    if (!signingSecret) {
        console.error("[Slack] Missing SLACK_SIGNING_SECRET");
        return false;
    }

    // Check timestamp freshness (prevent replay attacks)
    const MAX_AGE_SECONDS = 5 * 60; // 5 minutes
    const now = Math.floor(Date.now() / 1000);
    const requestTime = parseInt(timestamp, 10);

    if (Math.abs(now - requestTime) > MAX_AGE_SECONDS) {
        console.error("[Slack] Request timestamp too old");
        return false;
    }

    // Compute expected signature
    const baseString = `v0:${timestamp}:${body}`;
    const expectedSignature = `v0=${crypto
        .createHmac("sha256", signingSecret)
        .update(baseString)
        .digest("hex")}`;

    // Constant-time comparison to prevent timing attacks
    try {
        return crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expectedSignature)
        );
    } catch {
        return false;
    }
}

// ===== OAuth Utilities =====

/**
 * Generate OAuth state token (CSRF protection)
 */
export function generateOAuthState(workspaceId: string): string {
    const timestamp = Date.now();
    const random = crypto.randomBytes(16).toString("hex");
    const payload = JSON.stringify({ workspaceId, timestamp, random });
    return encrypt(payload);
}

/**
 * Verify and decode OAuth state token
 */
export function verifyOAuthState(
    state: string,
    maxAgeMs: number = 10 * 60 * 1000 // 10 minutes
): { workspaceId: string; timestamp: number } | null {
    try {
        const payload = decrypt(state);
        const { workspaceId, timestamp } = JSON.parse(payload);

        // Check expiration
        if (Date.now() - timestamp > maxAgeMs) {
            console.error("[Slack] OAuth state expired");
            return null;
        }

        return { workspaceId, timestamp };
    } catch (error) {
        console.error("[Slack] Invalid OAuth state:", error);
        return null;
    }
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(code: string): Promise<{
    ok: boolean;
    access_token?: string;
    team?: { id: string; name: string };
    scope?: string;
    error?: string;
}> {
    const clientId = process.env.SLACK_CLIENT_ID;
    const clientSecret = process.env.SLACK_CLIENT_SECRET;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/integrations/slack/oauth/callback`;

    if (!clientId || !clientSecret) {
        throw new Error("Missing Slack OAuth credentials");
    }

    const response = await fetch(`${SLACK_API_BASE}/oauth.v2.access`, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            code,
            redirect_uri: redirectUri,
        }),
    });

    return response.json();
}

// ===== API Methods =====

/**
 * Fetch messages from a thread
 */
export async function fetchThreadMessages(
    accessToken: string,
    channelId: string,
    threadTs: string
): Promise<{
    ok: boolean;
    messages?: Array<{
        user: string;
        text: string;
        ts: string;
        thread_ts?: string;
    }>;
    error?: string;
}> {
    const response = await fetch(
        `${SLACK_API_BASE}/conversations.replies?channel=${channelId}&ts=${threadTs}`,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        }
    );

    return response.json();
}

/**
 * Fetch channel messages
 */
export async function fetchChannelMessages(
    accessToken: string,
    channelId: string,
    limit: number = 100
): Promise<{
    ok: boolean;
    messages?: Array<{
        user: string;
        text: string;
        ts: string;
        thread_ts?: string;
    }>;
    error?: string;
}> {
    const response = await fetch(
        `${SLACK_API_BASE}/conversations.history?channel=${channelId}&limit=${limit}`,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        }
    );

    return response.json();
}

/**
 * Send ephemeral message (only visible to specific user)
 */
export async function sendEphemeralMessage(
    accessToken: string,
    channelId: string,
    userId: string,
    text: string
): Promise<{ ok: boolean; error?: string }> {
    const response = await fetch(`${SLACK_API_BASE}/chat.postEphemeral`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            channel: channelId,
            user: userId,
            text,
        }),
    });

    return response.json();
}

/**
 * Post message to channel
 */
export async function postMessage(
    accessToken: string,
    channelId: string,
    text: string,
    blocks?: any[]
): Promise<{ ok: boolean; ts?: string; error?: string }> {
    const response = await fetch(`${SLACK_API_BASE}/chat.postMessage`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            channel: channelId,
            text,
            blocks,
        }),
    });

    return response.json();
}

/**
 * Get user info
 */
export async function getUserInfo(
    accessToken: string,
    userId: string
): Promise<{
    ok: boolean;
    user?: {
        id: string;
        name: string;
        real_name: string;
        profile: { email?: string };
    };
    error?: string;
}> {
    const response = await fetch(
        `${SLACK_API_BASE}/users.info?user=${userId}`,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        }
    );

    return response.json();
}

/**
 * Test if token is valid
 */
export async function testAuth(
    accessToken: string
): Promise<{ ok: boolean; team?: string; error?: string }> {
    const response = await fetch(`${SLACK_API_BASE}/auth.test`, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });

    return response.json();
}
