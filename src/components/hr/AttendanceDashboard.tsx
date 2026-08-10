'use client';
// src/components/hr/AttendanceDashboard.tsx
// ══════════════════════════════════════════════════════════════════════════════
// Dashboard duyệt chấm công — Phân quyền theo role:
//
//   MANAGER → Xem PENDING_MANAGER → Nút: [Duyệt] [Từ chối]
//   ADMIN   → Xem PENDING_HR      → Nút: [Chốt công] [Từ chối] [Điều chỉnh]
//
// SWR: cache 30s, revalidate khi focus, optimistic update cho smooth UX
// ══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback }          from 'react';
import useSWR                             from 'swr';
import {
  CheckCircle, XCircle, Edit3, Clock, AlertTriangle,
  Loader2, RefreshCw, ChevronDown, ChevronRight,
  User, Calendar, Filter
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
export interface AttendanceRecord {
  id:               number;
  employeeId:       number;
  employeeName:     string;
  employeeCode:     string | null;
  department:       string | null;
  position:         string | null;
  workDate:         string;
  checkIn:          string | null;
  checkOut:         string | null;
  status:           string;
  totalHours:       number | null;
  lateMinutes:      number | null;
  earlyLeaveMinutes: number | null;
  clockInSource:    string | null;
  adjustedHours:    number | null;
  approvalStatus:   string;
  managerNote:      string | null;
  hrNote:           string | null;
  adjustReason:     string | null;
}

type ReviewAction = 'APPROVE' | 'REJECT' | 'EDIT';
type UserRole     = 'ADMIN' | 'MANAGER';

interface Props {
  currentRole: UserRole;
  currentUserId: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  PENDING_MANAGER: { label: 'Chờ Quản đốc',  color: '#F59E0B', bg: '#F59E0B15', icon: '⏳' },
  PENDING_HR:      { label: 'Chờ HR duyệt',  color: '#8B5CF6', bg: '#8B5CF615', icon: '📋' },
  APPROVED:        { label: 'Đã chốt công',  color: '#10B981', bg: '#10B98115', icon: '✅' },
  REJECTED:        { label: 'Đã từ chối',    color: '#EF4444', bg: '#EF444415', icon: '❌' },
};

const CLOCK_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PRESENT:          { label: 'Đủ giờ',         color: '#10B981' },
  LATE:             { label: 'Đi muộn',         color: '#F59E0B' },
  EARLY_LEAVE:      { label: 'Về sớm',          color: '#F59E0B' },
  LATE_EARLY_LEAVE: { label: 'Muộn + Sớm',      color: '#EF4444' },
  HALF_DAY:         { label: 'Nửa ngày',        color: '#8B5CF6' },
  ABSENT:           { label: 'Vắng mặt',        color: '#EF4444' },
  PENDING_CHECKOUT: { label: 'Chưa clock-out',  color: '#F59E0B' },
};

