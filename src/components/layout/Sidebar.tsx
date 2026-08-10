'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Briefcase, CheckSquare, TrendingUp,
  ShieldAlert, BookOpen, Package, DollarSign, Users, Settings,
  Command, Menu, X, MoreHorizontal, LogOut, UserCheck, Key,
  Clock, CalendarDays, UserCog, FileBarChart2, Timer,
  ChevronDown, ChevronRight,
  Factory, ScanLine, ClipboardList,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import CommandPalette from '@/components/ui/CommandPalette';
import ChangePasswordModal from '@/components/auth/ChangePasswordModal';

const iconMap = {
  LayoutDashboard, Briefcase, CheckSquare, TrendingUp,
  ShieldAlert, BookOpen, Package, DollarSign, Users, Settings, UserCheck,
  Clock, CalendarDays, UserCog, FileBarChart2, Timer,
  ChevronDown, ChevronRight,
  Factory, ScanLine, ClipboardList,
};

interface UserState {
  id: number;
  username: string;
  name: string;
  role: 'ADMIN' | 'MANAGER' | 'SUPERVISOR' | 'WORKER' | 'VIEWER';
}

// ─── Nav item type ────────────────────────────────────────────────────────────
interface NavItem {
  id: string;
  label: string;
  icon: string;
  href: string;
  sprint: number;
  adminOnly?: boolean;
  managerOnly?: boolean;
  /** Marks this item as the collapsible group header */
  isGroupHeader?: boolean;
  /** Items with the same groupId are rendered as children of the group header */
  groupId?: string;
}

// ─── Navigation items ─────────────────────────────────────────────────────────
const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard',    icon: 'LayoutDashboard', href: '/',           sprint: 1 },
  { id: 'projects',  label: 'Dự án',        icon: 'Briefcase',       href: '/projects',   sprint: 1 },
  { id: 'tasks',     label: 'Công việc',    icon: 'CheckSquare',     href: '/tasks',      sprint: 1 },
  { id: 'progress',  label: 'Tiến độ',      icon: 'TrendingUp',      href: '/progress',   sprint: 1 },
  { id: 'qc',        label: 'QC / Lỗi',    icon: 'ShieldAlert',     href: '/qc',         sprint: 3 },
  { id: 'logs',      label: 'Nhật ký',      icon: 'BookOpen',        href: '/logs',       sprint: 3 },
  { id: 'materials', label: 'Vật tư',       icon: 'Package',         href: '/vat-tu',     sprint: 4 },
  { id: 'users',     label: 'Phân quyền',   icon: 'UserCheck',       href: '/admin/users',sprint: 1, adminOnly: true },
  { id: 'costs',     label: 'Chi phí',      icon: 'DollarSign',      href: '/chi-phi',    sprint: 5 },
  { id: 'customers', label: 'Khách hàng',   icon: 'Users',           href: '/khach-hang', sprint: 5 },
  { id: 'settings',  label: 'Cài đặt',      icon: 'Settings',        href: '/settings',   sprint: 5 },

  // ── HR Module — Collapsible Group ─────────────────────────────────────────
  // Group header: Users icon (đúng nghĩa HR), là link đến /hr dashboard
  // và đồng thời toggle expand/collapse các mục con
  {
    id: 'hr', label: 'Nhân sự', icon: 'Users', href: '/hr',
    sprint: 6, managerOnly: true,
    isGroupHeader: true, groupId: 'hr-group',
  },
  // Group children — indent 12px, icons riêng biệt, không trùng nhau
  {
    id: 'employees', label: 'Nhân viên', icon: 'UserCog', href: '/employees',
    sprint: 6, managerOnly: true, groupId: 'hr-group',
  },
  {
    id: 'attendance', label: 'Chấm công', icon: 'Clock', href: '/attendance',
    sprint: 6, managerOnly: true, groupId: 'hr-group',
  },
  {
    id: 'leave', label: 'Nghỉ phép', icon: 'CalendarDays', href: '/leave',
    sprint: 6, groupId: 'hr-group',
  },
  {
    id: 'overtime', label: 'Tăng ca', icon: 'Timer', href: '/overtime',
    sprint: 6, groupId: 'hr-group',
  },
  {
    id: 'hr-reports', label: 'Báo cáo NS', icon: 'FileBarChart2', href: '/hr/reports',
    sprint: 6, managerOnly: true, groupId: 'hr-group',
  },

  // ── Xưởng Sản Xuất — Collapsible Group ───────────────────────────────────
  {
    id: 'xuong', label: 'Xưởng SX', icon: 'Factory', href: '/bom',
    sprint: 7, managerOnly: true,
    isGroupHeader: true, groupId: 'xuong-group',
  },
  {
    id: 'bom',      label: 'BOQ / BOM',    icon: 'ClipboardList', href: '/bom',
    sprint: 7, managerOnly: true, groupId: 'xuong-group',
  },
  {
    id: 'tracking', label: 'Theo dõi QR',  icon: 'ScanLine',     href: '/tracking',
    sprint: 7, managerOnly: true, groupId: 'xuong-group',
  },
];

