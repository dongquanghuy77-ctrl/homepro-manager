'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Briefcase, CheckSquare, TrendingUp,
  ShieldAlert, BookOpen, Package, DollarSign, Users, Settings,
  Command, Menu, X, MoreHorizontal,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import CommandPalette from '@/components/ui/CommandPalette';

const iconMap = {
  LayoutDashboard, Briefcase, CheckSquare, TrendingUp,
  ShieldAlert, BookOpen, Package, DollarSign, Users, Settings,
};

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', href: '/', sprint: 1 },
  { id: 'projects', label: 'Dự án', icon: 'Briefcase', href: '/projects', sprint: 1 },
  { id: 'tasks', label: 'Công việc', icon: 'CheckSquare', href: '/tasks', sprint: 1 },
  { id: 'progress', label: 'Tiến độ', icon: 'TrendingUp', href: '/progress', sprint: 1 },
  { id: 'qc', label: 'QC / Lỗi', icon: 'ShieldAlert', href: '/qc', sprint: 3 },
  { id: 'logs', label: 'Nhật ký', icon: 'BookOpen', href: '/logs', sprint: 3 },
  { id: 'materials', label: 'Vật tư', icon: 'Package', href: '/vat-tu', sprint: 4 },
  { id: 'costs', label: 'Chi phí', icon: 'DollarSign', href: '/chi-phi', sprint: 5 },
  { id: 'customers', label: 'Khách hàng', icon: 'Users', href: '/khach-hang', sprint: 5 },
  { id: 'settings', label: 'Cài đặt', icon: 'Settings', href: '/settings', sprint: 5 },
];

const ACTIVE_SPRINT = 4;

export default function Sidebar() {
  const pathname = usePathname();
  const [cmdOpen, setCmdOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen((v) => !v);
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const activeItems = NAV_ITEMS.filter((item) => item.sprint <= ACTIVE_SPRINT);
  const lockedItems = NAV_ITEMS.filter((item) => item.sprint > ACTIVE_SPRINT);

  return (
    <>
      {/* Mobile Top Header */}
      <header className="mobile-top-header">
        <Link href="/" className="mobile-brand">
          <span className="mobile-brand-icon">🏠</span>
          <span className="mobile-brand-name">HomePro</span>
        </Link>

        <div className="mobile-header-actions">
          <button
            className="mobile-icon-btn"
            onClick={() => setCmdOpen(true)}
            title="Tìm kiếm (Ctrl+K)"
          >
            <Command size={18} />
          </button>

          <button
            className="mobile-icon-btn mobile-menu-toggle"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>

      {/* Mobile Overlay Backdrop */}
      {mobileOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setMobileOpen(false)}
        />
      )}

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
          <button
            className="sidebar-close-mobile-btn"
            onClick={() => setMobileOpen(false)}
          >
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
          {activeItems.map((item) => {
            const Icon = iconMap[item.icon as keyof typeof iconMap];
            const active = isActive(item.href);
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

          {lockedItems.length > 0 && (
            <>
              <span className="sidebar-section-label">Sắp ra mắt</span>
              {lockedItems.map((item) => {
                const Icon = iconMap[item.icon as keyof typeof iconMap];
                return (
                  <div key={item.id} className="sidebar-item disabled">
                    <span className="sidebar-item-icon">
                      <Icon size={16} />
                    </span>
                    <span className="sidebar-item-label">{item.label}</span>
                    <span className="sidebar-badge">S{item.sprint}</span>
                  </div>
                );
              })}
            </>
          )}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <div className="sidebar-footer-info">
            <div className="sidebar-avatar">H</div>
            <div>
              <div className="sidebar-user-name">Huy</div>
              <div className="sidebar-user-role">Project Manager</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="mobile-bottom-nav">
        <Link
          href="/"
          className={`mobile-bottom-item ${pathname === '/' ? 'active' : ''}`}
        >
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </Link>
        <Link
          href="/projects"
          className={`mobile-bottom-item ${pathname.startsWith('/projects') ? 'active' : ''}`}
        >
          <Briefcase size={20} />
          <span>Dự án</span>
        </Link>
        <Link
          href="/tasks"
          className={`mobile-bottom-item ${pathname.startsWith('/tasks') ? 'active' : ''}`}
        >
          <CheckSquare size={20} />
          <span>Công việc</span>
        </Link>
        <Link
          href="/vat-tu"
          className={`mobile-bottom-item ${pathname.startsWith('/vat-tu') ? 'active' : ''}`}
        >
          <Package size={20} />
          <span>Vật tư</span>
        </Link>
        <button
          className={`mobile-bottom-item ${mobileOpen ? 'active' : ''}`}
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          <MoreHorizontal size={20} />
          <span>Danh mục</span>
        </button>
      </nav>

      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
    </>
  );
}
