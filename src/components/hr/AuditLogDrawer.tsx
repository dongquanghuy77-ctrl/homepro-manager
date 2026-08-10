'use client';
// src/components/hr/AuditLogDrawer.tsx
// ══════════════════════════════════════════════════════════════════════════════
// Drawer trượt từ mép phải màn hình — hiển thị Timeline lịch sử thay đổi NV
//
// Không dùng Ant Design hay MUI → Pure CSS animation + React Portal
// Lý do: nhất quán với design system hiện tại, không thêm bundle size lớn
//
// UX: Drawer không đóng trang danh sách → giữ nguyên context làm việc
// Kỹ thuật:
//   - position: fixed, right: 0, top: 0, height: 100vh
//   - CSS transform: translateX(100%) → translateX(0) khi mở
//   - Backdrop overlay bán trong suốt, click → đóng drawer
//   - SWR fetch khi drawer mở, cache 60s
// ══════════════════════════════════════════════════════════════════════════════

import { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Clock, User, ChevronRight, AlertCircle, Loader2 } from 'lucide-react';
import useSWR from 'swr';
import type { AuditLogEntry } from '@/app/api/hr/employees/[id]/audit-logs/route';

// ─────────────────────────────────────────────────────────────────────────────
// Action config (label + màu + icon)
// ─────────────────────────────────────────────────────────────────────────────
const ACTION_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  EMPLOYEE_CREATED:     { label: 'Tạo mới nhân viên',    color: '#10B981', bg: '#10B98120', icon: '✨' },
  EMPLOYEE_UPDATED:     { label: 'Cập nhật thông tin',    color: '#F59E0B', bg: '#F59E0B20', icon: '✏️' },
  EMPLOYEE_DEACTIVATED: { label: 'Ngừng hoạt động',      color: '#EF4444', bg: '#EF444420', icon: '🔴' },
  EMPLOYEE_REACTIVATED: { label: 'Kích hoạt lại',         color: '#10B981', bg: '#10B98120', icon: '🔄' },
  ATTENDANCE_CORRECTED: { label: 'Điều chỉnh chấm công',  color: '#8B5CF6', bg: '#8B5CF620', icon: '📋' },
  LEAVE_APPROVED:       { label: 'Duyệt nghỉ phép',       color: '#10B981', bg: '#10B98120', icon: '✅' },
  LEAVE_REJECTED:       { label: 'Từ chối nghỉ phép',     color: '#EF4444', bg: '#EF444420', icon: '❌' },
  OVERTIME_APPROVED:    { label: 'Duyệt tăng ca',         color: '#10B981', bg: '#10B98120', icon: '⏰' },
  OVERTIME_REJECTED:    { label: 'Từ chối tăng ca',       color: '#EF4444', bg: '#EF444420', icon: '⏰' },
  PASSWORD_RESET:       { label: 'Đặt lại mật khẩu',     color: '#6B7280', bg: '#6B728020', icon: '🔑' },
};

const DEFAULT_ACTION = { label: 'Thao tác', color: '#6B7280', bg: '#6B728020', icon: '📝' };

