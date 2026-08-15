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
    routes: ['/inventory'],
    navItems: [
      { id: 'inv-dash', label: 'Tổng quan Kho', icon: 'LayoutDashboard', href: '/inventory/dashboard', sprint: 4 },
      { id: 'materials', label: 'Danh mục Vật tư', icon: 'Package', href: '/inventory/materials', sprint: 4 },
      { id: 'suppliers', label: 'Nhà cung cấp', icon: 'Users', href: '/inventory/suppliers', sprint: 6 },
      { id: 'warehouses', label: 'Kho & Kệ', icon: 'Grid', href: '/inventory/warehouses', sprint: 4 },
      { id: 'transactions', label: 'Nhập/Xuất/Chuyển', icon: 'Activity', href: '/inventory/transactions', sprint: 4 },
      { id: 'reservations', label: 'Giữ hàng Dự án', icon: 'Briefcase', href: '/inventory/reservations', sprint: 4 },
      { id: 'stock-counts', label: 'Kiểm kê', icon: 'ClipboardList', href: '/inventory/counts', sprint: 4 },
    ],
  },
  {
    id: 'production',
    label: 'Sản xuất',
    icon: 'Factory',
    routes: ['/production', '/bom', '/tracking', '/qc'],
    navItems: [
      { id: 'prod-dash', label: 'Tổng quan sản xuất', icon: 'PieChart', href: '/production', sprint: 7 },
      { id: 'boq', label: 'BOQ/BOM', icon: 'ClipboardList', href: '/bom', sprint: 7, managerOnly: true },
      { id: 'prod-products', label: 'Danh mục thành phẩm', icon: 'Package', href: '/production/products', sprint: 7 },
      { id: 'prod-boms', label: 'Định mức vật tư', icon: 'FileBarChart2', href: '/production/boms', sprint: 7 },
      { id: 'prod-plans', label: 'Kế hoạch sản xuất', icon: 'CalendarDays', href: '/production/plans', sprint: 7 },
      { id: 'prod-orders', label: 'Lệnh sản xuất', icon: 'ClipboardList', href: '/production/orders', sprint: 7 },
      { id: 'prod-routing', label: 'Routing / Công đoạn', icon: 'Activity', href: '/production/routing', sprint: 7 },
      { id: 'prod-workcenters', label: 'Work Center / Tổ sản xuất', icon: 'Users', href: '/production/work-centers', sprint: 7 },
      { id: 'prod-machines', label: 'Máy móc', icon: 'Settings', href: '/production/machines', sprint: 7 },
      { id: 'prod-jobcards', label: 'Job Card / Thẻ công việc', icon: 'CheckSquare', href: '/production/job-cards', sprint: 7 },
      { id: 'prod-issues', label: 'Cấp phát vật tư', icon: 'Package', href: '/production/issues', sprint: 7 },
      { id: 'prod-tracking', label: 'Theo dõi sản xuất', icon: 'ScanLine', href: '/tracking', sprint: 7 },
      { id: 'prod-scrap', label: 'Phế phẩm', icon: 'ShieldAlert', href: '/production/scrap', sprint: 7 },
      { id: 'qc-production', label: 'QC sản xuất', icon: 'ShieldAlert', href: '/qc', sprint: 7 },
      { id: 'prod-receipts', label: 'Nhập thành phẩm', icon: 'Inbox', href: '/production/receipts', sprint: 7 },
      { id: 'prod-costing', label: 'Giá thành sản xuất', icon: 'DollarSign', href: '/production/costing', sprint: 7 },
      { id: 'prod-progress', label: 'Tiến độ sản xuất', icon: 'TrendingUp', href: '/production/progress', sprint: 7 },
      { id: 'prod-dashboard', label: 'Dashboard sản xuất', icon: 'LayoutDashboard', href: '/production/dashboard', sprint: 7 },
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
