'use client';
// src/components/hr/LeaveBalanceWidget.tsx
// ══════════════════════════════════════════════════════════════════════════════
// LeaveBalanceWidget — Widget quỹ phép nhân viên
//
// Tính năng:
//   • Mini Donut Chart (inline SVG, không cần thư viện)
//     → Hiển thị % đã dùng (solid) + % đang chờ (dashed) + % còn lại (grey)
//     → CSS transition → animation mượt khi số liệu thay đổi
//   • Progress bars theo từng loại phép (ANNUAL, SICK, COMPENSATORY)
//   • Quick Action: Nút "Xin nghỉ" mở form trong Drawer
//   • State: sau khi submit form → optimisticDeduct() → số giảm ngay → revalidate
// ══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback }      from 'react';
import { useLeaveBalance, refreshLeaveBalance, LeaveBalanceEntry } from '@/hooks/useLeaveBalance';
import {
  Calendar, Clock, RefreshCw, Plus, ChevronRight,
  Loader2, AlertTriangle, CheckCircle, Hourglass,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Màu sắc theo loại phép
// ─────────────────────────────────────────────────────────────────────────────
const LEAVE_COLORS: Record<string, { primary: string; light: string; pending: string }> = {
  ANNUAL:       { primary: '#10B981', light: '#10B98120', pending: '#10B98145' },
  SICK:         { primary: '#2563EB', light: '#2563EB20', pending: '#2563EB45' },
  UNPAID:       { primary: '#F59E0B', light: '#F59E0B20', pending: '#F59E0B45' },
  MATERNITY:    { primary: '#8B5CF6', light: '#8B5CF620', pending: '#8B5CF645' },
  COMPENSATORY: { primary: '#06B6D4', light: '#06B6D420', pending: '#06B6D445' },
  DEFAULT:      { primary: '#6B7280', light: '#6B728020', pending: '#6B728045' },
};

function getColor(code: string) {
  return LEAVE_COLORS[code] ?? LEAVE_COLORS.DEFAULT;
}

// ─────────────────────────────────────────────────────────────────────────────
// MiniDonut — SVG donut chart mini cho mỗi loại phép
//
// 3 vùng (từ ngoài vào trong):
//   1. GREY arc  = phép còn lại (background)
//   2. PRIMARY arc = phép đã dùng (solid)
//   3. PENDING arc = phép đang chờ duyệt (dashed, lighter)
// ─────────────────────────────────────────────────────────────────────────────
function MiniDonut({
  usagePct, pendingPct, color, size = 72, label,
}: {
  usagePct:   number;
  pendingPct: number;
  color:      { primary: string; light: string; pending: string };
  size?:      number;
  label:      string | number;
}) {
  const r           = (size - 14) / 2;  // radius (để lại 7px strokeWidth)
  const cx          = size / 2;
  const cy          = size / 2;
  const circ        = 2 * Math.PI * r;  // full circumference

  // Arc lengths
  const usedLen     = (usagePct   / 100) * circ;
  const pendingLen  = (pendingPct / 100) * circ;
  const totalUsed   = Math.min(circ, usedLen + pendingLen);

  // SVG arcs start at 12 o'clock (rotate -90deg)
  // Stack: used arc first, then pending arc continuing after used
  const usedDash    = `${usedLen} ${circ - usedLen}`;
  const pendingOffset = circ - usedLen; // Dịch arc pending bắt đầu sau used
  const pendingDash   = `${pendingLen} ${circ - pendingLen}`;

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* Background grey ring */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={7}
        />
        {/* Used arc — solid */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={color.primary}
          strokeWidth={7}
          strokeDasharray={usedDash}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}
        />
        {/* Pending arc — dashed, lighter, starts after used */}
        {pendingLen > 0 && (
          <circle
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={color.pending}
            strokeWidth={7}
            strokeDasharray={pendingDash}
            strokeDashoffset={pendingOffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}
          />
        )}
      </svg>
      {/* Center label — giữ nguyên hướng (không rotate theo SVG) */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        lineHeight: 1.1,
      }}>
        <span style={{ fontSize: 18, fontWeight: 900, color: color.primary, lineHeight: 1 }}>
          {label}
        </span>
        <span style={{ fontSize: 9, color: 'var(--color-text-muted)', marginTop: 1 }}>ngày</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BalanceRow — 1 dòng cho mỗi loại phép
// ─────────────────────────────────────────────────────────────────────────────
function BalanceRow({ entry }: { entry: LeaveBalanceEntry }) {
  const color = getColor(entry.leaveTypeCode);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '12px 0',
      borderBottom: '1px solid var(--color-border)',
    }}>
      {/* Donut */}
      <MiniDonut
        usagePct={entry.usagePct}
        pendingPct={entry.pendingPct}
        color={color}
        size={68}
        label={entry.remaining}
      />

      {/* Text info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>
          {entry.leaveTypeName}
        </div>

        {/* Progress bar */}
        <div style={{
          height: 6, borderRadius: 99,
          background: 'var(--color-border)',
          overflow: 'hidden', marginBottom: 6,
        }}>
          {/* Used portion */}
          <div style={{
            height: '100%', borderRadius: 99,
            width: `${entry.usagePct}%`,
            background: color.primary,
            transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
            float: 'left',
          }} />
          {/* Pending portion */}
          {entry.pendingPct > 0 && (
            <div style={{
              height: '100%', borderRadius: 99,
              width: `${entry.pendingPct}%`,
              background: color.pending,
              transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
              float: 'left',
            }} />
          )}
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'var(--color-text-muted)', flexWrap: 'wrap' }}>
          <span>
            <span style={{ color: color.primary, fontWeight: 700 }}>{entry.usedDays}</span>
            &nbsp;đã dùng
          </span>
          {entry.pendingDays > 0 && (
            <span style={{ color: color.pending }}>
              <Hourglass size={9} style={{ display: 'inline', marginRight: 2 }} />
              {entry.pendingDays} chờ duyệt
            </span>
          )}
          <span>
            <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{entry.remaining}</span>
            &nbsp;còn lại / {entry.entitlement}
          </span>
          {entry.carryOverDays > 0 && (
            <span style={{ color: '#8B5CF6' }}>
              +{entry.carryOverDays} carry-over
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LeaveRequestMiniForm — Inline form xin nghỉ nhanh (Drawer-style)
// Sau khi submit → gọi optimisticDeduct() → widget cập nhật ngay
// ─────────────────────────────────────────────────────────────────────────────
function LeaveRequestMiniForm({
  balances, onClose, onSuccess,
}: {
  balances:  LeaveBalanceEntry[];
  onClose:   () => void;
  onSuccess: (leaveTypeId: number, days: number) => void;
}) {
  const [leaveTypeId, setLeaveTypeId] = useState(balances[0]?.leaveTypeId ?? 0);
  const [startDate,   setStartDate]   = useState('');
  const [endDate,     setEndDate]     = useState('');
  const [period,      setPeriod]      = useState<'FULL_DAY' | 'MORNING' | 'AFTERNOON'>('FULL_DAY');
  const [reason,      setReason]      = useState('');
  const [submitting,  setSubmitting]  = useState(false);
  const [formError,   setFormError]   = useState('');

  const handleSubmit = useCallback(async () => {
    if (!startDate || !endDate || !reason.trim()) {
      setFormError('Vui lòng điền đầy đủ: ngày bắt đầu, ngày kết thúc, lý do.');
      return;
    }
    if (startDate > endDate) {
      setFormError('Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.');
      return;
    }
    setFormError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/hr/leave/requests', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ leaveTypeId, startDate, endDate, period, reason }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error ?? 'Gửi đơn thất bại');
        return;
      }

      // ── STATE MANAGEMENT KEY POINT ────────────────────────────────────────
      // Sau khi submit thành công:
      //   onSuccess() → gọi optimisticDeduct(leaveTypeId, totalDays)
      //   → Widget NGAY LẬP TỨC giảm "Phép còn lại" (không cần F5)
      //   → SWR vẫn re-fetch trong nền để sync với server thực
      onSuccess(leaveTypeId, data.request?.totalDays ?? 0);
      onClose();

    } catch {
      setFormError('Lỗi mạng, vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  }, [leaveTypeId, startDate, endDate, period, reason, onSuccess, onClose]);

  return (
    <div style={{
      position:  'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.5)',
      display:   'flex', alignItems: 'flex-end',
    }}>
      {/* Drawer slide-up from bottom */}
      <div style={{
        width:        '100%', maxWidth: 480, margin: '0 auto',
        background:   'var(--color-surface)',
        borderRadius: '20px 20px 0 0',
        padding:      '24px 20px 32px',
        boxShadow:    '0 -20px 60px rgba(0,0,0,0.3)',
        animation:    'slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}>
        {/* Handle bar */}
        <div style={{
          width: 40, height: 4, borderRadius: 99,
          background: 'var(--color-border)',
          margin: '0 auto 20px',
        }} />

        <h3 style={{ fontWeight: 800, fontSize: 17, marginBottom: 16 }}>
          📋 Đăng ký nghỉ phép
        </h3>

        {formError && (
          <div style={{
            background: '#EF444415', border: '1px solid #EF444430',
            borderRadius: 8, padding: '10px 12px', marginBottom: 12, fontSize: 13, color: '#EF4444',
          }}>
            {formError}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Loại phép */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>
              Loại phép
            </label>
            <select
              className="form-input"
              value={leaveTypeId}
              onChange={e => setLeaveTypeId(Number(e.target.value))}
              style={{ width: '100%', fontSize: 14 }}
            >
              {balances.map(b => (
                <option key={b.leaveTypeId} value={b.leaveTypeId}>
                  {b.leaveTypeName} (còn {b.remaining} ngày)
                </option>
              ))}
            </select>
          </div>

          {/* Ngày + Period */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>
                Từ ngày
              </label>
              <input type="date" className="form-input" value={startDate}
                onChange={e => { setStartDate(e.target.value); if (!endDate) setEndDate(e.target.value); }}
                style={{ width: '100%', fontSize: 13 }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>
                Đến ngày
              </label>
              <input type="date" className="form-input" value={endDate}
                onChange={e => setEndDate(e.target.value)}
                min={startDate}
                style={{ width: '100%', fontSize: 13 }} />
            </div>
          </div>

          {/* Buổi */}
          {startDate === endDate && startDate && (
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>
                Xin nghỉ buổi
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['FULL_DAY', 'MORNING', 'AFTERNOON'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    style={{
                      flex: 1, padding: '6px 0', borderRadius: 8, fontSize: 12, fontWeight: 600,
                      border: `1px solid ${period === p ? '#2563EB' : 'var(--color-border)'}`,
                      background: period === p ? '#2563EB15' : 'transparent',
                      color: period === p ? '#2563EB' : 'var(--color-text-muted)',
                      cursor: 'pointer',
                    }}
                  >
                    {p === 'FULL_DAY' ? 'Cả ngày' : p === 'MORNING' ? 'Buổi sáng' : 'Buổi chiều'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Lý do */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>
              Lý do
            </label>
            <textarea
              className="form-input"
              placeholder="Mô tả ngắn gọn lý do nghỉ..."
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={2}
              style={{ width: '100%', fontSize: 13, resize: 'none' }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button onClick={onClose} className="btn btn-ghost" style={{ flex: 1 }}>
              Hủy
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="btn btn-primary"
              style={{ flex: 2 }}
            >
              {submitting
                ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Đang gửi...</>
                : <>Gửi đơn xin nghỉ <ChevronRight size={14} /></>}
            </button>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LeaveBalanceWidget — Main Component
// ─────────────────────────────────────────────────────────────────────────────
export default function LeaveBalanceWidget() {
  const year    = new Date().getFullYear();
  const { data, isLoading, error, refresh, optimisticDeduct } = useLeaveBalance(year);
  const [showForm, setShowForm] = useState(false);

  // ── Handler: sau khi submit form ─────────────────────────────────────────
  // Đây là điểm kết nối State Management:
  //   optimisticDeduct() → cập nhật cache SWR ngay lập tức (UI cập nhật tức thì)
  //   revalidate: true   → vẫn re-fetch để sync số thật từ server
  const handleLeaveSuccess = useCallback((leaveTypeId: number, days: number) => {
    optimisticDeduct(leaveTypeId, days);
    setShowForm(false);
  }, [optimisticDeduct]);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--color-text-muted)', fontSize: 13 }}>
          <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
          Đang tải quỹ phép...
        </div>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <AlertTriangle size={18} style={{ color: '#F59E0B', flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>Không tải được quỹ phép</div>
            <button onClick={refresh} className="btn btn-ghost btn-sm" style={{ marginTop: 6, padding: '4px 10px', fontSize: 12 }}>
              <RefreshCw size={11} /> Thử lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Empty: chưa có balance ────────────────────────────────────────────────
  if (!data || data.balances.length === 0) {
    return (
      <div className="card" style={{ padding: 20 }}>
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <Calendar size={32} style={{ color: 'var(--color-text-muted)', marginBottom: 8 }} />
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
            Chưa có dữ liệu quỹ phép năm {year}
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>
            Liên hệ HR để được phân bổ phép
          </div>
        </div>
      </div>
    );
  }

  const { summary, balances } = data;

  return (
    <>
      <div className="card" style={{ padding: '18px 16px' }}>
        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Calendar size={15} style={{ color: '#10B981' }} />
              Quỹ phép năm {year}
            </div>
            {summary.pendingAnnualDays > 0 && (
              <div style={{ fontSize: 11, color: '#F59E0B', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Hourglass size={10} />
                {summary.pendingAnnualDays} ngày đang chờ duyệt
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={refresh}
              className="btn btn-ghost btn-sm"
              title="Làm mới dữ liệu"
              style={{ padding: '4px 8px' }}
            >
              <RefreshCw size={13} />
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="btn btn-primary btn-sm"
              style={{ fontSize: 12, gap: 4 }}
            >
              <Plus size={13} /> Xin nghỉ
            </button>
          </div>
        </div>

        {/* ── Summary hero (Phép năm) ── */}
        {summary.totalAnnualDays > 0 && (
          <div style={{
            background:    'linear-gradient(135deg, #10B98112, #10B98108)',
            border:        '1px solid #10B98130',
            borderRadius:  12,
            padding:       '12px 14px',
            marginBottom:  14,
            display:       'flex',
            alignItems:    'center',
            gap:           14,
          }}>
            <MiniDonut
              usagePct={Math.round((summary.usedAnnualDays / summary.totalAnnualDays) * 100)}
              pendingPct={Math.round((summary.pendingAnnualDays / summary.totalAnnualDays) * 100)}
              color={getColor('ANNUAL')}
              size={76}
              label={summary.remainingAnnualDays}
            />
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Phép năm</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'auto auto', gap: '3px 16px', fontSize: 12 }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Tổng phép:</span>
                <span style={{ fontWeight: 700 }}>{summary.totalAnnualDays} ngày</span>
                <span style={{ color: 'var(--color-text-muted)' }}>Đã dùng:</span>
                <span style={{ fontWeight: 700, color: '#10B981' }}>{summary.usedAnnualDays} ngày</span>
                {summary.pendingAnnualDays > 0 && (
                  <>
                    <span style={{ color: 'var(--color-text-muted)' }}>Đang chờ:</span>
                    <span style={{ fontWeight: 700, color: '#F59E0B' }}>{summary.pendingAnnualDays} ngày</span>
                  </>
                )}
                <span style={{ color: 'var(--color-text-muted)' }}>Còn lại:</span>
                <span style={{ fontWeight: 900, color: '#10B981', fontSize: 14 }}>
                  {summary.remainingAnnualDays} ngày
                  {summary.remainingAnnualDays > 0
                    ? <CheckCircle size={12} style={{ marginLeft: 4, display: 'inline' }} />
                    : null
                  }
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ── Các loại phép khác ── */}
        {balances.filter(b => b.leaveTypeCode !== 'ANNUAL').length > 0 && (
          <div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600, marginBottom: 4 }}>
              Các loại phép khác
            </div>
            {balances
              .filter(b => b.leaveTypeCode !== 'ANNUAL')
              .map(entry => (
                <BalanceRow key={entry.id} entry={entry} />
              ))
            }
          </div>
        )}

        {/* ── Legend ── */}
        <div style={{ display: 'flex', gap: 12, marginTop: 12, fontSize: 10, color: 'var(--color-text-muted)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
            Đã dùng
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B98145', display: 'inline-block' }} />
            Chờ duyệt
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-border)', display: 'inline-block' }} />
            Còn lại
          </span>
          <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Clock size={10} />
            Cập nhật tự động 2 phút/lần
          </span>
        </div>
      </div>

      {/* ── Mini Form Drawer ── */}
      {showForm && (
        <LeaveRequestMiniForm
          balances={balances}
          onClose={() => setShowForm(false)}
          onSuccess={handleLeaveSuccess}
        />
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}
