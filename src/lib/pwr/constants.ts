import type { PwrStatus, PwrCategory, PwrPriority, PwrLogType } from '@/db/schema';

// ============================================================
// STATUS CONFIG
// ============================================================
export const PWR_STATUS: Record<PwrStatus, { label: string; color: string; bg: string; icon: string }> = {
  INBOX:       { label: 'Há»™p thÆ° Ä‘áº¿n', color: '#06B6D4', bg: 'rgba(6,182,212,0.12)',   icon: 'ðŸ“¥' },
  TODO:        { label: 'Cáº§n lÃ m',     color: '#3B82F6', bg: 'rgba(59,130,246,0.12)',  icon: 'ðŸ“‹' },
  IN_PROGRESS: { label: 'Äang lÃ m',   color: '#F59E0B', bg: 'rgba(245,158,11,0.12)',  icon: 'âš™ï¸' },
  WAITING:     { label: 'Äang chá»',   color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)',  icon: 'â³' },
  DEFERRED:    { label: 'Dá»i láº¡i',    color: '#6B7280', bg: 'rgba(107,114,128,0.12)', icon: 'ðŸ“…' },
  DONE:        { label: 'HoÃ n thÃ nh', color: '#10B981', bg: 'rgba(16,185,129,0.12)',  icon: 'âœ…' },
  CANCELLED:   { label: 'ÄÃ£ há»§y',     color: '#EF4444', bg: 'rgba(239,68,68,0.12)',   icon: 'âŒ' },
};

// ============================================================
// CATEGORY CONFIG
// ============================================================
export const PWR_CATEGORY: Record<PwrCategory, { label: string; icon: string }> = {
  PRODUCTION: { label: 'Sáº£n xuáº¥t',   icon: 'ðŸ­' },
  MATERIAL:   { label: 'Váº­t tÆ°',     icon: 'ðŸ“¦' },
  EQUIPMENT:  { label: 'MÃ¡y mÃ³c',    icon: 'âš™ï¸' },
  PERSONNEL:  { label: 'NhÃ¢n sá»±',    icon: 'ðŸ‘¥' },
  ORDER:      { label: 'ÄÆ¡n hÃ ng',   icon: 'ðŸ“‹' },
  PROJECT:    { label: 'Dá»± Ã¡n',      icon: 'ðŸ—ï¸' },
  ADMIN:      { label: 'HÃ nh chÃ­nh', icon: 'ðŸ“' },
  INCIDENT:   { label: 'PhÃ¡t sinh',  icon: 'âš¡' },
  OTHER:      { label: 'KhÃ¡c',       icon: 'ðŸ“Œ' },
};

// ============================================================
// PRIORITY CONFIG
// ============================================================
export const PWR_PRIORITY: Record<PwrPriority, { label: string; color: string; icon: string }> = {
  CRITICAL: { label: 'Kháº©n cáº¥p',  color: '#EF4444', icon: 'ðŸ”´' },
  HIGH:     { label: 'Cao',        color: '#F59E0B', icon: 'ðŸŸ¡' },
  MEDIUM:   { label: 'Trung bÃ¬nh', color: '#3B82F6', icon: 'ðŸ”µ' },
  LOW:      { label: 'Tháº¥p',       color: '#10B981', icon: 'ðŸŸ¢' },
};

// ============================================================
// LOG TYPE CONFIG
// ============================================================
export const PWR_LOG_TYPE: Record<PwrLogType, { label: string; color: string }> = {
  PROGRESS_UPDATE: { label: 'Cáº­p nháº­t tiáº¿n Ä‘á»™', color: '#3B82F6' },
  ISSUE_LOG:       { label: 'Ghi nháº­n váº¥n Ä‘á»',  color: '#EF4444' },
  RESOLUTION_LOG:  { label: 'Giáº£i quyáº¿t',        color: '#10B981' },
  HANDOFF_LOG:     { label: 'BÃ n giao',          color: '#8B5CF6' },
  COMPLETION_LOG:  { label: 'HoÃ n thÃ nh',        color: '#10B981' },
  NOTE:            { label: 'Ghi chÃº',           color: '#6B7280' },
  SYSTEM:          { label: 'Há»‡ thá»‘ng',          color: '#374151' },
};

// ============================================================
// STATE MACHINE
// ============================================================
export const VALID_TRANSITIONS: Record<PwrStatus, PwrStatus[]> = {
  INBOX:       ['TODO', 'CANCELLED'],
  TODO:        ['IN_PROGRESS', 'DEFERRED', 'CANCELLED'],
  IN_PROGRESS: ['DONE', 'WAITING', 'DEFERRED', 'CANCELLED'],
  WAITING:     ['IN_PROGRESS', 'DONE', 'CANCELLED'],
  DEFERRED:    ['TODO', 'CANCELLED'],
  DONE:        ['IN_PROGRESS', 'TODO'],
  CANCELLED:   [],
};

// Terminal states â€” ONLY DONE and CANCELLED
// DEFERRED is NOT terminal â€” task váº«n active, cÃ³ thá»ƒ trá»Ÿ nÃªn overdue
export const TERMINAL_STATUSES: PwrStatus[] = ['DONE', 'CANCELLED'];

// Statuses cáº§n extra input khi chuyá»ƒn
export const TRANSITION_REQUIRES: Partial<Record<PwrStatus, string[]>> = {
  WAITING:  ['waitingFor'],
  DEFERRED: ['deferredTo'],
};

// Business timezone = Asia/Ho_Chi_Minh
// Vietnam has no DST â€” UTC+7 offset is constant
export const BUSINESS_TZ = 'Asia/Ho_Chi_Minh';

// Helper: get today YYYY-MM-DD in business timezone
export function getTodayVN(): string {
  const nowVN = new Date(Date.now() + 7 * 60 * 60 * 1000);
  return nowVN.toISOString().split('T')[0];
}

export const WAITING_ALERT_DAYS  = 3;
export const LOG_GRACE_PERIOD_MS = 15 * 60 * 1000;

// ============================================================
// COMMON PERSONNEL / CONTACTS (Datalist suggestions)
// ============================================================
export const PWR_COMMON_PEOPLE = [
  'Tổ trưởng Minh',
  'Tổ trưởng Sơn',
  'Anh Quân (Giám đốc xưởng)',
  'Phòng Thiết kế',
  'Khách hàng',
];
