// src/config/navigation.ts

export type WorkspaceId =
  | 'dashboard'
  | 'operations'
  | 'hr'
  | 'finance'
  | 'projects'
  | 'inventory'
  | 'production'
  | 'system';

export interface NavItem {
  id: string;
  label: string;
  icon: string;
  href: string;
  sprint: number;
  adminOnly?: boolean;
  managerOnly?: boolean;
  requiredPermission?: string;
  isGroupHeader?: boolean;
  groupId?: string;
}

export interface WorkspaceConfig {
  id: WorkspaceId;
  label: string;
  icon: string;
  routes: string[]; // Danh sách các route pattern thuộc workspace này để tự động active
  navItems: NavItem[];
}

// Map các route cũ để giữ nguyên backward compatibility
export const WORKSPACES: WorkspaceConfig[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'LayoutDashboard',
    routes: ['/'],
    navItems: [
      { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', href: '/', sprint: 1 },
    ],
  },
  {
    id: 'operations',
    label: 'Điều hành',
    icon: 'Activity',
    routes: ['/progress', '/tasks', '/logs'],
    navItems: [
      { id: 'progress', label: 'Tiến độ', icon: 'TrendingUp', href: '/progress', sprint: 1 },
      { id: 'tasks', label: 'Công việc', icon: 'CheckSquare', href: '/tasks', sprint: 1 },
      { id: 'logs', label: 'Nhật ký', icon: 'BookOpen', href: '/logs', sprint: 3 },
    ],
  },
  {
    id: 'hr',
    label: 'Nhân sự',
    icon: 'Users',
    routes: ['/hr', '/employees', '/attendance', '/leave', '/overtime', '/payroll'],
    navItems: [
      { id: 'hr-dash', label: 'Tổng quan', icon: 'PieChart', href: '/hr', sprint: 6 },
      { id: 'employees', label: 'Nhân viên', icon: 'UserCog', href: '/employees', sprint: 6, managerOnly: true },
      { id: 'attendance', label: 'Chấm công', icon: 'Clock', href: '/attendance', sprint: 6, managerOnly: true },
      { id: 'leave', label: 'Nghỉ phép', icon: 'CalendarDays', href: '/leave', sprint: 6 },
      { id: 'overtime', label: 'Tăng ca', icon: 'Timer', href: '/overtime', sprint: 6 },
      { id: 'payroll', label: 'Bảng lương', icon: 'Banknote', href: '/payroll', sprint: 6, requiredPermission: 'payroll.view' },
      { id: 'hr-reports', label: 'Báo cáo NS', icon: 'FileBarChart2', href: '/hr/reports', sprint: 6, managerOnly: true },
      { id: 'hr-disputes', label: 'Khiếu nại', icon: 'Inbox', href: '/hr/disputes', sprint: 6, managerOnly: true },
    ],
  },
  {
    id: 'finance',
    label: 'Tài chính - Kế toán',
    icon: 'DollarSign',
    routes: ['/chi-phi'],
    navItems: [
      { id: 'costs', label: 'Chi phí dự án', icon: 'DollarSign', href: '/chi-phi', sprint: 5 },
    ],
  },
  {
    id: 'projects',
    label: 'Dự án',
    icon: 'Briefcase',
    routes: ['/projects', '/khach-hang'],
    navItems: [
      { id: 'projects', label: 'Dự án', icon: 'Briefcase', href: '/projects', sprint: 1 },
      { id: 'customers', label: 'Khách hàng', icon: 'Users', href: '/khach-hang', sprint: 5 },
    ],
  },
  {
    id: 'inventory',
    label: 'Vật tư - Kho',
    icon: 'Package',
    routes: ['/vat-tu'],
    navItems: [
      { id: 'materials', label: 'Danh mục Vật tư', icon: 'Package', href: '/vat-tu', sprint: 4 },
    ],
  },
  {
    id: 'production',
    label: 'Sản xuất',
    icon: 'Factory',
    routes: ['/bom', '/tracking', '/qc'],
    navItems: [
      { id: 'bom', label: 'BOQ / BOM', icon: 'ClipboardList', href: '/bom', sprint: 7, managerOnly: true },
      { id: 'tracking', label: 'Theo dõi QR', icon: 'ScanLine', href: '/tracking', sprint: 7, managerOnly: true },
      { id: 'qc', label: 'QC / Lỗi', icon: 'ShieldAlert', href: '/qc', sprint: 3 },
      { id: 'bom-report', label: 'Ngân sách', icon: 'BarChart2', href: '/bom/report', sprint: 7, managerOnly: true },
    ],
  },
  {
    id: 'system',
    label: 'Hệ thống',
    icon: 'Settings',
    routes: ['/admin', '/settings'],
    navItems: [
      { id: 'users', label: 'Phân quyền', icon: 'UserCheck', href: '/admin/users', sprint: 1, adminOnly: true },
      { id: 'settings', label: 'Cài đặt', icon: 'Settings', href: '/settings', sprint: 5 },
    ],
  },
];

/**
 * Trả về workspace hiện tại dựa trên URL pathname.
 */
export function getActiveWorkspace(pathname: string): WorkspaceConfig | undefined {
  // Ưu tiên khớp chính xác trước (cho '/')
  if (pathname === '/') return WORKSPACES.find(w => w.id === 'dashboard');

  return WORKSPACES.find(w => 
    w.routes.some(route => route !== '/' && pathname.startsWith(route))
  ) || WORKSPACES.find(w => w.id === 'dashboard'); // Default fallback
}
