/**
 * Enhanced Rate Limiter
 * =====================
 * Rate limiting using config profiles from security.config.ts
 */

import { NextRequest } from 'next/server';
import { securityConfig, RateLimitProfile } from './security.config';

// In-memory stores (TODO: Replace with Redis in production)
const ipStore = new Map<string, { count: number; resetAt: number }>();
const accountStore = new Map<string, { count: number; resetAt: number }>();

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
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        request.headers.get('x-real-ip') ||
        'unknown'
    );
}

/**
 * Check rate limit using a profile from security config
 */
export function checkRateLimitByProfile(
    request: NextRequest,
    profile: RateLimitProfile,
    userId?: string
): RateLimitResult {
    const config = securityConfig.rateLimits[profile];
    const now = Date.now();
    const ip = getClientIp(request);

    // Determine the key based on whether we have a user ID
    const key = userId ? `${profile}:${userId}` : `${profile}:ip:${ip}`;
    const store = userId ? accountStore : ipStore;

    let usage = store.get(key);

    if (!usage || now > usage.resetAt) {
        usage = { count: 0, resetAt: now + config.windowMs };
    }

    if (usage.count >= config.limit) {
        return {
            allowed: false,
            limit: config.limit,
            remaining: 0,
            resetAt: usage.resetAt,
            error: `Rate limit exceeded. Try again in ${Math.ceil((usage.resetAt - now) / 1000)} seconds.`,
        };
    }

    usage.count++;
    store.set(key, usage);

    return {
        allowed: true,
        limit: config.limit,
        remaining: config.limit - usage.count,
        resetAt: usage.resetAt,
    };
}

/**
 * Check IP-based rate limit (for public endpoints)
 */
export function checkIpRateLimit(
    request: NextRequest,
    profile: RateLimitProfile = 'general'
): RateLimitResult {
    return checkRateLimitByProfile(request, profile, undefined);
}

/**
 * Check user-based rate limit (for authenticated endpoints)
 */
export function checkUserRateLimit(
    request: NextRequest,
    userId: string,
    profile: RateLimitProfile = 'general'
): RateLimitResult {
    // Check IP first, then user
    const ipResult = checkRateLimitByProfile(request, 'general', undefined);
    if (!ipResult.allowed) {
        return ipResult;
    }

    return checkRateLimitByProfile(request, profile, userId);
}

/**
 * Check workspace-based rate limit
 */
export function checkWorkspaceRateLimit(
    request: NextRequest,
    workspaceId: string,
    profile: RateLimitProfile
): RateLimitResult {
    return checkRateLimitByProfile(request, profile, `ws:${workspaceId}`);
}

/**
 * Check email cooldown for a specific resource
 */
export function checkEmailCooldown(
    resourceId: string,
    cooldownType: keyof typeof securityConfig.emailCooldowns
): { allowed: boolean; retryAfterMs?: number } {
    const key = `cooldown:${cooldownType}:${resourceId}`;
    const now = Date.now();
    const cooldownMs = securityConfig.emailCooldowns[cooldownType];

    const lastSent = accountStore.get(key);

    if (lastSent && now < lastSent.resetAt) {
        return {
            allowed: false,
            retryAfterMs: lastSent.resetAt - now,
        };
    }

    // Set cooldown
    accountStore.set(key, { count: 1, resetAt: now + cooldownMs });

    return { allowed: true };
}

/**
 * Cleanup old entries periodically
 */
export function cleanupRateLimitStores() {
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
if (typeof setInterval !== 'undefined') {
    setInterval(cleanupRateLimitStores, 5 * 60 * 1000);
}

/**
 * Get all rate limit profiles (for documentation/admin)
 */
export function getRateLimitProfiles() {
    return Object.entries(securityConfig.rateLimits).map(([name, config]) => ({
        name,
        limit: config.limit,
        windowMs: config.windowMs,
        windowHuman: formatDuration(config.windowMs),
    }));
}

function formatDuration(ms: number): string {
    if (ms < 60000) return `${ms / 1000}s`;
    if (ms < 3600000) return `${ms / 60000}min`;
    if (ms < 86400000) return `${ms / 3600000}h`;
    return `${ms / 86400000}d`;
}
