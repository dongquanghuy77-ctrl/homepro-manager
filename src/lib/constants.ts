import type { TaskStatus, TaskPriority, ProjectStatus } from '@/db/schema';

// ============================================================
// TASK STATUS
// ============================================================
export const TASK_STATUS: Record<TaskStatus, { label: string; color: string; bg: string }> = {
  NOT_STARTED: { label: 'Chưa bắt đầu', color: '#94A3B8', bg: 'rgba(148,163,184,0.12)' },
  IN_PROGRESS: { label: 'Đang thực hiện', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  COMPLETED: { label: 'Hoàn thành', color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
  PAUSED: { label: 'Tạm dừng', color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)' },
  OVERDUE: { label: 'Quá hạn', color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
};

// ============================================================
// TASK PRIORITY
// ============================================================
export const TASK_PRIORITY: Record<TaskPriority, { label: string; color: string; icon: string }> = {
  HIGH: { label: 'Cao', color: '#EF4444', icon: '🔴' },
  MEDIUM: { label: 'Trung bình', color: '#F59E0B', icon: '🟡' },
  LOW: { label: 'Thấp', color: '#10B981', icon: '🟢' },
};

// ============================================================
// PROJECT STATUS
// ============================================================
export const PROJECT_STATUS: Record<ProjectStatus, { label: string; color: string }> = {
  ACTIVE: { label: 'Đang thực hiện', color: '#F59E0B' },
  COMPLETED: { label: 'Hoàn thành', color: '#10B981' },
  ON_HOLD: { label: 'Tạm dừng', color: '#8B5CF6' },
  CANCELLED: { label: 'Đã hủy', color: '#EF4444' },
};

// ============================================================
// SIDEBAR NAVIGATION
// ============================================================
export const SIDEBAR_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', href: '/', sprint: 1 },
  { id: 'projects', label: 'Dự án', icon: 'Briefcase', href: '/projects', sprint: 1 },
  { id: 'tasks', label: 'Công việc', icon: 'CheckSquare', href: '/tasks', sprint: 1 },
  { id: 'progress', label: 'Tiến độ', icon: 'TrendingUp', href: '/progress', sprint: 1 },
  { id: 'qc', label: 'QC / Lỗi', icon: 'ShieldAlert', href: '/qc', sprint: 2 },
  { id: 'logs', label: 'Nhật ký', icon: 'BookOpen', href: '/logs', sprint: 3 },
  { id: 'materials', label: 'Vật tư', icon: 'Package', href: '/materials', sprint: 4 },
  { id: 'costs', label: 'Chi phí', icon: 'DollarSign', href: '/costs', sprint: 4 },
  { id: 'customers', label: 'Khách hàng', icon: 'Users', href: '/customers', sprint: 5 },
  { id: 'settings', label: 'Cài đặt', icon: 'Settings', href: '/settings', sprint: 2 },
] as const;

// ============================================================
// TASK CATEGORIES
// ============================================================
export const TASK_CATEGORIES = [
  'Thiết kế',
  'Vật tư',
  'Thi công',
  'Lắp đặt',
  'QC',
  'Hoàn thiện',
  'Khác',
];

// ============================================================
// ASSIGNEES (will be dynamic in later sprint)
// ============================================================
export const DEFAULT_ASSIGNEES = ['Huy', 'Minh', 'Tuấn', 'Long', 'An'];
