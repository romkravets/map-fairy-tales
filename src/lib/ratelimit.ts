// src/lib/ratelimit.ts
// Rate limiting utility.
// Uses Upstash Redis when env vars are set (production/Vercel).
// Falls back to in-memory when not configured (local dev / single-instance).

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// ── In-memory fallback ────────────────────────────────────────────────────────
const memStore = new Map<string, { count: number; resetAt: number }>();

function memLimit(
  key: string,
  limit: number,
  windowMs: number,
): { success: boolean; remaining: number } {
  const now = Date.now();
  const rec = memStore.get(key);

  if (!rec || now > rec.resetAt) {
    memStore.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: limit - 1 };
  }

  if (rec.count >= limit) {
    return { success: false, remaining: 0 };
  }

  rec.count += 1;
  return { success: true, remaining: limit - rec.count };
}

// ── Upstash limiter (production) ─────────────────────────────────────────────
// Strip stray quotes — some env managers wrap values in literal "..." chars
const stripQuotes = (s?: string) => s?.replace(/^["']+|["']+$/g, "").trim() || "";
const UPSTASH_URL = stripQuotes(process.env.UPSTASH_REDIS_REST_URL);
const UPSTASH_TOKEN = stripQuotes(process.env.UPSTASH_REDIS_REST_TOKEN);

function makeUpstashLimiter(limit: number, window: string, prefix: string): Ratelimit | null {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) return null;
  try {
    return new Ratelimit({
      redis: new Redis({ url: UPSTASH_URL, token: UPSTASH_TOKEN }),
      limiter: Ratelimit.slidingWindow(
        limit,
        window as `${number} ${"s" | "m" | "h" | "d"}`,
      ),
      prefix,
    });
  } catch {
    // Invalid URL or token — fall back to in-memory
    return null;
  }
}

// 5 story generations per user per minute
const storyLimiter = makeUpstashLimiter(5, "60 s", "rl:story");

// 20 comments per user per minute
const commentLimiter = makeUpstashLimiter(20, "60 s", "rl:comment");

// 20 credits checks per user per minute (polling every 8s = ~7/min normally)
const creditsLimiter = makeUpstashLimiter(20, "60 s", "rl:credits");

// ── Public API ────────────────────────────────────────────────────────────────
async function checkLimit(
  limiter: Ratelimit | null,
  key: string,
  fallbackLimit: number,
  windowMs: number,
): Promise<{ success: boolean; remaining: number }> {
  if (limiter) {
    try {
      const result = await limiter.limit(key);
      return { success: result.success, remaining: result.remaining };
    } catch {
      // Upstash unavailable — fall back to in-memory limiter
      return memLimit(key, fallbackLimit, windowMs);
    }
  }
  return memLimit(key, fallbackLimit, windowMs);
}

export async function checkStoryRateLimit(userId: string) {
  return checkLimit(storyLimiter, `story:${userId}`, 5, 60_000);
}

export async function checkCommentRateLimit(userId: string) {
  return checkLimit(commentLimiter, `comment:${userId}`, 20, 60_000);
}

export async function checkCreditsRateLimit(userId: string) {
  return checkLimit(creditsLimiter, `credits:${userId}`, 20, 60_000);
}
