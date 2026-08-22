// src/config/navigation.ts

export type WorkspaceId =
  | 'dashboard'
  | 'source-center'
  | 'operations'
  | 'hr'
  | 'finance'
  | 'projects'
  | 'inventory'
  | 'production'
  | 'system'
  | 'crm'
  | 'engineering'
  | 'purchasing'
  | 'installation'
  | 'approval-center'
  | 'pwr';

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
    id: 'source-center',
    label: 'Source Data Center',
    icon: 'Inbox',
    routes: ['/source-center', '/source-center/ingestion', '/approval-center'],
    navItems: [
      { id: 'src-grp', label: 'Source Center', icon: '', href: '#', sprint: 1, isGroupHeader: true },
      { id: 'src-ingestion', label: 'Ingestion Dashboard', icon: 'Layers', href: '/source-center/ingestion', sprint: 1 },
      { id: 'src-dash', label: 'Danh sách File nguồn', icon: 'Inbox', href: '/source-center', sprint: 1 },
      { id: 'approval-center', label: 'Approval Center', icon: 'CheckCircle', href: '/approval-center', sprint: 1 },
    ],
  },
  {
    id: 'operations',
    label: 'Điều hành chung',
    icon: 'Activity',
    routes: ['/progress', '/tasks', '/logs'],
    navItems: [
      { id: 'progress', label: 'Tiến độ tổng', icon: 'TrendingUp', href: '/progress', sprint: 1 },
      { id: 'tasks', label: 'Công việc', icon: 'CheckSquare', href: '/tasks', sprint: 1 },
      { id: 'logs', label: 'Nhật ký hệ thống', icon: 'BookOpen', href: '/logs', sprint: 3 },
    ],
  },
  {
    id: 'crm',
    label: 'Kinh doanh & CRM',
    icon: 'UserPlus',
    routes: ['/crm'],
    navItems: [
      { id: 'crm-grp', label: 'Tổng quan', icon: '', href: '#', sprint: 7, isGroupHeader: true },
      { id: 'crm-dashboard', label: 'Dashboard CRM', icon: 'BarChart3', href: '/crm', sprint: 7 },

      { id: 'crm-sales-grp', label: 'Kinh Doanh', icon: '', href: '#', sprint: 7, isGroupHeader: true },
      { id: 'crm-customers', label: 'Khách hàng', icon: 'Users', href: '/crm/customers', sprint: 7 },
      { id: 'crm-leads', label: 'Lead (Tiềm năng)', icon: 'UserPlus', href: '/crm/leads', sprint: 7 },
      { id: 'crm-opportunities', label: 'Cơ hội bán hàng', icon: 'Briefcase', href: '/crm/opportunities', sprint: 7 },

      { id: 'crm-process-grp', label: 'Quy trình dự án', icon: '', href: '#', sprint: 7, isGroupHeader: true },
      { id: 'crm-surveys', label: 'Khảo sát công trình', icon: 'MapPin', href: '/crm/surveys', sprint: 7 },
      { id: 'crm-designs', label: 'Thiết kế', icon: 'PenTool', href: '/crm/designs', sprint: 7 },
      { id: 'crm-boq', label: 'BOQ / Khối lượng', icon: 'ClipboardList', href: '/crm/boq', sprint: 7 },

      { id: 'crm-contract-grp', label: 'Chốt đơn', icon: '', href: '#', sprint: 7, isGroupHeader: true },
      { id: 'crm-quotes', label: 'Báo giá', icon: 'FileText', href: '/crm/quotes', sprint: 7 },
      { id: 'crm-contracts', label: 'Hợp đồng', icon: 'FileCheck', href: '/crm/contracts', sprint: 7 },

      { id: 'crm-after-grp', label: 'Chăm sóc', icon: '', href: '#', sprint: 7, isGroupHeader: true },
      { id: 'crm-care', label: 'Chăm sóc KH', icon: 'Heart', href: '/crm/care', sprint: 7 },
    ],
  },
  {
    id: 'projects',
    label: 'Dự án',
    icon: 'Briefcase',
    routes: ['/projects'],
    navItems: [
      { id: 'proj-grp', label: 'Dự án', icon: '', href: '#', sprint: 1, isGroupHeader: true },
      { id: 'projects', label: 'Danh sách Dự án', icon: 'Briefcase', href: '/projects', sprint: 1 },
    ],
  },
  {
    id: 'engineering',
    label: 'Thiết kế & Kỹ thuật',
    icon: 'PenTool',
    routes: ['/engineering'],
    navItems: [
      { id: 'eng-grp', label: 'Hồ sơ kỹ thuật', icon: '', href: '#', sprint: 8, isGroupHeader: true },
      { id: 'eng-surveys', label: 'Khảo sát hiện trạng', icon: 'MapPin', href: '/engineering/surveys', sprint: 8 },
      { id: 'eng-designs', label: 'Thiết kế & Bản vẽ', icon: 'PenTool', href: '/engineering/designs', sprint: 8 },
      { id: 'eng-approvals', label: 'Duyệt mẫu', icon: 'CheckSquare', href: '/engineering/approvals', sprint: 8 },
      { id: 'eng-releases', label: 'Phát hành SX', icon: 'Send', href: '/engineering/production-releases', sprint: 8 },
    ],
  },
  {
    id: 'inventory',
    label: 'Vật tư - Kho',
    icon: 'Package',
    routes: ['/inventory'],
    navItems: [
      { id: 'inv-dash-grp', label: 'Tổng quan', icon: '', href: '#', sprint: 4, isGroupHeader: true },
      { id: 'inv-dash', label: 'Dashboard Kho', icon: 'LayoutDashboard', href: '/inventory/dashboard', sprint: 4 },
      
      { id: 'inv-mat-grp', label: 'Vật tư', icon: '', href: '#', sprint: 4, isGroupHeader: true },
      { id: 'materials', label: 'Danh mục Vật tư', icon: 'Package', href: '/inventory/materials', sprint: 4 },
      { id: 'suppliers', label: 'Nhà cung cấp', icon: 'Users', href: '/inventory/suppliers', sprint: 6 },
      
      { id: 'inv-wh-grp', label: 'Kho', icon: '', href: '#', sprint: 4, isGroupHeader: true },
      { id: 'warehouses', label: 'Danh sách Kho & Vị trí', icon: 'Grid', href: '/inventory/warehouses', sprint: 4 },
      { id: 'transactions', label: 'Nhập/Xuất/Chuyển', icon: 'Activity', href: '/inventory/transactions', sprint: 4 },
      { id: 'reservations', label: 'Giữ hàng Dự án', icon: 'Briefcase', href: '/inventory/reservations', sprint: 4 },
      { id: 'stock-counts', label: 'Kiểm kê', icon: 'ClipboardList', href: '/inventory/counts', sprint: 4 },
    ],
  },
  {
    id: 'purchasing',
    label: 'Mua hàng',
    icon: 'ShoppingCart',
    routes: ['/purchasing'],
    navItems: [
      { id: 'pur-grp', label: 'Mua hàng', icon: '', href: '#', sprint: 9, isGroupHeader: true },
      { id: 'pur-requests', label: 'Yêu cầu mua hàng (PR)', icon: 'FileText', href: '/purchasing/requests', sprint: 9 },
      { id: 'pur-orders', label: 'Đơn đặt hàng (PO)', icon: 'ShoppingCart', href: '/purchasing/orders', sprint: 9 },
    ],
  },
  {
    id: 'production',
    label: 'Sản xuất',
    icon: 'Factory',
    routes: ['/production', '/bom', '/tracking', '/qc'],
    navItems: [
      { id: 'prod-dash-grp', label: 'Tổng quan', icon: '', href: '#', sprint: 7, isGroupHeader: true },
      { id: 'prod-dashboard', label: 'Dashboard Sản xuất', icon: 'LayoutDashboard', href: '/production/dashboard', sprint: 7 },
      { id: 'prod-dash', label: 'Báo cáo Tổng hợp', icon: 'PieChart', href: '/production', sprint: 7 },

      { id: 'prod-plan-grp', label: 'Kế hoạch', icon: '', href: '#', sprint: 7, isGroupHeader: true },
      { id: 'prod-plans', label: 'Kế hoạch sản xuất', icon: 'CalendarDays', href: '/production/plans', sprint: 7 },
      { id: 'prod-orders', label: 'Lệnh sản xuất', icon: 'ClipboardList', href: '/production/orders', sprint: 7 },

      { id: 'prod-bom-grp', label: 'Định mức', icon: '', href: '#', sprint: 7, isGroupHeader: true },
      { id: 'boq', label: 'BOQ / Khối lượng', icon: 'ClipboardList', href: '/bom', sprint: 7, managerOnly: true },
      { id: 'prod-boms', label: 'BOM / Định mức vật tư', icon: 'FileBarChart2', href: '/production/boms', sprint: 7 },
      { id: 'prod-products', label: 'Thành phẩm', icon: 'Package', href: '/production/products', sprint: 7 },

      { id: 'prod-ops-grp', label: 'Điều hành', icon: '', href: '#', sprint: 7, isGroupHeader: true },
      { id: 'prod-routing', label: 'Quy trình công đoạn', icon: 'Activity', href: '/production/routing', sprint: 7 },
      { id: 'prod-workcenters', label: 'Trạm sản xuất', icon: 'Users', href: '/production/work-centers', sprint: 7 },
      { id: 'prod-machines', label: 'Máy móc', icon: 'Settings', href: '/production/machines', sprint: 7 },
      { id: 'prod-jobcards', label: 'Thẻ công việc (Job Card)', icon: 'CheckSquare', href: '/production/job-cards', sprint: 7 },
      { id: 'prod-progress', label: 'Tiến độ chi tiết', icon: 'TrendingUp', href: '/production/progress', sprint: 7 },

      { id: 'prod-ctrl-grp', label: 'Kiểm soát', icon: '', href: '#', sprint: 7, isGroupHeader: true },
      { id: 'prod-issues', label: 'Vật tư sản xuất', icon: 'Package', href: '/production/issues', sprint: 7 },
      { id: 'prod-scrap', label: 'Phế phẩm', icon: 'ShieldAlert', href: '/production/scrap', sprint: 7 },
      { id: 'qc-production', label: 'QC & Lỗi', icon: 'ShieldAlert', href: '/qc', sprint: 7 },
      
      { id: 'prod-res-grp', label: 'Kết quả', icon: '', href: '#', sprint: 7, isGroupHeader: true },
      { id: 'prod-receipts', label: 'Nhập thành phẩm', icon: 'Inbox', href: '/production/receipts', sprint: 7 },
      { id: 'prod-costing', label: 'Chi phí sản xuất', icon: 'DollarSign', href: '/production/costing', sprint: 7 },
      { id: 'prod-tracking', label: 'QR Truy xuất', icon: 'ScanLine', href: '/tracking', sprint: 7 },
    ],
  },
  {
    id: 'installation',
    label: 'Lắp đặt',
    icon: 'Truck',
    routes: ['/installation'],
    navItems: [
      { id: 'inst-grp', label: 'Thi công & Lắp đặt', icon: '', href: '#', sprint: 8, isGroupHeader: true },
      { id: 'inst-schedules', label: 'Lịch lắp đặt', icon: 'CalendarDays', href: '/installation/schedules', sprint: 8 },
      { id: 'inst-kcs', label: 'Nghiệm thu (KCS)', icon: 'FileCheck', href: '/installation/kcs', sprint: 8 },
    ],
  },
  {
    id: 'finance',
    label: 'Tài chính - Kế toán',
    icon: 'DollarSign',
    routes: ['/finance', '/chi-phi', '/accounting'],
    navItems: [
      { id: 'fin-grp', label: 'Tài chính', icon: '', href: '#', sprint: 9, isGroupHeader: true },
      { id: 'fin-accounts', label: 'Hệ thống Tài khoản', icon: 'Book', href: '/accounting/accounts', sprint: 9 },
      { id: 'fin-journal', label: 'Bút toán Sổ nhật ký', icon: 'Edit3', href: '/accounting/journal-entries', sprint: 9 },
      { id: 'fin-vouchers', label: 'Phiếu Thu/Chi', icon: 'Banknote', href: '/finance/vouchers', sprint: 9 },
      { id: 'fin-debts', label: 'Công Nợ', icon: 'FileText', href: '/finance/debts', sprint: 9 },
      { id: 'costs', label: 'Chi phí dự án', icon: 'DollarSign', href: '/chi-phi', sprint: 5 },
      { id: 'fin-cashflow', label: 'Báo cáo dòng tiền', icon: 'Activity', href: '/finance/cashflow', sprint: 9 },
    ],
  },
  {
    id: 'hr',
    label: 'Nhân sự',
    icon: 'Users',
    routes: ['/hr', '/employees', '/attendance', '/leave', '/overtime', '/payroll'],
    navItems: [
      { id: 'hr-grp', label: 'Tổng quan', icon: '', href: '#', sprint: 6, isGroupHeader: true },
      { id: 'hr-dash', label: 'Dashboard Nhân sự', icon: 'PieChart', href: '/hr', sprint: 6 },
      { id: 'employees', label: 'Hồ sơ nhân viên', icon: 'UserCog', href: '/employees', sprint: 6, managerOnly: true },
      
      { id: 'hr-time-grp', label: 'Chấm công', icon: '', href: '#', sprint: 6, isGroupHeader: true },
      { id: 'attendance', label: 'Bảng chấm công', icon: 'Clock', href: '/attendance', sprint: 6, managerOnly: true },
      { id: 'leave', label: 'Nghỉ phép', icon: 'CalendarDays', href: '/leave', sprint: 6 },
      { id: 'overtime', label: 'Tăng ca', icon: 'Timer', href: '/overtime', sprint: 6 },
      
      { id: 'hr-pay-grp', label: 'Lương & Đãi ngộ', icon: '', href: '#', sprint: 6, isGroupHeader: true },
      { id: 'payroll', label: 'Bảng lương', icon: 'Banknote', href: '/payroll', sprint: 6, requiredPermission: 'payroll.view' },
      { id: 'hr-disputes', label: 'Khiếu nại lương', icon: 'Inbox', href: '/hr/disputes', sprint: 6, managerOnly: true },
      
      { id: 'hr-rep-grp', label: 'Báo cáo', icon: '', href: '#', sprint: 6, isGroupHeader: true },
      { id: 'hr-reports', label: 'Báo cáo NS', icon: 'FileBarChart2', href: '/hr/reports', sprint: 6, managerOnly: true },
    ],
  },
  {
    id: 'system',
    label: 'Hệ thống',
    icon: 'Settings',
    routes: ['/admin', '/settings'],
    navItems: [
      { id: 'sys-grp', label: 'Hệ thống', icon: '', href: '#', sprint: 1, isGroupHeader: true },
      { id: 'users', label: 'Phân quyền & Users', icon: 'UserCheck', href: '/admin/users', sprint: 1, adminOnly: true },
      { id: 'settings', label: 'Cài đặt hệ thống', icon: 'Settings', href: '/settings', sprint: 5 },
    ],
  },
  {
    id: 'pwr',
    label: 'Công việc cá nhân',
    icon: 'ClipboardList',
    routes: ['/pwr'],
    navItems: [
      { id: 'pwr-grp',            label: 'Công việc',         icon: '',             href: '#',                   sprint: 1, isGroupHeader: true },
      { id: 'pwr-dashboard',      label: 'Công việc cá nhân',  icon: 'LayoutDashboard', href: '/pwr/dashboard',   sprint: 1 },
      { id: 'pwr-tasks',          label: 'Tất cả công việc',  icon: 'CheckSquare',  href: '/pwr/tasks',          sprint: 1 },
      { id: 'pwr-kanban',         label: 'Kanban Board',       icon: 'Columns',      href: '/pwr/kanban',         sprint: 1 },
      { id: 'pwr-inbox',          label: 'Xử lý INBOX',        icon: 'Inbox',        href: '/pwr/inbox',          sprint: 1 },
      { id: 'pwr-rep-grp',        label: 'Báo cáo',           icon: '',             href: '#',                   sprint: 1, isGroupHeader: true },
      { id: 'pwr-report-daily',   label: 'Báo cáo ngày',      icon: 'FileText',     href: '/pwr/reports/daily',  sprint: 1 },
      { id: 'pwr-report-weekly',  label: 'Báo cáo tuần',      icon: 'Calendar',     href: '/pwr/reports/weekly', sprint: 1 },
      { id: 'pwr-report-monthly', label: 'Báo cáo tháng',     icon: 'BarChart2',    href: '/pwr/reports/monthly', sprint: 1 },
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
