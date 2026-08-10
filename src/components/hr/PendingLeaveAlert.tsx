'use client';
// src/components/hr/PendingLeaveAlert.tsx
// ══════════════════════════════════════════════════════════════════════════════
// Banner cảnh báo đơn nghỉ phép chờ duyệt dành cho Quản đốc
//
// Tính năng:
//   • Pulsing dot animation khi có đơn chờ (urgency cue)
//   • Đếm riêng: PENDING (Manager duyệt) vs PENDING_HR (HR chốt)
//   • CTA button → mở LeaveApprovalDashboard (tab hoặc navigate)
//   • Có thể dismiss cho session hiện tại (sessionStorage)
//   • Màu thay đổi theo mức độ: amber (<5) → orange-red (≥5)
//   • Tự biến mất khi count = 0 (sau khi approve xong)
//   • Kết hợp với refreshPendingCount() sau mỗi lần approve
// ══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useEffect } from 'react';
import { useRouter }                    from 'next/navigation';
import {
  Bell, BellRing, ChevronRight, X, RefreshCw,
  Clock, CheckSquare, Loader2, AlertTriangle,
} from 'lucide-react';
import { usePendingLeaveCount }          from '@/hooks/usePendingLeaveCount';

// ─────────────────────────────────────────────────────────────────────────────
// Session-level dismiss key (mất khi đóng tab)
// ─────────────────────────────────────────────────────────────────────────────
const DISMISS_KEY = 'leave_alert_dismissed_at';
const DISMISS_TTL = 30 * 60 * 1000; // 30 phút

function isDismissed(): boolean {
  if (typeof window === 'undefined') return false;
  const raw = sessionStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  return Date.now() - Number(raw) < DISMISS_TTL;
}

function setDismissed() {
  sessionStorage.setItem(DISMISS_KEY, String(Date.now()));
}

