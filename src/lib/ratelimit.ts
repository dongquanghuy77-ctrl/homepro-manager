// src/lib/ratelimit.ts
// Rate limiting using Upstash Redis — blocks brute-force attacks on auth endpoints
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Login: max 5 attempts per IP per 60 seconds
export const loginRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '60 s'),
  analytics: true,
  prefix: 'homepro:login',
});

// Change password: max 3 attempts per user per 5 minutes
export const changePasswordRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, '5 m'),
  analytics: true,
  prefix: 'homepro:changepwd',
});

// Helper: get IP from request headers (works behind Vercel proxy)
export function getIP(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() ?? 'unknown';
  return ip;
}
