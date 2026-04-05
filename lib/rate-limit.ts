// lib/rate-limit.ts
// Production-grade rate limiting using Upstash Redis for Vercel environments.
// Falls back to in-memory limiting if Redis credentials are not provided.

import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

// ── Types ─────────────────────────────────────────────────────────────────────

interface RateLimitConfig {
  /** Maximum number of requests allowed within the window. */
  maxRequests: number;
  /** Time window in seconds. */
  windowSecs: number;
}

// ── Presets for different endpoint categories ─────────────────────────────────

export const RATE_LIMITS = {
  /** Chat endpoints — conversational, moderate use expected */
  chat: { maxRequests: 20, windowSecs: 60 } as RateLimitConfig,

  /** Generation endpoints (quiz, flashcards, exam, summary, chapters) — heavy AI calls */
  generation: { maxRequests: 30, windowSecs: 60 } as RateLimitConfig,

  /** Polish / transcription — moderate AI calls */
  utility: { maxRequests: 15, windowSecs: 60 } as RateLimitConfig,

  /** Auth callback — very generous, but still capped */
  auth: { maxRequests: 5, windowSecs: 900 } as RateLimitConfig,
} as const;

// ── Shared Helper to extract IP ──────────────────────────────────────────────

function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIP = req.headers.get("x-real-ip");
  if (realIP) return realIP.trim();
  return "127.0.0.1";
}

// ── Upstash Redis Implementation ──────────────────────────────────────────────

let redis: Redis | null = null;
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

/**
 * Creates one Ratelimit instance per config to take advantage of caching.
 */
const ratelimitCache = new Map<string, Ratelimit>();

function getRedisRatelimiter(config: RateLimitConfig, prefix: string): Ratelimit | null {
  if (!redis) return null;
  const cacheKey = `${prefix}:${config.maxRequests}:${config.windowSecs}`;
  if (!ratelimitCache.has(cacheKey)) {
    ratelimitCache.set(
      cacheKey,
      new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(config.maxRequests, `${config.windowSecs} s`),
        prefix: `@reviseforge/ratelimit/${prefix}`,
      })
    );
  }
  return ratelimitCache.get(cacheKey)!;
}

// ── In-Memory Implementation (Fallback) ───────────────────────────────────────

interface RateLimitEntry {
  timestamps: number[];
}
const memoryStore = new Map<string, RateLimitEntry>();

function applyMemoryRateLimit(
  config: RateLimitConfig,
  key: string
): { success: boolean; limit: number; remaining: number; reset: number } {
  const now = Date.now();
  const windowMs = config.windowSecs * 1000;

  let entry = memoryStore.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    memoryStore.set(key, entry);
  }

  // Slide the window
  entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);

  if (entry.timestamps.length >= config.maxRequests) {
    return {
      success: false,
      limit: config.maxRequests,
      remaining: 0,
      reset: Math.ceil((entry.timestamps[0] + windowMs) / 1000),
    };
  }

  entry.timestamps.push(now);
  return {
    success: true,
    limit: config.maxRequests,
    remaining: config.maxRequests - entry.timestamps.length,
    reset: Math.ceil((now + windowMs) / 1000),
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Unified rate limit check. Automatically uses Upstash Redis if available, 
 * falling back to local memory if not. 
 */
export async function applyRateLimit(
  req: NextRequest,
  config: RateLimitConfig,
  prefix: string
): Promise<NextResponse | null> {
  const ip = getClientIP(req);
  const identifier = `${prefix}:${ip}`;

  const redisLimiter = getRedisRatelimiter(config, prefix);

  let result;
  if (redisLimiter) {
    // ── Use Upstash Redis ──────────────────────────────────────────────────────
    const { success, limit, remaining, reset } = await redisLimiter.limit(identifier);
    result = { success, limit, remaining, reset };
  } else {
    // ── Use In-Memory (Dev/Fallback) ──────────────────────────────────────────
    // Note: We warn only in dev to remind you to set up Redis for production.
    if (process.env.NODE_ENV === "development") {
      console.warn(`[RateLimit] Falling back to memory for: ${prefix}`);
    }
    result = applyMemoryRateLimit(config, identifier);
  }

  if (!result.success) {
    const retryAfter = Math.max(0, result.reset - Math.ceil(Date.now() / 1000));
    return NextResponse.json(
      {
        error: "Too many requests. Please slow down and try again shortly.",
        retryAfter,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": String(result.limit),
          "X-RateLimit-Remaining": String(result.remaining),
          "X-RateLimit-Reset": String(result.reset),
        },
      }
    );
  }

  return null;
}