// ─────────────────────────────────────────────────────────────────────────────
// SWR fetcher
// ─────────────────────────────────────────────────────────────────────────────
async function fetchAuditLogs(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<{
    employee: { id: number; name: string; code: string | null };
    logs:     AuditLogEntry[];
    total:    number;
  }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────
interface AuditLogDrawerProps {
  employeeId:   number;
  employeeName: string;
  employeeCode: string | null;
  isOpen:       boolean;
  onClose:      () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Format thời gian tiếng Việt
// ─────────────────────────────────────────────────────────────────────────────
function formatDateTime(iso: string): { date: string; time: string; relative: string } {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH   = Math.floor(diffMs / 3600000);
  const diffD   = Math.floor(diffMs / 86400000);

  let relative: string;
  if (diffMin < 1)  relative = 'Vừa xong';
  else if (diffMin < 60) relative = `${diffMin} phút trước`;
  else if (diffH   < 24) relative = `${diffH} giờ trước`;
  else if (diffD   < 7)  relative = `${diffD} ngày trước`;
  else                   relative = d.toLocaleDateString('vi-VN');

  return {
    date:     d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    time:     d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    relative,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Render diff: so sánh oldValue vs newValue
// ─────────────────────────────────────────────────────────────────────────────
const FIELD_LABELS: Record<string, string> = {
  name:           'Họ tên',
  position:       'Chức vụ',
  department:     'Bộ phận',
  phone:          'Số điện thoại',
  email:          'Email',
  birthDate:      'Ngày sinh',
  joinDate:       'Ngày vào',
  employmentType: 'Loại hợp đồng',
  employeeStatus: 'Trạng thái',
  note:           'Ghi chú',
  employeeCode:   'Mã NV',
  username:       'Tên đăng nhập',
};

function DiffView({
  oldValue,
  newValue,
}: {
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
}) {
  if (!oldValue && !newValue) return null;

  // Nếu chỉ có newValue (CREATED) → hiển thị toàn bộ
  if (!oldValue && newValue) {
    const entries = Object.entries(newValue).filter(([, v]) => v !== null && v !== '');
    if (entries.length === 0) return null;
    return (
      <div style={{ marginTop: 8 }}>
        {entries.map(([k, v]) => (
          <div key={k} style={{
            display: 'flex', gap: 6, fontSize: 11, marginBottom: 3,
          }}>
            <span style={{ color: 'var(--color-text-muted)', minWidth: 90 }}>
              {FIELD_LABELS[k] ?? k}:
            </span>
            <span style={{ color: '#10B981', fontWeight: 600 }}>{String(v)}</span>
          </div>
        ))}
      </div>
    );
  }

  // Nếu có cả old + new → hiển thị những trường thay đổi
  if (oldValue && newValue) {
    const changedFields = Object.keys(newValue).filter(
      (k) => String(newValue[k] ?? '') !== String(oldValue[k] ?? '')
    );
    if (changedFields.length === 0) return null;
    return (
      <div style={{ marginTop: 8 }}>
        {changedFields.map((k) => (
          <div key={k} style={{ marginBottom: 5 }}>
            <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginBottom: 2 }}>
              {FIELD_LABELS[k] ?? k}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{
                fontSize: 11, background: '#EF444420', color: '#EF4444',
                borderRadius: 4, padding: '1px 6px',
                textDecoration: 'line-through',
              }}>
                {String(oldValue[k] ?? '(trống)')}
              </span>
              <ChevronRight size={10} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
              <span style={{
                fontSize: 11, background: '#10B98120', color: '#10B981',
                borderRadius: 4, padding: '1px 6px', fontWeight: 700,
              }}>
                {String(newValue[k] ?? '(trống)')}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
export default function AuditLogDrawer({
  employeeId,
  employeeName,
  employeeCode,
  isOpen,
  onClose,
}: AuditLogDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);

  // ── SWR: chỉ fetch khi drawer đang mở ────────────────────────────────────
  const swrKey = isOpen ? `/api/hr/employees/${employeeId}/audit-logs` : null;

  const { data, isLoading, error } = useSWR(swrKey, fetchAuditLogs, {
    revalidateOnFocus:    false,
    dedupingInterval:     60_000,  // Cache 60s — lịch sử ít thay đổi real-time
    errorRetryCount:      2,
    keepPreviousData:     false,   // Không giữ data cũ khi đổi nhân viên
  });

  // ── Đóng bằng ESC ─────────────────────────────────────────────────────────
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && isOpen) onClose();
  }, [isOpen, onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // ── Ngăn scroll body khi drawer mở ────────────────────────────────────────
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // ── Render (Portal → body) ────────────────────────────────────────────────
  if (typeof window === 'undefined') return null;

  return createPortal(
    <>
      {/* ── Backdrop ── */}
      <div
        onClick={onClose}
        aria-label="Đóng lịch sử"
        style={{
          position:   'fixed', inset: 0, zIndex: 900,
          background: 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(2px)',
          opacity:    isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'opacity 0.25s ease',
        }}
      />

      {/* ── Drawer Panel ── */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Lịch sử thay đổi — ${employeeName}`}
        style={{
          position:   'fixed',
          top:        0,
          right:      0,
          bottom:     0,
          width:      'min(480px, 100vw)',
          zIndex:     901,
          background: 'var(--color-surface)',
          boxShadow:  '-8px 0 40px rgba(0,0,0,0.3)',
          display:    'flex',
          flexDirection: 'column',
          transform:  isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          borderLeft: '1px solid var(--color-border)',
          overflowY:  'hidden',
        }}
      >
        {/* ── Drawer Header ── */}
        <div style={{
          padding:    '20px 24px 16px',
          borderBottom: '1px solid var(--color-border)',
          flexShrink: 0,
          background: 'var(--color-surface-raised)',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Clock size={18} style={{ color: '#F59E0B' }} />
                <span style={{ fontWeight: 800, fontSize: 16 }}>Lịch sử thay đổi</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <User size={13} style={{ color: 'var(--color-text-muted)' }} />
                <span style={{ fontSize: 14, fontWeight: 600 }}>{employeeName}</span>
                {employeeCode && (
                  <code style={{
                    fontSize: 11, color: '#2563EB',
                    background: '#2563EB15', borderRadius: 4,
                    padding: '1px 6px',
                  }}>
                    {employeeCode}
                  </code>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="btn btn-ghost btn-icon"
              title="Đóng (ESC)"
              style={{ flexShrink: 0 }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Stats */}
          {data && (
            <div style={{
              marginTop: 12,
              display: 'flex', gap: 16,
              fontSize: 12, color: 'var(--color-text-muted)',
            }}>
              <span>
                <strong style={{ color: 'var(--color-text)' }}>{data.total}</strong> thao tác
              </span>
              {data.logs[0] && (
                <span>
                  Gần nhất: <strong style={{ color: 'var(--color-text)' }}>
                    {formatDateTime(data.logs[0].createdAt).relative}
                  </strong>
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── Drawer Body — Timeline ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>

          {/* Loading */}
          {isLoading && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-muted)' }}>
              <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', marginBottom: 12 }} />
              <p style={{ fontSize: 13 }}>Đang tải lịch sử...</p>
            </div>
          )}

          {/* Error */}
          {error && !isLoading && (
            <div style={{
              textAlign: 'center', padding: '32px 0',
              color: '#EF4444',
            }}>
              <AlertCircle size={32} style={{ marginBottom: 8 }} />
              <p style={{ fontSize: 13 }}>Không thể tải lịch sử</p>
            </div>
          )}

          {/* Empty */}
          {!isLoading && !error && data?.logs.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--color-text-muted)' }}>
              <Clock size={36} style={{ marginBottom: 12, opacity: 0.4 }} />
              <p style={{ fontSize: 14 }}>Chưa có thao tác nào được ghi lại</p>
            </div>
          )}

          {/* ── Timeline ── */}
          {!isLoading && data && data.logs.length > 0 && (
            <div style={{ position: 'relative' }}>

              {/* Đường dọc timeline */}
              <div style={{
                position:   'absolute',
                left:       16,
                top:        8,
                bottom:     8,
                width:      2,
                background: 'var(--color-border)',
                borderRadius: 1,
              }} />

              {data.logs.map((log, idx) => {
                const cfg = ACTION_CONFIG[log.action] ?? DEFAULT_ACTION;
                const { date, time, relative } = formatDateTime(log.createdAt);
                const isFirst = idx === 0;

                return (
                  <div
                    key={log.id}
                    style={{
                      display:      'flex',
                      gap:          14,
                      marginBottom: 20,
                      position:     'relative',
                      // Animate in
                      animation: `fadeInRight 0.3s ease ${idx * 0.04}s both`,
                    }}
                  >
                    {/* ── Dot trên timeline ── */}
                    <div style={{
                      flexShrink:    0,
                      width:         34,
                      height:        34,
                      borderRadius:  '50%',
                      background:    cfg.bg,
                      border:        `2px solid ${cfg.color}`,
                      display:       'flex',
                      alignItems:    'center',
                      justifyContent:'center',
                      fontSize:      14,
                      position:      'relative',
                      zIndex:        1,
                      // Highlight entry mới nhất
                      boxShadow:     isFirst ? `0 0 0 3px ${cfg.color}40` : 'none',
                    }}>
                      {cfg.icon}
                    </div>

                    {/* ── Card nội dung ── */}
                    <div style={{
                      flex:         1,
                      background:   isFirst ? `${cfg.color}08` : 'var(--color-surface-raised)',
                      border:       `1px solid ${isFirst ? cfg.color + '33' : 'var(--color-border)'}`,
                      borderRadius: 10,
                      padding:      '10px 14px',
                      minWidth:     0,
                    }}>
                      {/* Header của card */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                        <div>
                          <span style={{
                            fontSize:   12,
                            fontWeight: 700,
                            color:      cfg.color,
                          }}>
                            {cfg.label}
                          </span>
                          {isFirst && (
                            <span style={{
                              marginLeft: 6, fontSize: 9, fontWeight: 700,
                              background: cfg.color, color: '#fff',
                              borderRadius: 3, padding: '1px 5px',
                              verticalAlign: 'middle',
                            }}>
                              MỚI
                            </span>
                          )}
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600 }}>
                            {time} · {date}
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                            {relative}
                          </div>
                        </div>
                      </div>

                      {/* Actor */}
                      {log.actorName && (
                        <div style={{
                          fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4,
                          display: 'flex', alignItems: 'center', gap: 4,
                        }}>
                          <User size={10} />
                          <span>Bởi: <strong style={{ color: 'var(--color-text)' }}>{log.actorName}</strong></span>
                        </div>
                      )}

                      {/* Diff view */}
                      <DiffView oldValue={log.oldValue} newValue={log.newValue} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Drawer Footer ── */}
        <div style={{
          padding:      '12px 24px',
          borderTop:    '1px solid var(--color-border)',
          flexShrink:   0,
          fontSize:     11,
          color:        'var(--color-text-muted)',
          display:      'flex',
          justifyContent: 'space-between',
          alignItems:   'center',
        }}>
          <span>Hiển thị tối đa 100 thao tác gần nhất</span>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>

      {/* CSS Animation */}
      <style>{`
        @keyframes fadeInRight {
          from { opacity: 0; transform: translateX(12px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </>,
    document.body
  );
}
