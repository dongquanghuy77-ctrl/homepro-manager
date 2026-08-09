'use client';
// src/app/global-error.tsx
// Catches unhandled React rendering errors and reports them to Sentry
import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="vi">
      <body style={{ fontFamily: 'sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0f172a', color: '#f1f5f9' }}>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⚠️</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
            Hệ thống gặp lỗi không mong muốn
          </h1>
          <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>
            Đội kỹ thuật đã được thông báo và sẽ xử lý sớm nhất có thể.
          </p>
          <button
            onClick={reset}
            style={{
              background: '#3b82f6', color: 'white', border: 'none',
              padding: '0.75rem 1.5rem', borderRadius: '8px',
              cursor: 'pointer', fontSize: '1rem',
            }}
          >
            🔄 Thử lại
          </button>
        </div>
      </body>
    </html>
  );
}
