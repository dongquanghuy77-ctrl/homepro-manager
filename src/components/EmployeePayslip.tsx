'use client';
// src/components/EmployeePayslip.tsx
// ══════════════════════════════════════════════════════════════════════════════
// Phiếu Lương Cá Nhân — Chỉ hiển thị bản ghi PUBLISHED của chính nhân viên đó
// ══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback }  from 'react';
import useSWR                     from 'swr';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
interface LineItem {
  code:        string;
  label:       string;
  formula:     string;
  amount:      number;
  isDeduction: boolean;
  multiplier?: number;
}
interface Dispute {
  id:          number;
  status:      'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'CLOSED';
  reason:      string;
  hrResponse:  string | null;
  createdAt:   string;
}
interface Payslip {
  id:                 number;
  employeeName:       string;
  employeeCode:       string | null;
  department:         string | null;
  month:              number;
  year:               number;
  officialSalary:     number;
  basicSalary:        number;
  regularWorkedDays:  number;
  paidLeaveDays:      number;
  eveningOtHours:     number;
  nightOtHours:       number;
  sundayHours:        number;
  sundayNightHours:   number;
  absentDays:         number;
  totalLateEarlyMins: number;
  attendanceAllowance:number;
  grossEarnings:      number;
  totalDeductions:    number;
  netSalary:          number;
  bhxhEmployee:       number;
  bhxhEmployer:       number;
  lineItemsJson:      LineItem[] | null;
  warningsJson:       string[]   | null;
  publishedAt:        string | null;
  status:             'PUBLISHED';
}
interface HistoryEntry {
  month:       number;
  year:        number;
  netSalary:   number;
  publishedAt: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────────────────────────────────────────
const vnd    = (n: number) => n.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
const shortV = (n: number) => `${(n / 1_000_000).toFixed(2)}tr`;
const fetcher = (url: string) => fetch(url).then(r => r.json());

// ─────────────────────────────────────────────────────────────────────────────
// LINE ITEM GROUPS — Phân nhóm các dòng lương
// ─────────────────────────────────────────────────────────────────────────────
const GROUPS: { title: string; icon: string; codes: string[]; color: string }[] = [
  {
    title:  'Lương ngày công',
    icon:   '📅',
    codes:  ['REGULAR', 'PAID_LEAVE'],
    color:  '#6366F1',
  },
  {
    title:  'Tăng ca (OT)',
    icon:   '⏰',
    codes:  ['OT_EVENING', 'OT_NIGHT', 'SUNDAY', 'SUNDAY_NIGHT'],
    color:  '#F59E0B',
  },
  {
    title:  'Ngày Lễ',
    icon:   '🏖',
    codes:  ['HOLIDAY_OFF', 'HOLIDAY_WORK_WEEKDAY', 'HOLIDAY_WORK_SUNDAY'],
    color:  '#10B981',
  },
  {
    title:  'Phụ cấp',
    icon:   '🎯',
    codes:  ['ALLOWANCE_ATTENDANCE'],
    color:  '#EC4899',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// DISPUTE STATUS META
// ─────────────────────────────────────────────────────────────────────────────
const DISPUTE_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  OPEN:         { label: '🔵 Đang chờ',    color: '#3B82F6', bg: '#3B82F620' },
  UNDER_REVIEW: { label: '🟡 Đang xét',    color: '#F59E0B', bg: '#F59E0B20' },
  RESOLVED:     { label: '🟢 Đã xử lý',   color: '#10B981', bg: '#10B98120' },
  CLOSED:       { label: '⚫ Đã đóng',     color: '#6B7280', bg: '#6B728020' },
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function EmployeePayslip() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year,  setYear]  = useState(now.getFullYear());

  // ── Dispute modal state ────────────────────────────────────────────────────
  const [showDispute,  setShowDispute]  = useState(false);
  const [disputeText,  setDisputeText]  = useState('');
  const [submitting,   setSubmitting]   = useState(false);
  const [toast,        setToast]        = useState<{ type: 'success'|'error'; msg: string }|null>(null);

  const showToast = useCallback((type: 'success'|'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4500);
  }, []);

  // ── SWR: Phiếu lương hiện tại ──────────────────────────────────────────────
  const { data: payslipData, isLoading, mutate: mutatePayslip } = useSWR<{ payslip: Payslip; disputes: Dispute[] }>(
    `/api/payroll/my?month=${month}&year=${year}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  // ── SWR: Danh sách tháng có phiếu lương ───────────────────────────────────
  const { data: historyData } = useSWR<{ history: HistoryEntry[] }>(
    '/api/payroll/my/history',
    fetcher,
    { revalidateOnFocus: false }
  );

  const payslip  = payslipData?.payslip;
  const disputes = payslipData?.disputes ?? [];
  const history  = historyData?.history  ?? [];

  const lineItems = (payslip?.lineItemsJson ?? []) as LineItem[];
  const deductions = lineItems.filter(l => l.isDeduction);

  // ── Submit dispute ────────────────────────────────────────────────────────
  const handleSubmitDispute = async () => {
    if (!payslip) return;
    if (disputeText.trim().length < 10) {
      showToast('error', 'Vui lòng mô tả chi tiết hơn (ít nhất 10 ký tự)');
      return;
    }
    setSubmitting(true);
    try {
      const res  = await fetch('/api/payroll/my/dispute', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ payrollId: payslip.id, reason: disputeText }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Lỗi gửi khiếu nại');
      showToast('success', '✅ Khiếu nại đã gửi! HR sẽ phản hồi trong 2-3 ngày làm việc.');
      setDisputeText('');
      setShowDispute(false);
      mutatePayslip(); // Refresh disputes list
    } catch(e) {
      showToast('error', `❌ ${String(e)}`);
    } finally {
      setSubmitting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="payslip-root">
      {/* Toast */}
      {toast && (
        <div className={`payslip-toast payslip-toast--${toast.type}`}>{toast.msg}</div>
      )}

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="payslip-header-row">
        <div>
          <h1 className="page-title">💵 Phiếu Lương Của Tôi</h1>
          <p className="page-subtitle">Chỉ hiển thị phiếu lương đã được HR công bố</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {/* History quick-select */}
          {history.length > 0 && (
            <select
              id="payslip-month-select"
              className="filter-select"
              value={`${year}-${month}`}
              onChange={e => {
                const [y, m] = e.target.value.split('-').map(Number);
                setYear(y); setMonth(m);
              }}
            >
              {history.map(h => (
                <option key={`${h.year}-${h.month}`} value={`${h.year}-${h.month}`}>
                  Tháng {h.month}/{h.year} — {shortV(h.netSalary)}
                </option>
              ))}
            </select>
          )}
          {payslip && (
            <button
              id="btn-open-dispute"
              className="btn btn-warning"
              onClick={() => setShowDispute(true)}
              style={{ background: '#EF4444', color: '#fff', border: 'none' }}
            >
              ✉️ Gửi thắc mắc / Khiếu nại
            </button>
          )}
        </div>
      </div>

      {/* ── Loading / Not found ────────────────────────────────────────── */}
      {isLoading && (
        <div className="payslip-empty">⏳ Đang tải phiếu lương...</div>
      )}
      {!isLoading && !payslip && (
        <div className="payslip-empty">
          <div style={{ fontSize: 48, marginBottom: 12 }}>📄</div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Chưa có phiếu lương tháng {month}/{year}</div>
          <div style={{ fontSize: 13, opacity: 0.5, marginTop: 6 }}>
            Phiếu lương sẽ xuất hiện sau khi HR chốt sổ và công bố.
          </div>
          {history.length > 0 && (
            <div style={{ marginTop: 16, fontSize: 13, opacity: 0.7 }}>
              Phiếu lương có sẵn: {history.map(h => `T${h.month}/${h.year}`).join(', ')}
            </div>
          )}
        </div>
      )}

      {/* ── Payslip Main ──────────────────────────────────────────────── */}
      {payslip && (
        <>
          {/* ── Hero: Thực nhận ───────────────────────────────────────── */}
          <div className="payslip-hero card">
            <div className="payslip-hero-left">
              <div style={{ fontSize: 13, opacity: 0.5, marginBottom: 4 }}>
                {payslip.employeeCode} · {payslip.department}
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 2 }}>{payslip.employeeName}</div>
              <div style={{ fontSize: 13, opacity: 0.5 }}>
                Tháng {payslip.month}/{payslip.year} · Công bố {payslip.publishedAt
                  ? new Date(payslip.publishedAt).toLocaleDateString('vi-VN')
                  : '—'}
              </div>
              {/* Salary info */}
              <div style={{ display: 'flex', gap: 20, marginTop: 14, flexWrap: 'wrap' }}>
                <SalaryPill label="Lương chính thức" value={vnd(payslip.officialSalary)} />
                <SalaryPill label="Lương cơ bản"     value={vnd(payslip.basicSalary)} />
                <SalaryPill label="BHXH NV đóng"     value={vnd(payslip.bhxhEmployee)} sub="10.5% lương cơ bản" />
              </div>
            </div>
            <div className="payslip-hero-right">
              <div style={{ fontSize: 13, opacity: 0.5 }}>LƯƠNG THỰC NHẬN</div>
              <div className="payslip-net-amount">{vnd(payslip.netSalary)}</div>
              <div style={{ fontSize: 12, opacity: 0.4, marginTop: 4 }}>
                Thu nhập: {vnd(payslip.grossEarnings)} · Khấu trừ: {vnd(payslip.totalDeductions)}
              </div>
              {/* Mini progress bar: gross vs net */}
              <div style={{ marginTop: 10, height: 6, background: '#ffffff20', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${Math.round((payslip.netSalary / payslip.grossEarnings) * 100)}%`,
                  background: 'linear-gradient(90deg, #10B981, #6366F1)',
                  borderRadius: 99,
                  transition: 'width 0.8s ease',
                }}/>
              </div>
              <div style={{ fontSize: 11, opacity: 0.4, marginTop: 4 }}>
                {Math.round((payslip.netSalary / payslip.grossEarnings) * 100)}% thu nhập gộp
              </div>
            </div>
          </div>

