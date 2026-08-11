// src/lib/ratelimit.ts
// Rate limiting using Upstash Redis — blocks brute-force attacks on auth endpoints
// Graceful fallback: nếu không có Redis config thì bỏ qua rate limiting (dev mode)

let loginRatelimitInstance: import('@upstash/ratelimit').Ratelimit | null = null;
let changePasswordRatelimitInstance: import('@upstash/ratelimit').Ratelimit | null = null;

const REDIS_URL   = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

if (REDIS_URL && REDIS_TOKEN) {
  // Redis đã được cấu hình — bật rate limiting
  const { Ratelimit } = require('@upstash/ratelimit');
  const { Redis }     = require('@upstash/redis');

  const redis = new Redis({ url: REDIS_URL, token: REDIS_TOKEN });

  loginRatelimitInstance = new Ratelimit({
    redis,
    limiter:   Ratelimit.slidingWindow(5, '60 s'),
    analytics: true,
    prefix:    'homepro:login',
  });

  changePasswordRatelimitInstance = new Ratelimit({
    redis,
    limiter:   Ratelimit.slidingWindow(3, '5 m'),
    analytics: true,
    prefix:    'homepro:changepwd',
  });
} else {
  // Không có Redis — rate limiting bị tắt (chấp nhận được cho demo/dev)
  if (process.env.NODE_ENV === 'production') {
    console.warn('[RateLimit] UPSTASH_REDIS_REST_URL / TOKEN chưa cấu hình. Rate limiting bị tắt.');
  }
}

// ─── Wrapper an toàn — không crash khi Redis null ─────────────────────────────
export async function checkLoginRateLimit(ip: string): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  if (!loginRatelimitInstance) return { success: true, limit: 999, remaining: 999, reset: Date.now() };
  return loginRatelimitInstance.limit(ip);
}

export async function checkChangePasswordRateLimit(userId: string): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  if (!changePasswordRatelimitInstance) return { success: true, limit: 999, remaining: 999, reset: Date.now() };
  return changePasswordRatelimitInstance.limit(userId);
}

// Helper: get IP from request headers (works behind Vercel proxy)
export function getIP(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() ?? 'unknown';
  return ip;
}

// Legacy exports (backward compat — một số route có thể import trực tiếp)
export const loginRatelimit         = loginRatelimitInstance;
export const changePasswordRatelimit = changePasswordRatelimitInstance;
