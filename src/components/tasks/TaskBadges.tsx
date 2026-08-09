'use client';

import type { TaskStatus, TaskPriority } from '@/db/schema';
import { TASK_STATUS, TASK_PRIORITY } from '@/lib/constants';

interface TaskStatusBadgeProps {
  status: TaskStatus;
}

export function TaskStatusBadge({ status }: TaskStatusBadgeProps) {
  const config = TASK_STATUS[status];
  return (
    <span
      className="badge"
      style={{ color: config.color, background: config.bg, border: `1px solid ${config.color}33` }}
    >
      {config.label}
    </span>
  );
}

interface TaskPriorityBadgeProps {
  priority: TaskPriority;
}

export function TaskPriorityBadge({ priority }: TaskPriorityBadgeProps) {
  const config = TASK_PRIORITY[priority];
  return (
    <span className="badge" style={{ color: config.color, background: `${config.color}18` }}>
      {config.icon} {config.label}
    </span>
  );
}
