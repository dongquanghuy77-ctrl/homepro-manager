// sentry.client.config.ts
// Runs in the browser — captures JS errors, unhandled promises, performance
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Capture 10% of transactions for performance monitoring (free tier friendly)
  tracesSampleRate: 0.1,

  // Only enable Sentry in production — no noise during development
  enabled: process.env.NODE_ENV === 'production',

  // Show Sentry dialog when user encounters an error
  beforeSend(event) {
    // Strip any PII from error events before sending
    if (event.user) {
      delete event.user.email;
      delete event.user.ip_address;
    }
    return event;
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