// ─────────────────────────────────────────────────────────────────────────────
// PulsingDot — Animation indicator cho trạng thái chờ
// ─────────────────────────────────────────────────────────────────────────────
function PulsingDot({ color }: { color: string }) {
  return (
    <span style={{ position: 'relative', display: 'inline-flex', width: 12, height: 12, flexShrink: 0 }}>
      <span style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        background: color, opacity: 0.75,
        animation: 'pingPulse 1.5s cubic-bezier(0, 0, 0.2, 1) infinite',
      }} />
      <span style={{
        position: 'relative', display: 'inline-flex',
        borderRadius: '50%', width: 12, height: 12, background: color,
      }} />
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CountBadge — Số đơn nổi bật
// ─────────────────────────────────────────────────────────────────────────────
function CountBadge({ count, color }: { count: number; color: string }) {
  return (
    <span style={{
      display:      'inline-flex',
      alignItems:   'center',
      justifyContent: 'center',
      minWidth:     28, height: 28,
      borderRadius: 99,
      background:   color,
      color:        '#fff',
      fontSize:     15,
      fontWeight:   900,
      padding:      '0 8px',
      flexShrink:   0,
      transition:   'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      animation:    count > 0 ? 'bumpIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none',
    }}>
      {count > 99 ? '99+' : count}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PendingLeaveAlert — Main Component
// ─────────────────────────────────────────────────────────────────────────────
interface PendingLeaveAlertProps {
  /** URL trang duyệt phép. Default: '/hr/leave-approval' */
  approvalUrl?: string;
  /** Callback thay thế navigate (để mở Modal/Drawer thay vì navigate) */
  onOpenApproval?: () => void;
  /** Hiển thị compact (chỉ badge nhỏ, không có mô tả) */
  compact?: boolean;
}

export default function PendingLeaveAlert({
  approvalUrl    = '/hr/leave-approval',
  onOpenApproval,
  compact        = false,
}: PendingLeaveAlertProps) {
  const router = useRouter();
  const { total, pending, pendingHr, isLoading, hasPending, refresh, checkedAt } = usePendingLeaveCount();
  const [dismissed, setDismissedState] = useState(false);

  // Đọc dismiss state khi mount (client-only)
  useEffect(() => {
    setDismissedState(isDismissed());
  }, []);

  // Khi count thay đổi về 0 → tự reset dismiss (để hiện lại nếu có đơn mới)
  useEffect(() => {
    if (total === 0) setDismissedState(false);
  }, [total]);

  const handleDismiss = useCallback(() => {
    setDismissed();
    setDismissedState(true);
  }, []);

  const handleCTA = useCallback(() => {
    if (onOpenApproval) {
      onOpenApproval();
    } else {
      router.push(approvalUrl);
    }
  }, [onOpenApproval, approvalUrl, router]);

  // ── Không hiển thị khi loading (tránh layout shift) ──────────────────────
  if (isLoading) {
    return compact ? null : (
      <div style={{
        height: 52, borderRadius: 12,
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px',
      }}>
        <Loader2 size={14} style={{ animation: 'spin 1s linear infinite', color: 'var(--color-text-muted)' }} />
        <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Đang kiểm tra đơn chờ...</span>
      </div>
    );
  }

  // ── Ẩn nếu không có đơn chờ ──────────────────────────────────────────────
  if (!hasPending) return null;

  // ── Ẩn nếu đã dismiss ────────────────────────────────────────────────────
  if (dismissed) {
    // Compact reminder khi đã dismiss
    return (
      <button
        onClick={() => setDismissedState(false)}
        style={{
          display:      'flex', alignItems: 'center', gap: 6,
          padding:      '5px 10px', borderRadius: 99,
          background:   '#F59E0B20', border: '1px solid #F59E0B40',
          cursor:       'pointer', fontSize: 11, color: '#F59E0B', fontWeight: 600,
        }}
      >
        <BellRing size={12} />
        {total} đơn chờ
      </button>
    );
  }

  // ── Màu sắc theo mức độ ──────────────────────────────────────────────────
  const isUrgent    = total >= 5;
  const accentColor = isUrgent ? '#EF4444' : '#F59E0B';
  const bgGradient  = isUrgent
    ? 'linear-gradient(135deg, #EF444412, #F59E0B08)'
    : 'linear-gradient(135deg, #F59E0B12, #F97316 08)';
  const borderColor = isUrgent ? '#EF444430' : '#F59E0B35';
  const glowStyle   = isUrgent
    ? '0 0 0 3px #EF44440d, 0 4px 20px #EF444420'
    : '0 0 0 3px #F59E0B0d, 0 4px 20px #F59E0B15';

  // ── COMPACT MODE: chỉ badge nhỏ + text ───────────────────────────────────
  if (compact) {
    return (
      <div
        role="alert"
        style={{
          display:      'inline-flex', alignItems: 'center', gap: 8,
          padding:      '7px 14px', borderRadius: 99,
          background:   bgGradient, border: `1px solid ${borderColor}`,
          cursor:       'pointer',
        }}
        onClick={handleCTA}
      >
        <PulsingDot color={accentColor} />
        <span style={{ fontSize: 13, fontWeight: 700, color: accentColor }}>
          {total} đơn chờ duyệt
        </span>
        <ChevronRight size={13} style={{ color: accentColor }} />
      </div>
    );
  }

  // ── FULL BANNER ───────────────────────────────────────────────────────────
  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        borderRadius: 16,
        background:   bgGradient,
        border:       `1px solid ${borderColor}`,
        boxShadow:    glowStyle,
        padding:      '16px 18px',
        position:     'relative',
        overflow:     'hidden',
        animation:    'slideDown 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* Decorative gradient bar top */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: isUrgent
          ? 'linear-gradient(90deg, #EF4444, #F59E0B)'
          : 'linear-gradient(90deg, #F59E0B, #FBBF24)',
        borderRadius: '16px 16px 0 0',
      }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>

        {/* Icon + pulse */}
        <div style={{ position: 'relative', flexShrink: 0, marginTop: 2 }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            background: `${accentColor}18`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {isUrgent
              ? <AlertTriangle size={20} style={{ color: accentColor }} />
              : <Bell size={20} style={{ color: accentColor }} />
            }
          </div>
          <span style={{ position: 'absolute', top: -2, right: -2 }}>
            <PulsingDot color={accentColor} />
          </span>
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontWeight: 800, fontSize: 14, color: accentColor,
            display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
          }}>
            <CountBadge count={total} color={accentColor} />
            Bạn đang có&nbsp;
            <span style={{ color: 'var(--color-text)' }}>
              {total} đơn xin nghỉ phép
            </span>
            chờ duyệt
            {isUrgent && (
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 7px',
                borderRadius: 99, background: '#EF444420', color: '#EF4444',
              }}>
                ⚡ Cần xử lý gấp
              </span>
            )}
          </div>

          {/* Sub-breakdown: pending + pendingHr */}
          <div style={{ display: 'flex', gap: 14, marginTop: 6, flexWrap: 'wrap' }}>
            {pending > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--color-text-muted)' }}>
                <Clock size={12} style={{ color: '#F59E0B' }} />
                <span><strong style={{ color: '#F59E0B' }}>{pending}</strong> đơn chờ bạn duyệt cấp 1</span>
              </div>
            )}
            {pendingHr > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--color-text-muted)' }}>
                <CheckSquare size={12} style={{ color: '#8B5CF6' }} />
                <span><strong style={{ color: '#8B5CF6' }}>{pendingHr}</strong> đơn chờ HR chốt cấp 2</span>
              </div>
            )}
          </div>

          {/* CTA */}
          <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={handleCTA}
              style={{
                display:      'flex', alignItems: 'center', gap: 6,
                padding:      '8px 16px', borderRadius: 10,
                background:   accentColor, border: 'none',
                color:        '#fff', fontSize: 13, fontWeight: 700,
                cursor:       'pointer',
                boxShadow:    `0 2px 10px ${accentColor}40`,
                transition:   'transform 0.15s, box-shadow 0.15s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 4px 16px ${accentColor}50`;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 2px 10px ${accentColor}40`;
              }}
            >
              Duyệt ngay
              <ChevronRight size={15} />
            </button>

            <button
              onClick={refresh}
              style={{
                display:    'flex', alignItems: 'center', gap: 5,
                padding:    '8px 12px', borderRadius: 10,
                background: 'transparent',
                border:     `1px solid ${borderColor}`,
                color:      'var(--color-text-muted)', fontSize: 12,
                cursor:     'pointer',
              }}
              title="Làm mới số lượng"
            >
              <RefreshCw size={12} />
              Làm mới
            </button>

            {/* Checked at timestamp */}
            {checkedAt && (
              <span style={{ fontSize: 10, color: 'var(--color-text-muted)', marginLeft: 4 }}>
                Cập nhật: {new Date(checkedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        </div>

        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          style={{
            padding:    6, borderRadius: 8, border: 'none',
            background: 'transparent', cursor: 'pointer',
            color:      'var(--color-text-muted)',
            flexShrink: 0,
          }}
          title="Ẩn cảnh báo trong 30 phút"
          aria-label="Đóng cảnh báo"
        >
          <X size={16} />
        </button>
      </div>

      <style>{`
        @keyframes pingPulse {
          75%, 100% { transform: scale(2.2); opacity: 0; }
        }
        @keyframes bumpIn {
          0%   { transform: scale(0.7); }
          60%  { transform: scale(1.15); }
          100% { transform: scale(1); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
