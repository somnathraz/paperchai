/**
 * Notion API Client
 * 
 * Wrapper for Notion API with security utilities
 */

import { encrypt, decrypt } from "@/lib/encryption";
import crypto from "crypto";

const NOTION_API_BASE = "https://api.notion.com/v1";
const NOTION_API_VERSION = "2022-06-28";

// ===== Throttle Utility (3 req/sec) =====

let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 334; // ~3 requests per second

async function throttledFetch(url: string, options: RequestInit): Promise<Response> {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;

    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
        await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
    }

    lastRequestTime = Date.now();

    const response = await fetch(url, options);

    // Retry on rate limit
    if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get("Retry-After") || "1") * 1000;
        console.log(`[Notion] Rate limited, retrying after ${retryAfter}ms`);
        await new Promise(resolve => setTimeout(resolve, retryAfter));
        return throttledFetch(url, options);
    }

    return response;
}

// ===== OAuth Utilities =====

/**
 * Generate OAuth state token (CSRF protection)
 */
/**
 * Generate OAuth state token (CSRF protection)
 */
export function generateOAuthState(workspaceId: string, redirectTo?: string): string {
    const timestamp = Date.now();
    const random = crypto.randomBytes(16).toString("hex");
    const payload = JSON.stringify({ workspaceId, timestamp, random, provider: "notion", redirectTo });
    return encrypt(payload);
}

/**
 * Verify and decode OAuth state token
 */
export function verifyOAuthState(
    state: string,
    maxAgeMs: number = 10 * 60 * 1000 // 10 minutes
): { workspaceId: string; timestamp: number; redirectTo?: string } | null {
    try {
        const payload = decrypt(state);
        const { workspaceId, timestamp, provider, redirectTo } = JSON.parse(payload);

        // Verify it's a Notion state
        if (provider !== "notion") {
            console.error("[Notion] Invalid OAuth state provider");
            return null;
        }

        // Check expiration
        if (Date.now() - timestamp > maxAgeMs) {
            console.error("[Notion] OAuth state expired");
            return null;
        }

        return { workspaceId, timestamp, redirectTo };
    } catch (error) {
        console.error("[Notion] Invalid OAuth state:", error);
        return null;
    }
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(code: string): Promise<{
    access_token?: string;
    token_type?: string;
    bot_id?: string;
    workspace_id?: string;
    workspace_name?: string;
    workspace_icon?: string;
    owner?: any;
    error?: string;
}> {
    const clientId = process.env.NOTION_CLIENT_ID;
    const clientSecret = process.env.NOTION_CLIENT_SECRET;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/integrations/notion/oauth/callback`;

    if (!clientId || !clientSecret) {
        throw new Error("Missing Notion OAuth credentials");
    }

    // Create basic auth header
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    const response = await fetch("https://api.notion.com/v1/oauth/token", {
        method: "POST",
        headers: {
            "Authorization": `Basic ${basicAuth}`,
            "Content-Type": "application/json",
            "Notion-Version": NOTION_API_VERSION,
        },
        body: JSON.stringify({
            grant_type: "authorization_code",
            code,
            redirect_uri: redirectUri,
        }),
    });

    return response.json();
}

// ===== API Methods =====

/**
 * List accessible databases
 */
export async function listDatabases(
    accessToken: string
): Promise<{
    results?: Array<{
        id: string;
        title: Array<{ plain_text: string }>;
        properties: Record<string, any>;
    }>;
    error?: string;
}> {
    const response = await fetch(`${NOTION_API_BASE}/search`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            "Notion-Version": NOTION_API_VERSION,
        },
        body: JSON.stringify({
            filter: { property: "object", value: "database" },
            sort: { direction: "descending", timestamp: "last_edited_time" },
        }),
    });

    return response.json();
}

/**
 * Query a database
 */
export async function queryDatabase(
    accessToken: string,
    databaseId: string,
    startCursor?: string,
    pageSize: number = 100
): Promise<{
    results?: Array<any>;
    has_more?: boolean;
    next_cursor?: string;
    error?: string;
}> {
    const body: any = { page_size: pageSize };
    if (startCursor) body.start_cursor = startCursor;

    const response = await fetch(
        `${NOTION_API_BASE}/databases/${databaseId}/query`,
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
                "Notion-Version": NOTION_API_VERSION,
            },
            body: JSON.stringify(body),
        }
    );

    return response.json();
}

/**
 * Get a page
 */
export async function getPage(
    accessToken: string,
    pageId: string
): Promise<any> {
    const response = await fetch(`${NOTION_API_BASE}/pages/${pageId}`, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Notion-Version": NOTION_API_VERSION,
        },
    });

    return response.json();
}

/**
 * Get page blocks (content)
 */
export async function getPageBlocks(
    accessToken: string,
    pageId: string,
    startCursor?: string
): Promise<{
    results?: Array<any>;
    has_more?: boolean;
    next_cursor?: string;
    error?: string;
}> {
    let url = `${NOTION_API_BASE}/blocks/${pageId}/children`;
    if (startCursor) url += `?start_cursor=${startCursor}`;

    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Notion-Version": NOTION_API_VERSION,
        },
    });

    return response.json();
}

/**
 * Extract plain text from Notion blocks
 */
export function extractTextFromBlocks(blocks: any[]): string {
    const textParts: string[] = [];

    for (const block of blocks) {
        const type = block.type;
        const content = block[type];

        if (!content) continue;

        // Extract rich text content
        if (content.rich_text) {
            const text = content.rich_text
                .map((rt: any) => rt.plain_text)
                .join("");
            if (text) textParts.push(text);
        }

        // Extract title (for headings, etc.)
        if (content.title) {
            const text = content.title
                .map((rt: any) => rt.plain_text)
                .join("");
            if (text) textParts.push(text);
        }

        // Handle nested children
        if (content.children) {
            textParts.push(extractTextFromBlocks(content.children));
        }
    }

    return textParts.join("\n");
}

/**
 * Extract properties from a Notion page
 */
export function extractPageProperties(page: any): Record<string, any> {
    const result: Record<string, any> = {};
    const properties = page.properties || {};

    for (const [key, value] of Object.entries(properties) as [string, any][]) {
        switch (value.type) {
            case "title":
                result[key] = value.title?.[0]?.plain_text || "";
                break;
            case "rich_text":
                result[key] = value.rich_text?.[0]?.plain_text || "";
                break;
            case "number":
                result[key] = value.number;
                break;
            case "select":
                result[key] = value.select?.name || "";
                break;
            case "multi_select":
                result[key] = value.multi_select?.map((s: any) => s.name) || [];
                break;
            case "date":
                result[key] = value.date?.start || "";
                break;
            case "email":
                result[key] = value.email || "";
                break;
            case "phone_number":
                result[key] = value.phone_number || "";
                break;
            case "url":
                result[key] = value.url || "";
                break;
            case "checkbox":
                result[key] = value.checkbox;
                break;
            case "status":
                result[key] = value.status?.name || "";
                break;
            default:
                result[key] = null;
        }
    }

    return result;
}

/**
 * Get database info (schema)
 */
export async function getDatabase(
    accessToken: string,
    databaseId: string
): Promise<any> {
    const response = await fetch(
        `${NOTION_API_BASE}/databases/${databaseId}`,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Notion-Version": NOTION_API_VERSION,
            },
        }
    );

    return response.json();
}