// ─────────────────────────────────────────────────────────────────────────────
// SWR fetcher
// ─────────────────────────────────────────────────────────────────────────────
async function fetcher(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<{
    records: AttendanceRecord[];
    date:    string;
    role:    string;
  }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
export default function AttendanceDashboard({ currentRole }: Props) {
  const isAdmin   = currentRole === 'ADMIN';
  const isManager = currentRole === 'MANAGER';

  // Date filter
  const [selectedDate, setSelectedDate] = useState(
    new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' })
  );

  // Status filter override (Admin can view all)
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Expanded rows
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Action modal state
  const [actionModal, setActionModal] = useState<{
    record: AttendanceRecord;
    action: ReviewAction;
  } | null>(null);

  // ── SWR ────────────────────────────────────────────────────────────────────
  const swrKey = `/api/hr/attendance/review?date=${selectedDate}${statusFilter ? `&status=${statusFilter}` : ''}`;
  const { data, isLoading, error, mutate } = useSWR(swrKey, fetcher, {
    revalidateOnFocus: true,
    dedupingInterval:  30_000,
  });

  // ── Submit Review Action (APPROVE / REJECT / EDIT) ─────────────────────────
  const handleReview = useCallback(async (
    recordId: number,
    action:   ReviewAction,
    note?:    string,
    adjustedHours?: number,
    adjustReason?:  string
  ) => {
    // Optimistic update
    await mutate(async (current) => {
      try {
        const res = await fetch(`/api/hr/attendance/review/${recordId}`, {
          method:  'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, note, adjustedHours, adjustReason }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Lỗi server');
        }

        const { message } = await res.json();
        // Xóa record đã duyệt khỏi danh sách hiện tại
        if (current) {
          return {
            ...current,
            records: current.records.filter(r => r.id !== recordId),
          };
        }
        console.log(message);
        return current;
      } catch (err) {
        // Re-throw để SWR revalidate và khôi phục dữ liệu gốc
        throw err;
      }
    }, { revalidate: true });

    setActionModal(null);
  }, [mutate]);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  const roleLabel = isAdmin ? 'HR — Cấp 2' : 'Quản đốc — Cấp 1';
  const roleColor = isAdmin ? '#8B5CF6' : '#F59E0B';
  const queueLabel = isAdmin ? 'PENDING_HR' : 'PENDING_MANAGER';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontWeight: 800, fontSize: 20, marginBottom: 4 }}>Duyệt Chấm Công</h2>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: `${roleColor}15`, border: `1px solid ${roleColor}30`,
            borderRadius: 20, padding: '3px 10px', fontSize: 12, color: roleColor, fontWeight: 700,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: roleColor }} />
            {roleLabel}
          </div>
        </div>

        {/* Toolbar */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="form-input"
            style={{ fontSize: 13, padding: '6px 10px' }}
          />

          {/* Admin có thể lọc status */}
          {isAdmin && (
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="form-select"
              style={{ fontSize: 13, padding: '6px 10px' }}
            >
              <option value="">Chờ HR duyệt</option>
              <option value="APPROVED">Đã chốt công</option>
              <option value="REJECTED">Đã từ chối</option>
              <option value="PENDING_MANAGER">Chờ Quản đốc</option>
            </select>
          )}

          <button className="btn btn-ghost btn-sm" onClick={() => mutate()}>
            <RefreshCw size={14} /> Làm mới
          </button>
        </div>
      </div>

      {/* Stats bar */}
      {data && (
        <StatsBar records={data.records} isAdmin={isAdmin} />
      )}

      {/* Content */}
      {isLoading && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-muted)' }}>
          <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', marginBottom: 8 }} />
          <p style={{ fontSize: 13 }}>Đang tải danh sách...</p>
        </div>
      )}

      {error && (
        <div style={{
          background: '#EF444415', border: '1px solid #EF444430',
          borderRadius: 10, padding: '16px', display: 'flex', gap: 10,
        }}>
          <AlertTriangle size={20} style={{ color: '#EF4444', flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 700, color: '#EF4444', marginBottom: 4 }}>Không thể tải dữ liệu</div>
            <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{error.message}</div>
          </div>
        </div>
      )}

      {!isLoading && !error && data?.records.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '48px 24px',
          background: 'var(--color-surface-raised)',
          border: '1px solid var(--color-border)', borderRadius: 12,
        }}>
          <CheckCircle size={40} style={{ color: '#10B981', marginBottom: 12 }} />
          <h3 style={{ fontWeight: 700, marginBottom: 8 }}>Hàng đợi trống!</h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>
            Không có bản ghi <code style={{ background: 'var(--color-surface)' }}>{queueLabel}</code> nào cho ngày {selectedDate}.
          </p>
        </div>
      )}

      {/* Record list */}
      {!isLoading && data && data.records.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {data.records.map((rec) => (
            <RecordCard
              key={rec.id}
              record={rec}
              isAdmin={isAdmin}
              isExpanded={expandedId === rec.id}
              onToggle={() => setExpandedId(expandedId === rec.id ? null : rec.id)}
              onAction={(action) => setActionModal({ record: rec, action })}
            />
          ))}
        </div>
      )}

      {/* Action Modal — Confirm + Note */}
      {actionModal && (
        <ActionModal
          record={actionModal.record}
          action={actionModal.action}
          isAdmin={isAdmin}
          onConfirm={(note, adjustedHours, adjustReason) =>
            handleReview(actionModal.record.id, actionModal.action, note, adjustedHours, adjustReason)
          }
          onCancel={() => setActionModal(null)}
        />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// StatsBar: Tóm tắt nhanh số lượng
// ─────────────────────────────────────────────────────────────────────────────
function StatsBar({ records, isAdmin }: { records: AttendanceRecord[]; isAdmin: boolean }) {
  const late    = records.filter(r => r.lateMinutes && r.lateMinutes > 0).length;
  const absent  = records.filter(r => r.status === 'ABSENT').length;
  const pending = records.filter(r => r.status === 'PENDING_CHECKOUT').length;

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {[
        { label: 'Chờ duyệt',  value: records.length, color: isAdmin ? '#8B5CF6' : '#F59E0B' },
        { label: 'Đi muộn',    value: late,            color: '#F59E0B' },
        { label: 'Vắng',       value: absent,          color: '#EF4444' },
        { label: 'Chưa ra',    value: pending,         color: '#6B7280' },
      ].map((stat) => (
        <div key={stat.label} style={{
          flex: '1 1 80px', minWidth: 80,
          background: `${stat.color}10`, border: `1px solid ${stat.color}30`,
          borderRadius: 10, padding: '10px 14px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: stat.color }}>{stat.value}</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>{stat.label}</div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RecordCard: 1 row trong danh sách
// ─────────────────────────────────────────────────────────────────────────────
function RecordCard({ record, isAdmin, isExpanded, onToggle, onAction }: {
  record:     AttendanceRecord;
  isAdmin:    boolean;
  isExpanded: boolean;
  onToggle:   () => void;
  onAction:   (action: ReviewAction) => void;
}) {
  const appr = STATUS_CONFIG[record.approvalStatus] ?? STATUS_CONFIG.PENDING_MANAGER;
  const cs   = CLOCK_STATUS_CONFIG[record.status]   ?? { label: record.status, color: '#6B7280' };
  const effectiveHours = record.adjustedHours ?? record.totalHours ?? 0;

  const formatTime = (iso: string | null) =>
    iso ? new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '—';

  return (
    <div style={{
      background: 'var(--color-surface)',
      border:     '1px solid var(--color-border)',
      borderRadius: 12,
      overflow: 'hidden',
      transition: 'box-shadow 0.2s',
    }}>
      {/* Main row */}
      <div
        onClick={onToggle}
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 16px', cursor: 'pointer',
          borderBottom: isExpanded ? '1px solid var(--color-border)' : 'none',
        }}
      >
        {/* Avatar */}
        <div style={{
          width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
          background: `${appr.color}20`, border: `2px solid ${appr.color}40`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, fontWeight: 800, color: appr.color,
        }}>
          {record.employeeName.charAt(0)}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>{record.employeeName}</span>
            {record.employeeCode && (
              <code style={{ fontSize: 10, background: 'var(--color-surface-raised)', borderRadius: 3, padding: '1px 5px' }}>
                {record.employeeCode}
              </code>
            )}
            <span style={{ fontSize: 10, color: appr.color, background: appr.bg, borderRadius: 4, padding: '1px 6px', fontWeight: 700 }}>
              {appr.icon} {appr.label}
            </span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <span><Clock size={11} style={{ display: 'inline' }} /> {formatTime(record.checkIn)} → {formatTime(record.checkOut)}</span>
            <span style={{ color: cs.color, fontWeight: 600 }}>{cs.label}</span>
            {record.lateMinutes! > 0 && <span style={{ color: '#F59E0B' }}>Muộn {record.lateMinutes}p</span>}
            <span style={{ fontWeight: 700 }}>{effectiveHours.toFixed(1)}h{record.adjustedHours !== null ? ' (đã sửa)' : ''}</span>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
          {/* MANAGER: Duyệt + Từ chối */}
          {!isAdmin && record.approvalStatus === 'PENDING_MANAGER' && (
            <>
              <button
                id={`approve-btn-${record.id}`}
                className="btn btn-sm"
                style={{ background: '#10B981', color: '#fff', border: 'none', fontSize: 12 }}
                onClick={() => onAction('APPROVE')}
                title="Duyệt → chuyển HR"
              >
                <CheckCircle size={13} /> Duyệt
              </button>
              <button
                id={`reject-btn-${record.id}`}
                className="btn btn-secondary btn-sm"
                style={{ color: '#EF4444', borderColor: '#EF444440', fontSize: 12 }}
                onClick={() => onAction('REJECT')}
                title="Từ chối"
              >
                <XCircle size={13} /> Từ chối
              </button>
            </>
          )}

          {/* ADMIN/HR: Chốt công + Từ chối + Điều chỉnh */}
          {isAdmin && record.approvalStatus === 'PENDING_HR' && (
            <>
              <button
                id={`chot-btn-${record.id}`}
                className="btn btn-sm"
                style={{ background: '#8B5CF6', color: '#fff', border: 'none', fontSize: 12 }}
                onClick={() => onAction('APPROVE')}
                title="Chốt công — APPROVED"
              >
                <CheckCircle size={13} /> Chốt công
              </button>
              <button
                id={`edit-btn-${record.id}`}
                className="btn btn-secondary btn-sm"
                style={{ color: '#2563EB', borderColor: '#2563EB40', fontSize: 12 }}
                onClick={() => onAction('EDIT')}
                title="Điều chỉnh giờ công"
              >
                <Edit3 size={13} /> Điều chỉnh
              </button>
              <button
                id={`hr-reject-btn-${record.id}`}
                className="btn btn-secondary btn-sm"
                style={{ color: '#EF4444', borderColor: '#EF444440', fontSize: 12 }}
                onClick={() => onAction('REJECT')}
              >
                <XCircle size={13} />
              </button>
            </>
          )}
        </div>

        {/* Expand toggle */}
        {isExpanded
          ? <ChevronDown size={16} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
          : <ChevronRight size={16} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
        }
      </div>

      {/* Expanded detail */}
      {isExpanded && (
        <div style={{ padding: '14px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 12 }}>
          {[
            ['Bộ phận',     record.department ?? '—'],
            ['Chức vụ',     record.position   ?? '—'],
            ['Nguồn CC',    record.clockInSource ?? '—'],
            ['Giờ chuẩn',   `${effectiveHours.toFixed(2)}h`],
            ['Về sớm',      record.earlyLeaveMinutes ? `${record.earlyLeaveMinutes}p` : '—'],
            ['Ghi chú QL',  record.managerNote ?? '—'],
            ['Ghi chú HR',  record.hrNote      ?? '—'],
            ['Lý do sửa',   record.adjustReason ?? '—'],
          ].map(([label, value]) => (
            <div key={label} style={{ display: 'flex', gap: 6 }}>
              <span style={{ color: 'var(--color-text-muted)', minWidth: 80 }}>{label}:</span>
              <span style={{ fontWeight: 600 }}>{value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ActionModal: Confirm dialog với ghi chú
// ─────────────────────────────────────────────────────────────────────────────
function ActionModal({ record, action, isAdmin, onConfirm, onCancel }: {
  record:    AttendanceRecord;
  action:    ReviewAction;
  isAdmin:   boolean;
  onConfirm: (note?: string, adjustedHours?: number, adjustReason?: string) => void;
  onCancel:  () => void;
}) {
  const [note,          setNote]          = useState('');
  const [adjustedHours, setAdjustedHours] = useState<string>(String(record.totalHours ?? 8));
  const [adjustReason,  setAdjustReason]  = useState('');
  const [submitting,    setSubmitting]    = useState(false);
  const [validError,    setValidError]    = useState('');

  const isEdit    = action === 'EDIT';
  const isApprove = action === 'APPROVE';
  const isReject  = action === 'REJECT';

  const actionConfig = {
    APPROVE: { label: 'Duyệt',        color: '#10B981', icon: '✅', verb: isAdmin ? 'Chốt công' : 'Duyệt → HR' },
    REJECT:  { label: 'Từ chối',      color: '#EF4444', icon: '❌', verb: 'Xác nhận Từ chối' },
    EDIT:    { label: 'Điều chỉnh',   color: '#2563EB', icon: '✏️', verb: 'Lưu điều chỉnh' },
  }[action];

  const handleSubmit = async () => {
    // Validate
    if (isEdit) {
      const h = parseFloat(adjustedHours);
      if (isNaN(h) || h < 0 || h > 24) {
        setValidError('Số giờ không hợp lệ (0 - 24)');
        return;
      }
      if (!adjustReason.trim()) {
        setValidError('Vui lòng nhập lý do điều chỉnh');
        return;
      }
    }
    if (isReject && !note.trim()) {
      setValidError('Vui lòng nhập lý do từ chối');
      return;
    }
    setValidError('');
    setSubmitting(true);
    try {
      await onConfirm(
        note || undefined,
        isEdit ? parseFloat(adjustedHours) : undefined,
        isEdit ? adjustReason : undefined
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 800 }}
        onClick={onCancel}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'min(440px, 92vw)',
        background: 'var(--color-surface)',
        border: `2px solid ${actionConfig.color}40`,
        borderRadius: 16, padding: 24, zIndex: 801,
        boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
      }}>
        {/* Header */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>{actionConfig.icon}</div>
          <h3 style={{ fontWeight: 800, fontSize: 17, color: actionConfig.color }}>
            {actionConfig.label}: {record.employeeName}
          </h3>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 4 }}>
            {record.workDate} · {record.totalHours?.toFixed(1)}h ·&nbsp;
            <span style={{ color: CLOCK_STATUS_CONFIG[record.status]?.color }}>
              {CLOCK_STATUS_CONFIG[record.status]?.label ?? record.status}
            </span>
          </p>
        </div>

        {/* EDIT fields */}
        {isEdit && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 6 }}>
              Giờ công điều chỉnh (giờ):
            </label>
            <input
              type="number"
              min="0" max="24" step="0.25"
              value={adjustedHours}
              onChange={e => setAdjustedHours(e.target.value)}
              className="form-input"
              style={{ width: '100%', marginBottom: 10 }}
            />
            <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 6 }}>
              Lý do điều chỉnh: <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <textarea
              value={adjustReason}
              onChange={e => setAdjustReason(e.target.value)}
              placeholder="VD: NV làm thêm không kịp clock-out, xác nhận qua camera..."
              rows={3}
              className="form-input"
              style={{ width: '100%', resize: 'vertical', fontSize: 13 }}
            />
          </div>
        )}

        {/* Note field */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 6 }}>
            Ghi chú {isReject && <span style={{ color: '#EF4444' }}>*</span>}:
          </label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder={isReject ? 'Lý do từ chối...' : 'Ghi chú (tùy chọn)...'}
            rows={2}
            className="form-input"
            style={{ width: '100%', resize: 'vertical', fontSize: 13 }}
          />
        </div>

        {/* Validation error */}
        {validError && (
          <div style={{
            background: '#EF444415', color: '#EF4444',
            borderRadius: 8, padding: '8px 12px', fontSize: 13, marginBottom: 12,
          }}>
            ⚠️ {validError}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onCancel} disabled={submitting}>
            Hủy
          </button>
          <button
            className="btn"
            style={{ background: actionConfig.color, color: '#fff', border: 'none' }}
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting
              ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Đang xử lý...</>
              : <>{actionConfig.verb}</>
            }
          </button>
        </div>
      </div>
    </>
  );
}
