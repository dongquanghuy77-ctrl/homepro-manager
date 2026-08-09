'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Search, FolderOpen, CheckSquare, TrendingUp, LayoutDashboard, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ElementType;
  action: () => void;
  keywords: string[];
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  projects?: { id: number; name: string; code: string }[];
}

export default function CommandPalette({ open, onClose, projects = [] }: CommandPaletteProps) {
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  const staticItems: CommandItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      description: 'Tổng quan tiến độ',
      icon: LayoutDashboard,
      action: () => { router.push('/'); onClose(); },
      keywords: ['dashboard', 'tổng quan', 'home'],
    },
    {
      id: 'projects',
      label: 'Danh sách dự án',
      icon: FolderOpen,
      action: () => { router.push('/projects'); onClose(); },
      keywords: ['dự án', 'project', 'danh sách'],
    },
    {
      id: 'tasks',
      label: 'Tất cả công việc',
      icon: CheckSquare,
      action: () => { router.push('/tasks'); onClose(); },
      keywords: ['công việc', 'task', 'tất cả'],
    },
    {
      id: 'progress',
      label: 'Tiến độ dự án',
      icon: TrendingUp,
      action: () => { router.push('/progress'); onClose(); },
      keywords: ['tiến độ', 'progress', 'gantt'],
    },
  ];

  const projectItems: CommandItem[] = projects.map((p) => ({
    id: `project-${p.id}`,
    label: p.name,
    description: `📁 ${p.code} — Xem dự án`,
    icon: FolderOpen,
    action: () => { router.push(`/projects/${p.id}`); onClose(); },
    keywords: [p.name.toLowerCase(), p.code.toLowerCase()],
  }));

  const allItems = [...staticItems, ...projectItems];

  const filtered = query.trim()
    ? allItems.filter((item) =>
        item.label.toLowerCase().includes(query.toLowerCase()) ||
        item.description?.toLowerCase().includes(query.toLowerCase()) ||
        item.keywords.some((k) => k.includes(query.toLowerCase()))
      )
    : allItems;

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    setSelected(0);
  }, [query]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelected((s) => Math.min(s + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelected((s) => Math.max(s - 1, 0));
      } else if (e.key === 'Enter' && filtered[selected]) {
        filtered[selected].action();
      } else if (e.key === 'Escape') {
        onClose();
      }
    },
    [filtered, selected, onClose]
  );

  if (!open || !mounted) return null;

  const content = (
    <div
      className="cmd-overlay"
      onClick={onClose}
      style={{ zIndex: 99999, position: 'fixed', inset: 0 }}
    >
      <div className="cmd-modal" onClick={(e) => e.stopPropagation()} style={{ zIndex: 100000 }}>
        {/* Search Input */}
        <div className="cmd-search">
          <Search size={18} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            className="cmd-input"
            placeholder="Tìm dự án, công việc, trang..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            id="command-palette-input"
          />
          <kbd className="cmd-kbd">ESC</kbd>
        </div>

        {/* Results */}
        <div className="cmd-results">
          {filtered.length === 0 ? (
            <div className="cmd-empty">Không tìm thấy kết quả nào</div>
          ) : (
            <>
              {!query && (
                <div className="cmd-section-label">Truy cập nhanh</div>
              )}
              {filtered.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    className={`cmd-item${idx === selected ? ' cmd-item-selected' : ''}`}
                    onClick={item.action}
                    onMouseEnter={() => setSelected(idx)}
                  >
                    <Icon size={16} style={{ flexShrink: 0, color: idx === selected ? 'var(--color-primary)' : 'var(--color-text-muted)' }} />
                    <div className="cmd-item-text">
                      <span className="cmd-item-label">{item.label}</span>
                      {item.description && (
                        <span className="cmd-item-desc">{item.description}</span>
                      )}
                    </div>
                    {idx === selected && (
                      <ArrowRight size={14} style={{ color: 'var(--color-primary)', marginLeft: 'auto' }} />
                    )}
                  </button>
                );
              })}
            </>
          )}
        </div>

        <div className="cmd-footer">
          <span><kbd>↑↓</kbd> Di chuyển</span>
          <span><kbd>Enter</kbd> Chọn</span>
          <span><kbd>Esc</kbd> Đóng</span>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
