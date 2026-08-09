// sentry.edge.config.ts
// Runs in Edge Runtime (middleware) — lightweight error capture
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Lower sample rate for edge
  tracesSampleRate: 0.05,

  // Only enable in production
  enabled: process.env.NODE_ENV === 'production',
});