          {/* ── Attendance Summary ─────────────────────────────────────── */}
          <div className="payslip-stats-row">
            <StatChip icon="📆" label="Ngày công" value={`${payslip.regularWorkedDays}d`} />
            <StatChip icon="🏖" label="Phép năm"  value={`${payslip.paidLeaveDays}d`} />
            <StatChip icon="⏰" label="OT"         value={`${(payslip.eveningOtHours + payslip.nightOtHours).toFixed(1)}h`} color="#F59E0B" />
            <StatChip icon="🌙" label="OT CN"      value={`${payslip.sundayHours.toFixed(1)}h`} color="#6366F1" />
            <StatChip icon="🚫" label="Vắng"       value={`${payslip.absentDays}d`} color={payslip.absentDays > 0 ? '#EF4444' : undefined} />
            <StatChip icon="🕐" label="Muộn/Sớm"  value={`${payslip.totalLateEarlyMins}phút`} color={payslip.totalLateEarlyMins > 0 ? '#F59E0B' : undefined} />
          </div>

          {/* ── Line Items by Group ──────────────────────────────────────── */}
          <div className="payslip-groups-grid">
            {GROUPS.map(group => {
              const items = lineItems.filter(l => group.codes.includes(l.code) && !l.isDeduction);
              const total = items.reduce((s, l) => s + l.amount, 0);
              if (items.length === 0 && total === 0) return null;
              return (
                <div key={group.title} className="card payslip-group-card">
                  <div className="payslip-group-header">
                    <span className="payslip-group-icon">{group.icon}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{group.title}</div>
                      <div style={{ fontSize: 12, color: group.color, fontWeight: 600 }}>{vnd(total)}</div>
                    </div>
                  </div>
                  {/* Mini bar */}
                  <div style={{ height: 3, background: `${group.color}30`, borderRadius: 99, marginBottom: 12, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${payslip.grossEarnings > 0 ? Math.round((total / payslip.grossEarnings) * 100) : 0}%`,
                      background: group.color,
                      borderRadius: 99,
                      transition: 'width 0.8s ease',
                    }}/>
                  </div>
                  {items.map(item => (
                    <div key={item.code} className="payslip-line-item">
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{item.label}</div>
                        <div className="payslip-formula" title={item.formula}>{item.formula}</div>
                      </div>
                      <div style={{ color: group.color, fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' }}>
                        {vnd(item.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}

            {/* ── Khấu trừ ──────────────────────────────────────────────── */}
            {deductions.length > 0 && (
              <div className="card payslip-group-card">
                <div className="payslip-group-header">
                  <span className="payslip-group-icon">➖</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>Khấu trừ</div>
                    <div style={{ fontSize: 12, color: '#EF4444', fontWeight: 600 }}>
                      ({vnd(deductions.reduce((s,l) => s + l.amount, 0))})
                    </div>
                  </div>
                </div>
                <div style={{ height: 3, background: '#EF444430', borderRadius: 99, marginBottom: 12 }}/>
                {deductions.map(item => (
                  <div key={item.code} className="payslip-line-item">
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{item.label}</div>
                      <div className="payslip-formula" title={item.formula}>{item.formula}</div>
                    </div>
                    <div style={{ color: '#EF4444', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' }}>
                      ({vnd(item.amount)})
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Summary Footer ────────────────────────────────────────────── */}
          <div className="card" style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ fontSize: 13, opacity: 0.6 }}>
                <strong>BHXH doanh nghiệp đóng thêm:</strong> {vnd(payslip.bhxhEmployer)} (17.5% — bạn không bị trừ khoản này)
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12, opacity: 0.5 }}>LƯƠNG THỰC NHẬN</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#10B981' }}>{vnd(payslip.netSalary)}</div>
              </div>
            </div>
            {/* Warnings */}
            {payslip.warningsJson && payslip.warningsJson.length > 0 && (
              <div style={{ marginTop: 10, padding: '8px 12px', background: '#F59E0B15', borderRadius: 8, borderLeft: '3px solid #F59E0B' }}>
                {payslip.warningsJson.map((w, i) => (
                  <div key={i} style={{ fontSize: 12, color: '#F59E0B' }}>⚠️ {w}</div>
                ))}
              </div>
            )}
          </div>

          {/* ── Disputes History ──────────────────────────────────────────── */}
          {disputes.length > 0 && (
            <div className="card" style={{ marginTop: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>📋 Lịch sử khiếu nại tháng {payslip.month}/{payslip.year}</div>
              {disputes.map(d => {
                const meta = DISPUTE_STATUS[d.status] ?? DISPUTE_STATUS.OPEN;
                return (
                  <div key={d.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 12, background: meta.bg, color: meta.color, padding: '2px 10px', borderRadius: 99, fontWeight: 600 }}>
                        {meta.label}
                      </span>
                      <span style={{ fontSize: 12, opacity: 0.4 }}>
                        {new Date(d.createdAt).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, opacity: 0.8 }}>💬 <em>{d.reason}</em></div>
                    {d.hrResponse && (
                      <div style={{ marginTop: 8, padding: '8px 12px', background: '#10B98115', borderRadius: 8, fontSize: 13 }}>
                        <strong style={{ color: '#10B981' }}>HR phản hồi:</strong> {d.hrResponse}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          DISPUTE MODAL
          ══════════════════════════════════════════════════════════════════ */}
      {showDispute && payslip && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowDispute(false); }}>
          <div className="modal-box dispute-modal" role="dialog" aria-label="Gửi khiếu nại phiếu lương">
            {/* Modal Header */}
            <div className="modal-header">
              <div>
                <h2 style={{ margin: 0, fontSize: 18 }}>✉️ Gửi Thắc Mắc / Khiếu Nại</h2>
                <p style={{ margin: '4px 0 0', fontSize: 13, opacity: 0.5 }}>
                  Phiếu lương tháng {payslip.month}/{payslip.year} · {vnd(payslip.netSalary)} thực nhận
                </p>
              </div>
              <button
                id="btn-close-dispute"
                className="btn btn-ghost btn-sm"
                onClick={() => setShowDispute(false)}
                style={{ fontSize: 18, padding: '2px 10px' }}
              >×</button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '16px 20px' }}>
              <label style={{ fontSize: 13, opacity: 0.7, display: 'block', marginBottom: 6 }}>
                Mô tả thắc mắc của bạn <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <textarea
                id="dispute-reason"
                rows={5}
                value={disputeText}
                onChange={e => setDisputeText(e.target.value)}
                placeholder="Ví dụ: Em thấy thiếu 2 tiếng OT ngày 15/08, em đã làm đến 20h30 nhưng phiếu lương chỉ ghi 1 tiếng OT chiều..."
                maxLength={1000}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'var(--bg-tertiary)', color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)', borderRadius: 8,
                  padding: '10px 12px', fontSize: 13, resize: 'vertical',
                  fontFamily: 'inherit', lineHeight: 1.6,
                }}
              />
              <div style={{ fontSize: 11, opacity: 0.4, textAlign: 'right', marginTop: 4 }}>
                {disputeText.length}/1000 ký tự
              </div>

              {/* Tips */}
              <div style={{ marginTop: 12, padding: '10px 14px', background: '#6366F115', borderRadius: 8, fontSize: 12, opacity: 0.8 }}>
                💡 <strong>Mô tả càng chi tiết càng tốt:</strong> Ngày cụ thể, số giờ, lý do bạn cho là có sai sót.
                HR sẽ đối chiếu dữ liệu chấm công và phản hồi trong 2-3 ngày làm việc.
              </div>
            </div>

            {/* Modal Footer */}
            <div className="modal-footer">
              <button
                id="btn-cancel-dispute"
                className="btn btn-ghost"
                onClick={() => setShowDispute(false)}
                disabled={submitting}
              >Hủy bỏ</button>
              <button
                id="btn-submit-dispute"
                className="btn btn-primary"
                onClick={handleSubmitDispute}
                disabled={submitting || disputeText.trim().length < 10}
                style={{ background: '#EF4444', border: 'none' }}
              >
                {submitting ? '⏳ Đang gửi...' : '📤 Gửi khiếu nại'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .payslip-root        { padding: 0; }
        .payslip-header-row  { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px; margin-bottom: 20px; }
        .payslip-hero        { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 20px; margin-bottom: 16px; padding: 24px 28px; background: linear-gradient(135deg, #1e1b4b 0%, #1a1a2e 100%); border: 1px solid #6366F140; }
        .payslip-hero-left   { flex: 1; min-width: 220px; }
        .payslip-hero-right  { text-align: right; min-width: 200px; }
        .payslip-net-amount  { font-size: 34px; font-weight: 900; color: #10B981; letter-spacing: -1px; margin-top: 4px; }
        .payslip-stats-row   { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 16px; }
        .payslip-groups-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; margin-bottom: 16px; }
        .payslip-group-card  { padding: 16px; }
        .payslip-group-header{ display: flex; gap: 12px; align-items: center; margin-bottom: 12px; }
        .payslip-group-icon  { font-size: 24px; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; border-radius: 10px; background: rgba(255,255,255,0.06); }
        .payslip-line-item   { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; padding: 7px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .payslip-line-item:last-child { border-bottom: none; }
        .payslip-formula     { font-size: 11px; opacity: 0.4; margin-top: 2px; cursor: help; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px; }
        .payslip-empty       { text-align: center; padding: 60px 20px; opacity: 0.6; }
        .payslip-toast       { position: fixed; top: 20px; right: 20px; z-index: 1000; padding: 14px 20px; border-radius: 10px; font-size: 14px; box-shadow: 0 8px 24px rgba(0,0,0,0.3); animation: slideIn 0.3s ease; max-width: 360px; }
        .payslip-toast--success { background: #10B981; color: #fff; }
        .payslip-toast--error   { background: #EF4444; color: #fff; }
        .dispute-modal       { max-width: 540px; width: 90vw; }
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @media (max-width: 640px) {
          .payslip-hero      { padding: 16px; }
          .payslip-net-amount{ font-size: 26px; }
          .payslip-groups-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────
function SalaryPill({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ fontSize: 12 }}>
      <div style={{ opacity: 0.5, marginBottom: 2 }}>{label}</div>
      <div style={{ fontWeight: 700, fontSize: 14 }}>{value}</div>
      {sub && <div style={{ opacity: 0.4, fontSize: 11 }}>{sub}</div>}
    </div>
  );
}

function StatChip({ icon, label, value, color }: { icon: string; label: string; value: string; color?: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '8px 14px', borderRadius: 10,
      background: color ? `${color}15` : 'rgba(255,255,255,0.05)',
      border: `1px solid ${color ?? 'rgba(255,255,255,0.08)'}30`,
      fontSize: 13, color: color ?? 'inherit',
    }}>
      <span>{icon}</span>
      <div>
        <div style={{ opacity: 0.6, fontSize: 11 }}>{label}</div>
        <div style={{ fontWeight: 700 }}>{value}</div>
      </div>
    </div>
  );
}
