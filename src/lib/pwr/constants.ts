import type { PwrStatus, PwrCategory, PwrPriority, PwrLogType } from '@/db/schema';

// ============================================================
// STATUS CONFIG
// ============================================================
export const PWR_STATUS: Record<PwrStatus, { label: string; color: string; bg: string; icon: string }> = {
  INBOX:       { label: 'Hộp thư đến', color: '#06B6D4', bg: 'rgba(6,182,212,0.12)',   icon: '📥' },
  TODO:        { label: 'Cần làm',     color: '#3B82F6', bg: 'rgba(59,130,246,0.12)',  icon: '📋' },
  IN_PROGRESS: { label: 'Đang làm',   color: '#F59E0B', bg: 'rgba(245,158,11,0.12)',  icon: '⚙️' },
  WAITING:     { label: 'Đang chờ',   color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)',  icon: '⏳' },
  DEFERRED:    { label: 'Dời lại',    color: '#6B7280', bg: 'rgba(107,114,128,0.12)', icon: '📅' },
  DONE:        { label: 'Hoàn thành', color: '#10B981', bg: 'rgba(16,185,129,0.12)',  icon: '✅' },
  CANCELLED:   { label: 'Đã hủy',     color: '#EF4444', bg: 'rgba(239,68,68,0.12)',   icon: '❌' },
};

// ============================================================
// CATEGORY CONFIG
// ============================================================
export const PWR_CATEGORY: Record<PwrCategory, { label: string; icon: string }> = {
  PRODUCTION: { label: 'Sản xuất',   icon: '🏭' },
  MATERIAL:   { label: 'Vật tư',     icon: '📦' },
  EQUIPMENT:  { label: 'Máy móc',    icon: '⚙️' },
  PERSONNEL:  { label: 'Nhân sự',    icon: '👥' },
  ORDER:      { label: 'Đơn hàng',   icon: '📋' },
  PROJECT:    { label: 'Dự án',      icon: '🏗️' },
  ADMIN:      { label: 'Hành chính', icon: '📝' },
  INCIDENT:   { label: 'Phát sinh',  icon: '⚡' },
  OTHER:      { label: 'Khác',       icon: '📌' },
};

// ============================================================
// PRIORITY CONFIG
// ============================================================
export const PWR_PRIORITY: Record<PwrPriority, { label: string; color: string; icon: string }> = {
  CRITICAL: { label: 'Khẩn cấp',  color: '#EF4444', icon: '🔴' },
  HIGH:     { label: 'Cao',        color: '#F59E0B', icon: '🟡' },
  MEDIUM:   { label: 'Trung bình', color: '#3B82F6', icon: '🔵' },
  LOW:      { label: 'Thấp',       color: '#10B981', icon: '🟢' },
};

// ============================================================
// LOG TYPE CONFIG
// ============================================================
export const PWR_LOG_TYPE: Record<PwrLogType, { label: string; color: string }> = {
  PROGRESS_UPDATE: { label: 'Cập nhật tiến độ', color: '#3B82F6' },
  ISSUE_LOG:       { label: 'Ghi nhận vấn đề',  color: '#EF4444' },
  RESOLUTION_LOG:  { label: 'Giải quyết',        color: '#10B981' },
  HANDOFF_LOG:     { label: 'Bàn giao',          color: '#8B5CF6' },
  COMPLETION_LOG:  { label: 'Hoàn thành',        color: '#10B981' },
  NOTE:            { label: 'Ghi chú',           color: '#6B7280' },
  SYSTEM:          { label: 'Hệ thống',          color: '#374151' },
};

// ============================================================
// STATE MACHINE
// ============================================================
export const VALID_TRANSITIONS: Record<PwrStatus, PwrStatus[]> = {
  // Personal task manager — allow direct DONE from early states.
  // INBOX/TODO → DONE: task was done immediately without formal planning step.
  // WAITING/DEFERRED → DONE: must re-activate first (enforces intentional flow).
  INBOX:       ['TODO', 'CANCELLED', 'DONE'],
  TODO:        ['IN_PROGRESS', 'DEFERRED', 'CANCELLED', 'DONE'],
  IN_PROGRESS: ['DONE', 'WAITING', 'DEFERRED', 'CANCELLED'],
  WAITING:     ['IN_PROGRESS', 'DONE', 'CANCELLED'],
  DEFERRED:    ['TODO', 'CANCELLED'],
  DONE:        ['IN_PROGRESS', 'TODO'],
  CANCELLED:   [],
};

// Terminal states — ONLY DONE and CANCELLED
// DEFERRED is NOT terminal — task vẫn active, có thể trở nên overdue
export const TERMINAL_STATUSES: PwrStatus[] = ['DONE', 'CANCELLED'];

// Statuses cần extra input khi chuyển
export const TRANSITION_REQUIRES: Partial<Record<PwrStatus, string[]>> = {
  WAITING:  ['waitingFor'],
  DEFERRED: ['deferredTo'],
};

// Business timezone = Asia/Ho_Chi_Minh
// Vietnam has no DST — UTC+7 offset is constant
export const BUSINESS_TZ = 'Asia/Ho_Chi_Minh';

// Helper: get today YYYY-MM-DD in business timezone (GMT+7)
// Sử dụng Intl API chuẩn — không dùng offset thủ công để tránh lỗi múi giờ DST
export function getTodayVN(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });
}

export const WAITING_ALERT_DAYS  = 3;
export const LOG_GRACE_PERIOD_MS = 15 * 60 * 1000;
