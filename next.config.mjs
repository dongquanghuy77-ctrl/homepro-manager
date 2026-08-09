// @ts-check
import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['better-sqlite3'],
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.sentry.io",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob:",
              "connect-src 'self' https://*.neon.tech wss://*.neon.tech https://*.sentry.io https://*.ingest.de.sentry.io",
              "frame-ancestors 'none'",
            ].join('; '),
          },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // Sentry organization and project from DSN
  org: 'donghuy',
  project: 'homepro-manager',

  // Only upload source maps in CI/production builds to save time locally
  silent: !process.env.CI,

  // Automatically instrument Next.js data fetching methods, route handlers
  autoInstrumentServerFunctions: true,

  // Disable source map upload if SENTRY_AUTH_TOKEN not set (optional)
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },

  // Prevents Sentry from adding extra bloat in dev mode
  disableLogger: true,
});
