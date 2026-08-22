'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Briefcase, CheckSquare, TrendingUp,
  ShieldAlert, BookOpen, Package, DollarSign, Users, Settings,
  Command, Menu, X, MoreHorizontal, LogOut, UserCheck, Key,
  Clock, CalendarDays, UserCog, FileBarChart2, Timer,
  Factory, ScanLine, ClipboardList, BarChart2, BarChart3,
  Inbox, Banknote, Activity, PieChart, Grid,
  UserPlus, FileText, FileCheck, PenTool, Send, ShoppingCart, Truck,
  MapPin, Heart, Edit3, Book
} from 'lucide-react';
import { useState, useEffect } from 'react';
import CommandPalette from '@/components/ui/CommandPalette';
import ChangePasswordModal from '@/components/auth/ChangePasswordModal';
import { WORKSPACES, getActiveWorkspace, WorkspaceConfig } from '@/config/navigation';

const iconMap = {
  LayoutDashboard, Briefcase, CheckSquare, TrendingUp,
  ShieldAlert, BookOpen, Package, DollarSign, Users, Settings, UserCheck,
  Clock, CalendarDays, UserCog, FileBarChart2, Timer,
  Factory, ScanLine, ClipboardList, BarChart2, BarChart3,
  Inbox, Banknote, Activity, PieChart, Grid,
  UserPlus, FileText, FileCheck, PenTool, Send, ShoppingCart, Truck,
  MapPin, Heart, Edit3, Book
};

interface UserState {
  id: number;
  username: string;
  name: string;
  role: 'ADMIN' | 'MANAGER' | 'SUPERVISOR' | 'WORKER' | 'VIEWER';
  permissions?: Record<string, boolean>;
}

const ACTIVE_SPRINT = 7;

const ROLE_LABELS: Record<string, string> = {
  ADMIN:      'Quản trị viên',
  MANAGER:    'Quản lý xưởng',
  SUPERVISOR: 'Giám sát công trình',
  WORKER:     'Công nhân thi công',
  VIEWER:     'Ban Giám Đốc',
};

export default function Sidebar() {
  const pathname  = usePathname();
  const router    = useRouter();

  const [cmdOpen,           setCmdOpen]           = useState(false);
  const [mobileOpen,        setMobileOpen]        = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [currentUser,       setCurrentUser]       = useState<UserState | null>(null);
  
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);

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
  useEffect(() => { 
    setMobileOpen(false); 
    setShowWorkspaceMenu(false);
  }, [pathname]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const activeWorkspace = getActiveWorkspace(pathname);

  const isDemoPwrOnly = currentUser?.username === 'quan.mai' || currentUser?.username === 'duy.le';
  const visibleWorkspaces = WORKSPACES.filter(ws => {
    if (isDemoPwrOnly) return ws.id === 'pwr';
    return true;
  });
  // Filter items by role / sprint
  const activeItems = activeWorkspace?.navItems.filter(item => {
    if (item.sprint > ACTIVE_SPRINT) return false;
    if (item.adminOnly   && currentUser?.role !== 'ADMIN') return false;
    if (item.managerOnly && currentUser?.role !== 'ADMIN' && currentUser?.role !== 'MANAGER') return false;
    if (item.requiredPermission && !currentUser?.permissions?.[item.requiredPermission]) return false;
    return true;
  }) || [];

  return (
    <>
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

      {mobileOpen && <div className="sidebar-backdrop" onClick={() => setMobileOpen(false)} />}

      <aside className={`app-sidebar ${mobileOpen ? 'mobile-open' : ''}`}>

        {/* Workspace Switcher */}
        <div className="sidebar-logo" style={{ position: 'relative', cursor: 'pointer' }} onClick={() => setShowWorkspaceMenu(!showWorkspaceMenu)}>
          <div className="sidebar-logo-brand">
            <div className="sidebar-logo-icon" style={{ background: 'var(--color-primary)', color: '#fff', borderRadius: '6px', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Grid size={16} />
            </div>
            <div className="sidebar-logo-text">
              <span className="sidebar-logo-name">{activeWorkspace?.label || 'HomePro'}</span>
              <span className="sidebar-logo-sub">Chuyển đổi Workspace ▾</span>
            </div>
          </div>
        </div>

        {/* Workspace Menu Dropdown */}
        {showWorkspaceMenu && (
          <div style={{ position: 'absolute', top: 60, left: 12, right: 12, background: 'var(--color-surface-1)', border: '1px solid var(--color-border)', borderRadius: '8px', zIndex: 100, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            <div style={{ padding: '8px', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Các Phân Hệ (Workspaces)</div>
            {visibleWorkspaces.map(ws => {
              const WsIcon = iconMap[ws.icon as keyof typeof iconMap] || LayoutDashboard;
              return (
                <Link
                  key={ws.id}
                  href={ws.routes[0]}
                  onClick={() => setShowWorkspaceMenu(false)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', textDecoration: 'none',
                    color: activeWorkspace?.id === ws.id ? 'var(--color-primary)' : 'var(--color-text)',
                    background: activeWorkspace?.id === ws.id ? 'rgba(59,130,246,0.05)' : 'transparent',
                    fontSize: '13px', fontWeight: 500, transition: 'background 0.2s'
                  }}
                  className="workspace-item-hover"
                >
                  <WsIcon size={16} />
                  {ws.label}
                </Link>
              );
            })}
          </div>
        )}

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
          <span className="sidebar-section-label">Module / Tính năng</span>

          {activeItems.map(item => {
            if (item.isGroupHeader) {
              return (
                <div key={item.id} style={{ padding: '16px 12px 6px 16px', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {item.label}
                </div>
              );
            }

            const Icon = iconMap[item.icon as keyof typeof iconMap] || LayoutDashboard;
            const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            
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

      {/* Mobile Bottom Navigation Bar - Lấy các menu đầu tiên của workspace */}
      <nav className="mobile-bottom-nav">
        {activeItems.slice(0, 4).map(item => {
           const Icon = iconMap[item.icon as keyof typeof iconMap] || LayoutDashboard;
           const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
           return (
             <Link key={item.id} href={item.href} className={`mobile-bottom-item ${active ? 'active' : ''}`}>
               <Icon size={20} /><span>{item.label}</span>
             </Link>
           );
        })}
        <button className={`mobile-bottom-item ${mobileOpen ? 'active' : ''}`} onClick={() => setMobileOpen(!mobileOpen)}>
          <MoreHorizontal size={20} /><span>Danh mục</span>
        </button>
      </nav>

      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
      <ChangePasswordModal isOpen={passwordModalOpen} onClose={() => setPasswordModalOpen(false)} />
      <style dangerouslySetInnerHTML={{__html: `
        .workspace-item-hover:hover {
          background: var(--color-surface-2) !important;
        }
      `}} />
    </>
  );
}