const ACTIVE_SPRINT = 7;

const ROLE_LABELS: Record<string, string> = {
  ADMIN:      'Quản trị viên',
  MANAGER:    'Quản lý xưởng',
  SUPERVISOR: 'Giám sát công trình',
  WORKER:     'Công nhân thi công',
  VIEWER:     'Ban Giám Đốc',
};

// ─── HR paths that belong to the hr-group ────────────────────────────────────
const HR_CHILD_PATHS    = ['/employees', '/attendance', '/leave', '/overtime', '/hr/reports'];
const XUONG_CHILD_PATHS = ['/bom', '/tracking'];


export default function Sidebar() {
  const pathname  = usePathname();
  const router    = useRouter();

  const [cmdOpen,           setCmdOpen]           = useState(false);
  const [mobileOpen,        setMobileOpen]        = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [currentUser,       setCurrentUser]       = useState<UserState | null>(null);
  // Which groups are expanded — start with hr-group open
  const [expandedGroups,    setExpandedGroups]    = useState<Set<string>>(new Set(['hr-group']));

  // Auto-expand the HR group when navigating to an HR sub-page
  useEffect(() => {
    const inHR    = HR_CHILD_PATHS.some(p => pathname.startsWith(p)) || pathname === '/hr';
    const inXuong = XUONG_CHILD_PATHS.some(p => pathname.startsWith(p));
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (inHR)    next.add('hr-group');
      if (inXuong) next.add('xuong-group');
      return next;
    });
  }, [pathname]);

  // Keyboard shortcut Ctrl+K
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen(v => !v);
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  // Fetch current user profile
  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => { if (data.user) setCurrentUser(data.user); })
      .catch(() => {});
  }, [pathname]);

  // Close mobile drawer on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      next.has(groupId) ? next.delete(groupId) : next.add(groupId);
      return next;
    });
  };

  // ── Active state helpers ────────────────────────────────────────────────────
  // Regular item: path starts with href (e.g. /projects/123 → /projects active)
  const isItemActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  // Group header: ONLY exact match → avoids dual active with children
  const isGroupHeaderSelfActive = (href: string) => pathname === href;

  // Group header shows subtle "parent highlight" when a child page is active
  const isGroupParentActive = (groupId: string, headerHref: string) => {
    const children = NAV_ITEMS.filter(i => i.groupId === groupId && !i.isGroupHeader);
    return children.some(c => pathname.startsWith(c.href)) && pathname !== headerHref;
  };

  // ── Filter items by role / sprint ───────────────────────────────────────────
  const activeItems = NAV_ITEMS.filter(item => {
    if (item.sprint > ACTIVE_SPRINT) return false;
    if (item.adminOnly   && currentUser?.role !== 'ADMIN') return false;
    if (item.managerOnly && currentUser?.role !== 'ADMIN' && currentUser?.role !== 'MANAGER') return false;
    return true;
  });

  const lockedItems = NAV_ITEMS.filter(item => item.sprint > ACTIVE_SPRINT);

  // Top-level = no groupId, OR is a group header (children rendered inside the header)
  const topLevelItems = activeItems.filter(item => !item.groupId || item.isGroupHeader);

  // Get children of a group (filtered by role already via activeItems)
  const getGroupChildren = (groupId: string) =>
    activeItems.filter(item => item.groupId === groupId && !item.isGroupHeader);

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Mobile Top Header */}
      <header className="mobile-top-header">
        <Link href="/" className="mobile-brand">
          <span className="mobile-brand-icon">🏠</span>
          <span className="mobile-brand-name">HomePro</span>
        </Link>
        <div className="mobile-header-actions">
          <button className="mobile-icon-btn" onClick={() => setCmdOpen(true)} title="Tìm kiếm (Ctrl+K)">
            <Command size={18} />
          </button>
          <button className="mobile-icon-btn mobile-menu-toggle" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle menu">
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>

      {/* Mobile Overlay Backdrop */}
      {mobileOpen && <div className="sidebar-backdrop" onClick={() => setMobileOpen(false)} />}

      {/* Sidebar (Desktop & Mobile Drawer) */}
      <aside className={`app-sidebar ${mobileOpen ? 'mobile-open' : ''}`}>

        {/* Logo */}
        <div className="sidebar-logo">
          <Link href="/" className="sidebar-logo-brand" onClick={() => setMobileOpen(false)}>
            <div className="sidebar-logo-icon">🏠</div>
            <div className="sidebar-logo-text">
              <span className="sidebar-logo-name">HomePro</span>
              <span className="sidebar-logo-sub">Manager v2.0</span>
            </div>
          </Link>
          <button className="sidebar-close-mobile-btn" onClick={() => setMobileOpen(false)}>
            <X size={20} />
          </button>
        </div>

        {/* Search / Command */}
        <div className="sidebar-search-wrap">
          <button
            id="sidebar-cmd-btn"
            className="sidebar-search-btn"
            onClick={() => { setCmdOpen(true); setMobileOpen(false); }}
            title="Tìm kiếm nhanh (Ctrl+K)"
          >
            <Command size={13} />
            <span>Tìm kiếm nhanh...</span>
            <kbd>Ctrl K</kbd>
          </button>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          <span className="sidebar-section-label">Chính</span>

          {topLevelItems.map(item => {
            const Icon = iconMap[item.icon as keyof typeof iconMap];

            // ── Group Header (collapsible) ─────────────────────────────────
            if (item.isGroupHeader && item.groupId) {
              const groupId       = item.groupId;
              const isExpanded    = expandedGroups.has(groupId);
              const selfActive    = isGroupHeaderSelfActive(item.href);
              const parentActive  = isGroupParentActive(groupId, item.href);
              const children      = getGroupChildren(groupId);

              return (
                <div key={item.id}>
                  {/* Group header — navigates to /hr AND toggles children */}
                  <Link
                    href={item.href}
                    className={`sidebar-item ${selfActive ? 'active' : ''}`}
                    style={
                      parentActive && !selfActive
                        ? { background: 'rgba(59,130,246,0.07)', color: 'var(--color-text)' }
                        : undefined
                    }
                    onClick={() => { toggleGroup(groupId); setMobileOpen(false); }}
                  >
                    <span className="sidebar-item-icon">
                      <Icon size={16} />
                    </span>
                    <span className="sidebar-item-label">{item.label}</span>
                    {/* Chevron indicator */}
                    <span style={{ marginLeft: 'auto', opacity: 0.5, display: 'flex', alignItems: 'center' }}>
                      {isExpanded
                        ? <ChevronDown size={13} />
                        : <ChevronRight size={13} />
                      }
                    </span>
                  </Link>

                  {/* Children — only visible when expanded */}
                  {isExpanded && (
                    <div style={{ overflow: 'hidden' }}>
                      {children.map(child => {
                        const ChildIcon  = iconMap[child.icon as keyof typeof iconMap];
                        const childActive = isItemActive(child.href);
                        return (
                          <Link
                            key={child.id}
                            href={child.href}
                            className={`sidebar-item ${childActive ? 'active' : ''}`}
                            style={{
                              paddingLeft: 32,
                              fontSize: '0.8125rem',
                              opacity: childActive ? 1 : 0.82,
                            }}
                            onClick={() => setMobileOpen(false)}
                          >
                            <span className="sidebar-item-icon">
                              <ChildIcon size={14} />
                            </span>
                            <span className="sidebar-item-label">{child.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            // ── Regular item ───────────────────────────────────────────────
            const active = isItemActive(item.href);
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`sidebar-item ${active ? 'active' : ''}`}
                onClick={() => setMobileOpen(false)}
              >
                <span className="sidebar-item-icon">
                  <Icon size={16} />
                </span>
                <span className="sidebar-item-label">{item.label}</span>
              </Link>
            );
          })}

          {/* Locked / upcoming items */}
          {lockedItems.length > 0 && (
            <>
              <span className="sidebar-section-label">Sắp ra mắt</span>
              {lockedItems.map(item => {
                const Icon = iconMap[item.icon as keyof typeof iconMap];
                return (
                  <div key={item.id} className="sidebar-item disabled">
                    <span className="sidebar-item-icon"><Icon size={16} /></span>
                    <span className="sidebar-item-label">{item.label}</span>
                    <span className="sidebar-badge">S{item.sprint}</span>
                  </div>
                );
              })}
            </>
          )}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer" style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
              <div className="sidebar-avatar" style={{ flexShrink: 0 }}>
                {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'H'}
              </div>
              <div style={{ overflow: 'hidden', minWidth: 0, flex: 1 }}>
                <div className="sidebar-user-name" style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {currentUser?.name || 'Đồng Quang Huy'}
                </div>
                <div className="sidebar-user-role" style={{ fontSize: 11, color: 'var(--color-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {currentUser ? (ROLE_LABELS[currentUser.role] || currentUser.role) : 'Admin / Kỹ thuật xưởng'}
                </div>
              </div>
            </div>
            <button
              onClick={() => setPasswordModalOpen(true)}
              title="Đổi mật khẩu cá nhân"
              style={{
                background: 'var(--color-surface-2)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-muted)',
                cursor: 'pointer',
                padding: '6px 8px',
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 11,
                flexShrink: 0,
              }}
            >
              <Key size={13} />
            </button>
          </div>

          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: 8,
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#FCA5A5',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              transition: 'all 0.15s ease',
            }}
          >
            <LogOut size={14} />
            <span>Đăng xuất tài khoản</span>
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="mobile-bottom-nav">
        <Link href="/"          className={`mobile-bottom-item ${pathname === '/' ? 'active' : ''}`}>
          <LayoutDashboard size={20} /><span>Dashboard</span>
        </Link>
        <Link href="/projects"  className={`mobile-bottom-item ${pathname.startsWith('/projects') ? 'active' : ''}`}>
          <Briefcase size={20} /><span>Dự án</span>
        </Link>
        <Link href="/tasks"     className={`mobile-bottom-item ${pathname.startsWith('/tasks') ? 'active' : ''}`}>
          <CheckSquare size={20} /><span>Công việc</span>
        </Link>
        <Link href="/vat-tu"    className={`mobile-bottom-item ${pathname.startsWith('/vat-tu') ? 'active' : ''}`}>
          <Package size={20} /><span>Vật tư</span>
        </Link>
        <button className={`mobile-bottom-item ${mobileOpen ? 'active' : ''}`} onClick={() => setMobileOpen(!mobileOpen)}>
          <MoreHorizontal size={20} /><span>Danh mục</span>
        </button>
      </nav>

      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
      <ChangePasswordModal isOpen={passwordModalOpen} onClose={() => setPasswordModalOpen(false)} />
    </>
  );
}
