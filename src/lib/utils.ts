import { format, differenceInDays, parseISO, isAfter, isBefore } from 'date-fns';
import { vi } from 'date-fns/locale';
import type { Task } from '@/db/schema';

// ============================================================
// DATE UTILITIES
// ============================================================

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    return format(parseISO(dateStr), 'dd/MM/yyyy', { locale: vi });
  } catch {
    return dateStr;
  }
}

export function formatDateFull(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    return format(parseISO(dateStr), "EEEE, dd 'tháng' MM yyyy", { locale: vi });
  } catch {
    return dateStr;
  }
}

export function daysUntilDeadline(deadlineStr: string | null | undefined): number | null {
  if (!deadlineStr) return null;
  try {
    const deadline = parseISO(deadlineStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return differenceInDays(deadline, today);
  } catch {
    return null;
  }
}

export function isOverdue(endDateStr: string | null | undefined, status: string): boolean {
  if (!endDateStr || status === 'COMPLETED') return false;
  try {
    const endDate = parseISO(endDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return isBefore(endDate, today);
  } catch {
    return false;
  }
}

export function isTaskOverdue(task: Task): boolean {
  return isOverdue(task.endDate, task.status);
}

export function getDeadlineStatus(days: number | null): 'safe' | 'warning' | 'critical' | 'overdue' {
  if (days === null) return 'safe';
  if (days < 0) return 'overdue';
  if (days <= 7) return 'critical';
  if (days <= 21) return 'warning';
  return 'safe';
}

// ============================================================
// PROGRESS CALCULATION
// ============================================================

export function calculateProjectProgress(tasks: Task[]): number {
  if (tasks.length === 0) return 0;
  const totalProgress = tasks.reduce((sum, task) => sum + (task.progress ?? 0), 0);
  return Math.round(totalProgress / tasks.length);
}

export function getTaskStats(tasks: Task[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const stats = {
    total: tasks.length,
    completed: 0,
    inProgress: 0,
    notStarted: 0,
    paused: 0,
    overdue: 0,
  };

  for (const task of tasks) {
    // Check overdue: not completed, end_date in the past
    const isOver = isTaskOverdue(task);

    if (task.status === 'COMPLETED') {
      stats.completed++;
    } else if (isOver || task.status === 'OVERDUE') {
      stats.overdue++;
    } else if (task.status === 'IN_PROGRESS') {
      stats.inProgress++;
    } else if (task.status === 'PAUSED') {
      stats.paused++;
    } else {
      stats.notStarted++;
    }
  }

  return stats;
}

// ============================================================
// CURRENCY
// ============================================================

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

// ============================================================
// MISC
// ============================================================

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function toDateInputValue(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  try {
    return dateStr.substring(0, 10); // YYYY-MM-DD
  } catch {
    return '';
  }
}
