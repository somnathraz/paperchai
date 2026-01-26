/**
 * AI Budget & Caching System
 * ===========================
 * OWASP LLM04 (Model DoS) mitigation:
 * - Per-workspace daily budgets
 * - Content-based caching (same doc = 0 credits)
 * - Concurrency limits
 */

import { prisma } from "./prisma";
import crypto from "crypto";

// ================================================================
// CONFIGURATION
// ================================================================

export const AI_BUDGET_CONFIG = {
    // Daily limits by tier (ai calls per day)
    dailyLimits: {
        FREE: 10,
        STARTER: 50,
        PROFESSIONAL: 200,
        BUSINESS: 500,
        ENTERPRISE: 2000,
    },

    // Concurrency limits (parallel AI jobs per workspace)
    concurrencyLimits: {
        FREE: 1,
        STARTER: 2,
        PROFESSIONAL: 3,
        BUSINESS: 5,
        ENTERPRISE: 10,
    },

    // Cache TTL (7 days)
    cacheTtlMs: 7 * 24 * 60 * 60 * 1000,
} as const;

export type AiBudgetTier = keyof typeof AI_BUDGET_CONFIG.dailyLimits;

// ================================================================
// IN-MEMORY TRACKING (For concurrency - Redis in production)
// ================================================================

const activeJobs = new Map<string, number>(); // workspaceId -> active job count

// ================================================================
// BUDGET CHECK
// ================================================================

export interface BudgetCheckResult {
    allowed: boolean;
    remaining: number;
    dailyLimit: number;
    usedToday: number;
    error?: string;
}

/**
 * Check if workspace has AI budget remaining for today.
 */
export async function checkAiBudget(
    workspaceId: string,
    tier: AiBudgetTier = "FREE",
): Promise<BudgetCheckResult> {
    const dailyLimit = AI_BUDGET_CONFIG.dailyLimits[tier];

    // Get today's start
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Count today's AI calls from audit log
    const usedToday = await prisma.auditLog.count({
        where: {
            workspaceId,
            action: { startsWith: "AI_" },
            createdAt: { gte: todayStart },
        },
    });

    const remaining = Math.max(0, dailyLimit - usedToday);

    return {
        allowed: remaining > 0,
        remaining,
        dailyLimit,
        usedToday,
        error: remaining <= 0 ? `Daily AI limit reached (${dailyLimit} calls). Resets at midnight.` : undefined,
    };
}

// ================================================================
// CONCURRENCY CONTROL
// ================================================================

export interface ConcurrencyCheckResult {
    allowed: boolean;
    activeJobs: number;
    limit: number;
    error?: string;
}

/**
 * Check if workspace can start a new AI job (concurrency limit).
 */
export function checkConcurrency(
    workspaceId: string,
    tier: AiBudgetTier = "FREE",
): ConcurrencyCheckResult {
    const limit = AI_BUDGET_CONFIG.concurrencyLimits[tier];
    const current = activeJobs.get(workspaceId) || 0;

    return {
        allowed: current < limit,
        activeJobs: current,
        limit,
        error: current >= limit ? `Max ${limit} concurrent AI jobs. Please wait.` : undefined,
    };
}

/**
 * Acquire a job slot (increment active count).
 */
export function acquireJobSlot(workspaceId: string): void {
    const current = activeJobs.get(workspaceId) || 0;
    activeJobs.set(workspaceId, current + 1);
}

/**
 * Release a job slot (decrement active count).
 */
export function releaseJobSlot(workspaceId: string): void {
    const current = activeJobs.get(workspaceId) || 0;
    if (current > 0) {
        activeJobs.set(workspaceId, current - 1);
    }
}

// ================================================================
// CACHE SYSTEM
// ================================================================

// In-memory cache (Redis in production)
const resultCache = new Map<string, {
    result: unknown;
    cachedAt: number;
    action: string;
}>();

/**
 * Generate cache key from content hash and action.
 */
export function getCacheKey(
    workspaceId: string,
    contentHash: string,
    action: string,
): string {
    return crypto
        .createHash("sha256")
        .update(`${workspaceId}:${contentHash}:${action}`)
        .digest("hex")
        .substring(0, 32);
}

/**
 * Check cache for existing result.
 */
export function getCachedResult<T>(cacheKey: string): T | null {
    const cached = resultCache.get(cacheKey);

    if (!cached) return null;

    // Check TTL
    if (Date.now() - cached.cachedAt > AI_BUDGET_CONFIG.cacheTtlMs) {
        resultCache.delete(cacheKey);
        return null;
    }

    return cached.result as T;
}

/**
 * Store result in cache.
 */
export function cacheResult(
    cacheKey: string,
    result: unknown,
    action: string,
): void {
    resultCache.set(cacheKey, {
        result,
        cachedAt: Date.now(),
        action,
    });

    // Cleanup old entries (simple LRU)
    if (resultCache.size > 1000) {
        const oldest = Array.from(resultCache.entries())
            .sort((a, b) => a[1].cachedAt - b[1].cachedAt)
            .slice(0, 100);

        for (const [key] of oldest) {
            resultCache.delete(key);
        }
    }
}

// ================================================================
// COMBINED GUARD
// ================================================================

export interface AiGuardResult {
    allowed: boolean;
    cachedResult?: unknown;
    cacheKey: string;
    budgetCheck: BudgetCheckResult;
    concurrencyCheck: ConcurrencyCheckResult;
    error?: string;
}

/**
 * Combined check: budget + concurrency + cache.
 * Call this before every AI operation.
 */
export async function checkAiGuard(
    workspaceId: string,
    contentHash: string,
    action: string,
    tier: AiBudgetTier = "FREE",
): Promise<AiGuardResult> {
    const cacheKey = getCacheKey(workspaceId, contentHash, action);

    // 1. Check cache first (free!)
    const cachedResult = getCachedResult(cacheKey);
    if (cachedResult !== null) {
        return {
            allowed: true,
            cachedResult,
            cacheKey,
            budgetCheck: { allowed: true, remaining: -1, dailyLimit: -1, usedToday: -1 },
            concurrencyCheck: { allowed: true, activeJobs: 0, limit: -1 },
        };
    }

    // 2. Check budget
    const budgetCheck = await checkAiBudget(workspaceId, tier);
    if (!budgetCheck.allowed) {
        return {
            allowed: false,
            cacheKey,
            budgetCheck,
            concurrencyCheck: { allowed: true, activeJobs: 0, limit: -1 },
            error: budgetCheck.error,
        };
    }

    // 3. Check concurrency
    const concurrencyCheck = checkConcurrency(workspaceId, tier);
    if (!concurrencyCheck.allowed) {
        return {
            allowed: false,
            cacheKey,
            budgetCheck,
            concurrencyCheck,
            error: concurrencyCheck.error,
        };
    }

    return {
        allowed: true,
        cacheKey,
        budgetCheck,
        concurrencyCheck,
    };
}
