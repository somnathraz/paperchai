/**
 * Rate Limiting Utilities
 * 
 * Implements dual rate limiting:
 * 1. IP-based (prevents DDoS attacks)
 * 2. Account-based (per user tier limits)
 */

import { NextRequest } from "next/server";
import { getUserTier, TIER_LIMITS, UserTier } from "./tier-limits";

// In-memory store (TODO: Replace with Redis in production)
const ipStore = new Map<string, { count: number; resetAt: number }>();
const accountStore = new Map<string, { count: number; resetAt: number }>();

const WINDOW_MS = 60 * 1000; // 1 minute

export type RateLimitResult = {
    allowed: boolean;
    limit: number;
    remaining: number;
    resetAt: number;
    error?: string;
};

/**
 * Get client IP from request
 */
function getClientIp(request: NextRequest): string {
    return (
        request.ip ||
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        request.headers.get("x-real-ip") ||
        "unknown"
    );
}

/**
 * IP-based rate limiting (prevents DDoS)
 * Limit: 100 requests per minute per IP
 */
export function checkIpRateLimit(request: NextRequest): RateLimitResult {
    const ip = getClientIp(request);
    const now = Date.now();

    let usage = ipStore.get(ip);

    if (!usage || now > usage.resetAt) {
        usage = { count: 0, resetAt: now + WINDOW_MS };
    }

    const limit = 100; // 100 requests per minute per IP

    if (usage.count >= limit) {
        return {
            allowed: false,
            limit,
            remaining: 0,
            resetAt: usage.resetAt,
            error: "Too many requests from this IP. Please try again later."
        };
    }

    usage.count++;
    ipStore.set(ip, usage);

    return {
        allowed: true,
        limit,
        remaining: limit - usage.count,
        resetAt: usage.resetAt
    };
}

/**
 * Account-based rate limiting (per user tier)
 */
export function checkAccountRateLimit(
    userId: string,
    tier: UserTier,
    resource: "general" | "integrations" = "general"
): RateLimitResult {
    const now = Date.now();
    const key = `${userId}:${resource}`;

    let usage = accountStore.get(key);

    if (!usage || now > usage.resetAt) {
        usage = { count: 0, resetAt: now + WINDOW_MS };
    }

    // Get limit based on resource type
    let limit: number;
    if (resource === "integrations") {
        limit = TIER_LIMITS[tier].integrations.importsPerMinute;
    } else {
        limit = TIER_LIMITS[tier].requestsPerMinute;
    }

    if (usage.count >= limit) {
        return {
            allowed: false,
            limit,
            remaining: 0,
            resetAt: usage.resetAt,
            error: `Rate limit exceeded for ${tier} plan. ${tier === "FREE" ? "Upgrade to Premium for higher limits." : "Please try again later."
                }`
        };
    }

    usage.count++;
    accountStore.set(key, usage);

    return {
        allowed: true,
        limit,
        remaining: limit - usage.count,
        resetAt: usage.resetAt
    };
}

/**
 * Combined rate limit check (IP + Account)
 * Use this in API endpoints
 */
export function checkRateLimit(
    request: NextRequest,
    userId: string,
    tier: UserTier,
    resource: "general" | "integrations" = "general"
): RateLimitResult {
    // Check IP first (prevents DDoS)
    const ipResult = checkIpRateLimit(request);
    if (!ipResult.allowed) {
        return ipResult;
    }

    // Then check account limits
    return checkAccountRateLimit(userId, tier, resource);
}

/**
 * Cleanup old entries (call periodically)
 */
export function cleanupRateLimitStore() {
    const now = Date.now();

    ipStore.forEach((usage, key) => {
        if (now > usage.resetAt) {
            ipStore.delete(key);
        }
    });

    accountStore.forEach((usage, key) => {
        if (now > usage.resetAt) {
            accountStore.delete(key);
        }
    });
}

// Cleanup every 5 minutes
setInterval(cleanupRateLimitStore, 5 * 60 * 1000);
