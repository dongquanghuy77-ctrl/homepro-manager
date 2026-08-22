'use client';

import type { PwrStatus } from '@/db/schema';
import { PWR_STATUS } from '@/lib/pwr/constants';

export default function PwrStatusBadge({ status }: { status: PwrStatus }) {
  const cfg = PWR_STATUS[status];
  if (!cfg) return null;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        padding: '2px 8px',
        borderRadius: 99,
        fontSize: 11,
        fontWeight: 600,
        color: cfg.color,
        background: cfg.bg,
        whiteSpace: 'nowrap',
      }}
    >
      {cfg.icon} {cfg.label}
    </span>
  );
}
