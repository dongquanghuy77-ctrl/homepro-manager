'use client';

import type { PwrPriority } from '@/db/schema';
import { PWR_PRIORITY } from '@/lib/pwr/constants';

export default function PwrPriorityBadge({ priority }: { priority: PwrPriority }) {
  const cfg = PWR_PRIORITY[priority];
  if (!cfg) return null;
  return (
    <span style={{ fontSize: 11, fontWeight: 600, color: cfg.color, whiteSpace: 'nowrap' }}>
      {cfg.icon} {cfg.label}
    </span>
  );
}
