/**
 * Security Middleware
 * ===================
 * Adds security headers and CORS configuration to all responses.
 */

import { NextRequest, NextResponse } from "next/server";

// CORS allowed origins (add your domains)
const ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:3001",
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXTAUTH_URL,
].filter(Boolean);

export function middleware(request: NextRequest) {
    const response = NextResponse.next();
    const origin = request.headers.get("origin");

    // ==================== SECURITY HEADERS ====================

    // Prevent clickjacking
    response.headers.set("X-Frame-Options", "DENY");

    // Prevent MIME sniffing
    response.headers.set("X-Content-Type-Options", "nosniff");

    // XSS Protection (legacy browsers)
    response.headers.set("X-XSS-Protection", "1; mode=block");

    // Referrer policy
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

    // Permissions policy (restrict browser features)
    response.headers.set(
        "Permissions-Policy",
        "camera=(), microphone=(), geolocation=(), payment=(self)"
    );

    // Content Security Policy (strict)
    response.headers.set(
        "Content-Security-Policy",
        [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "img-src 'self' data: blob: https: http:",
            "font-src 'self' https://fonts.gstatic.com",
            "connect-src 'self' https://api.notion.com https://slack.com https://generativelanguage.googleapis.com",
            "frame-src 'self' https://accounts.google.com",
            "form-action 'self'",
            "base-uri 'self'",
            "object-src 'none'",
        ].join("; ")
    );

    // HSTS (only in production with HTTPS)
    if (process.env.NODE_ENV === "production") {
        response.headers.set(
            "Strict-Transport-Security",
            "max-age=31536000; includeSubDomains; preload"
        );
    }

    // ==================== CORS CONFIGURATION ====================

    // Only apply CORS to API routes
    if (request.nextUrl.pathname.startsWith("/api/")) {
        // Check if origin is allowed
        if (origin && ALLOWED_ORIGINS.includes(origin)) {
            response.headers.set("Access-Control-Allow-Origin", origin);
            response.headers.set("Access-Control-Allow-Credentials", "true");
            response.headers.set(
                "Access-Control-Allow-Methods",
                "GET, POST, PUT, PATCH, DELETE, OPTIONS"
            );
            response.headers.set(
                "Access-Control-Allow-Headers",
                "Content-Type, Authorization, X-CSRF-Token, X-Request-ID, X-Cron-Secret"
            );
            response.headers.set("Access-Control-Max-Age", "86400");
        }

        // Handle preflight requests
        if (request.method === "OPTIONS") {
            return new NextResponse(null, {
                status: 204,
                headers: response.headers,
            });
        }
    }

    // ==================== HIDE SENSITIVE INFO ====================

    // Remove server info headers
    response.headers.delete("X-Powered-By");
    response.headers.delete("Server");

    return response;
}

// ==================== MATCHER CONFIG ====================
export const config = {
    matcher: [
        /*
         * Match all request paths except for:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder
         */
        "/((?!_next/static|_next/image|favicon.ico|public/).*)",
    ],
};
