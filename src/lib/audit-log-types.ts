// src/lib/audit-log-types.ts
// Types và constants dùng chung cho audit log
// Tách riêng khỏi route handler để tránh Next.js "named exports" error

export interface AuditLogEntry {
  id:         number;
  action:     string;
  entityType: string;
  actorId:    number | null;
  actorName:  string | null;
  oldValue:   Record<string, unknown> | null;
  newValue:   Record<string, unknown> | null;
  createdAt:  string;
}

export const ACTION_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  EMPLOYEE_CREATED:         { label: 'Tạo mới nhân viên',        color: '#10B981', icon: '🟢' },
  EMPLOYEE_UPDATED:         { label: 'Cập nhật thông tin',        color: '#F59E0B', icon: '✏️' },
  EMPLOYEE_DEACTIVATED:     { label: 'Ngừng hoạt động',          color: '#EF4444', icon: '🔴' },
  EMPLOYEE_REACTIVATED:     { label: 'Kích hoạt lại',            color: '#10B981', icon: '🔄' },
  ATTENDANCE_CORRECTED:     { label: 'Điều chỉnh chấm công',     color: '#8B5CF6', icon: '📋' },
  LEAVE_APPROVED:           { label: 'Duyệt nghỉ phép',          color: '#10B981', icon: '✅' },
  LEAVE_REJECTED:           { label: 'Từ chối nghỉ phép',        color: '#EF4444', icon: '❌' },
  OVERTIME_APPROVED:        { label: 'Duyệt tăng ca',            color: '#10B981', icon: '⏰' },
  OVERTIME_REJECTED:        { label: 'Từ chối tăng ca',          color: '#EF4444', icon: '⏰' },
  PASSWORD_RESET:           { label: 'Đặt lại mật khẩu',         color: '#6B7280', icon: '🔑' },
};
