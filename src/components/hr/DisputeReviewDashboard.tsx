'use client';
// ══════════════════════════════════════════════════════════════════════════════
// src/components/hr/DisputeReviewDashboard.tsx
// HR Inbox — Xử lý khiếu nại phiếu lương (Payslip Disputes)
// ══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback } from 'react';
import useSWR, { mutate as globalMutate } from 'swr';

// ─── Types ─────────────────────────────────────────────────────────────────────
interface Dispute {
  id:           number;
  payrollId:    number;
  employeeId:   number;
  month:        number;
  year:         number;
  reason:       string;
  status:       string;
  hrResponse:   string | null;
  reviewedBy:   number | null;
  reviewedAt:   string | null;
  createdAt:    string;
  employeeName: string;
  employeeCode: string | null;
  employeeDept: string | null;
  netSalary:    number;
}

interface DisputeDetail extends Dispute {
  grossEarnings:      number;
  totalDeductions:    number;
  lineItemsJson:      LineItem[] | null;
  regularWorkedDays:  number;
  eveningOtHours:     number;
  nightOtHours:       number;
  totalLateEarlyMins: number;
  attendanceAllowance:number;
}

interface LineItem {
  code:        string;
  label:       string;
  formula:     string;
  amount:      number;
  isDeduction: boolean;
}

interface ListResponse {
  rows:       Dispute[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  badges:     Record<string, number>;
}

// ─── Constants ─────────────────────────────────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  OPEN:         'Mới',
  UNDER_REVIEW: 'Đang xem',
  RESOLVED:     'Đã giải quyết',
  CLOSED:       'Đã đóng',
};

const STATUS_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  OPEN:         { bg: 'rgba(59,130,246,0.12)',  color: '#3B82F6', border: '#3B82F6' },
  UNDER_REVIEW: { bg: 'rgba(245,158,11,0.12)',  color: '#D97706', border: '#F59E0B' },
  RESOLVED:     { bg: 'rgba(16,185,129,0.12)',  color: '#059669', border: '#10B981' },
  CLOSED:       { bg: 'rgba(100,116,139,0.12)', color: '#64748B', border: '#94A3B8' },
};

const NEXT_ACTIONS: Record<string, { label: string; status: string; color: string }[]> = {
  OPEN:         [
    { label: '🔍 Bắt đầu xem xét', status: 'UNDER_REVIEW', color: '#F59E0B' },
    { label: '✅ Giải quyết ngay',  status: 'RESOLVED',     color: '#10B981' },
    { label: '⛔ Đóng (từ chối)',   status: 'CLOSED',        color: '#EF4444' },
  ],
  UNDER_REVIEW: [
    { label: '✅ Giải quyết',       status: 'RESOLVED',     color: '#10B981' },
    { label: '⛔ Đóng (từ chối)',   status: 'CLOSED',        color: '#EF4444' },
  ],
  RESOLVED:     [
    { label: '⛔ Đóng hồ sơ',      status: 'CLOSED',        color: '#64748B' },
  ],
  CLOSED:       [],
};

const vnd = (n: number) => Math.round(n).toLocaleString('vi-VN') + ' ₫';
const fetcher = (url: string) => fetch(url).then(r => r.json());

const now = new Date();

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
export default function DisputeReviewDashboard() {
  // ── Filters ─────────────────────────────────────────────────────────────────
  const [filterStatus, setFilterStatus] = useState('OPEN');
  const [filterMonth,  setFilterMonth]  = useState(now.getMonth() + 1);
  const [filterYear,   setFilterYear]   = useState(now.getFullYear());
  const [page,         setPage]         = useState(1);

  // ── Selected dispute + review modal ─────────────────────────────────────────
  const [selectedId,   setSelectedId]   = useState<number | null>(null);
  const [reviewStatus, setReviewStatus] = useState('');
  const [hrResponse,   setHrResponse]   = useState('');
  const [submitting,   setSubmitting]   = useState(false);
  const [toast,        setToast]        = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // ── SWR: list ───────────────────────────────────────────────────────────────
  const listUrl = `/api/hr/disputes?status=${filterStatus}&month=${filterMonth}&year=${filterYear}&page=${page}&limit=20`;
  const { data, isLoading, mutate } = useSWR<ListResponse>(listUrl, fetcher, {
    revalidateOnFocus: false,
    keepPreviousData:  true,
  });

  // ── SWR: detail ─────────────────────────────────────────────────────────────
  const { data: detail, isLoading: detailLoading } =
    useSWR<DisputeDetail>(selectedId ? `/api/hr/disputes/${selectedId}` : null, fetcher);

  // ── Toast helper ─────────────────────────────────────────────────────────────
  const showToast = useCallback((type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // ── Open modal ──────────────────────────────────────────────────────────────
  const openDispute = (d: Dispute) => {
    setSelectedId(d.id);
    setReviewStatus('');
    setHrResponse(d.hrResponse ?? '');
  };

  // ── Submit review ───────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!selectedId || !reviewStatus) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/hr/disputes/${selectedId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ status: reviewStatus, hrResponse }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      showToast('success', json.message ?? '✅ Đã cập nhật thành công');
      mutate();
      globalMutate(key => typeof key === 'string' && key.startsWith('/api/hr/disputes'));
      setSelectedId(null);
    } catch (e) {
      showToast('error', `❌ ${String(e)}`);
    } finally {
      setSubmitting(false);
    }
  };

  const rows       = data?.rows       ?? [];
  const pagination = data?.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 1 };
  const badges     = data?.badges     ?? {};

  // ─── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ position: 'relative' }}>

      {/* ── Toast notification ─────────────────────────────────────────────── */}
      {toast && (
        <div style={{
          position: 'fixed', top: 24, right: 24, zIndex: 9999,
          background: toast.type === 'success' ? '#065F46' : '#7F1D1D',
          color: '#fff', padding: '12px 20px', borderRadius: 10,
          fontWeight: 600, fontSize: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          animation: 'slideIn 0.25s ease',
        }}>
          {toast.msg}
        </div>
      )}

      {/* ── Page header ────────────────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Hộp thư Khiếu nại</h1>
          <p className="page-subtitle">Xem xét và phản hồi khiếu nại phiếu lương của nhân viên</p>
        </div>
      </div>

      {/* ── Status badge tabs ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {(['', 'OPEN', 'UNDER_REVIEW', 'RESOLVED', 'CLOSED'] as const).map(s => {
          const label = s === '' ? 'Tất cả' : STATUS_LABELS[s];
          const cnt   = s === '' ? Object.values(badges).reduce((a, b) => a + b, 0) : (badges[s] ?? 0);
          const st    = s ? STATUS_STYLES[s] : { bg: 'rgba(99,102,241,0.12)', color: '#6366F1', border: '#6366F1' };
          const active = filterStatus === s;
          return (
            <button key={s} onClick={() => { setFilterStatus(s); setPage(1); }} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 20, cursor: 'pointer',
              border: `1.5px solid ${active ? st.border : 'rgba(255,255,255,0.1)'}`,
              background: active ? st.bg : 'transparent',
              color: active ? st.color : 'rgba(255,255,255,0.5)',
              fontWeight: active ? 700 : 400, fontSize: 13,
              transition: 'all 0.15s',
            }}>
              {label}
              {cnt > 0 && (
                <span style={{
                  background: active ? st.color : 'rgba(255,255,255,0.15)',
                  color: active ? '#fff' : 'rgba(255,255,255,0.7)',
                  borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700,
                }}>
                  {cnt}
                </span>
              )}
            </button>
          );
        })}

        {/* Month/Year filters */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <select
            value={filterMonth}
            onChange={e => { setFilterMonth(Number(e.target.value)); setPage(1); }}
            className="form-select"
            style={{ padding: '6px 10px', fontSize: 13, width: 'auto' }}
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>Tháng {i + 1}</option>
            ))}
          </select>
          <select
            value={filterYear}
            onChange={e => { setFilterYear(Number(e.target.value)); setPage(1); }}
            className="form-select"
            style={{ padding: '6px 10px', fontSize: 13, width: 'auto' }}
          >
            {[2024, 2025, 2026, 2027].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Dispute list ───────────────────────────────────────────────────── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading && (
          <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
            ⏳ Đang tải...
          </div>
        )}

        {!isLoading && rows.length === 0 && (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15 }}>
              Không có khiếu nại nào {filterStatus ? `ở trạng thái "${STATUS_LABELS[filterStatus]}"` : ''}
            </div>
          </div>
        )}

        {rows.map((d, idx) => {
          const st     = STATUS_STYLES[d.status] ?? STATUS_STYLES.CLOSED;
          const isNew  = d.status === 'OPEN';
          const dayAgo = Math.floor((Date.now() - new Date(d.createdAt).getTime()) / 86400000);

          return (
            <div
              key={d.id}
              onClick={() => openDispute(d)}
              style={{
                padding: '16px 20px',
                borderBottom: idx < rows.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                cursor: 'pointer',
                background: isNew ? 'rgba(59,130,246,0.04)' : 'transparent',
                transition: 'background 0.15s',
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                gap: 12,
                alignItems: 'start',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
              onMouseLeave={e => (e.currentTarget.style.background = isNew ? 'rgba(59,130,246,0.04)' : 'transparent')}
            >
              {/* Left: Info */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  {/* Status badge */}
                  <span style={{
                    padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700,
                    background: st.bg, color: st.color, border: `1px solid ${st.border}`,
                    textTransform: 'uppercase', letterSpacing: '0.04em',
                  }}>
                    {STATUS_LABELS[d.status]}
                  </span>

                  {/* Employee */}
                  <span style={{ fontWeight: 600, fontSize: 14 }}>
                    {d.employeeName}
                  </span>
                  {d.employeeCode && (
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
                      #{d.employeeCode}
                    </span>
                  )}
                  {d.employeeDept && (
                    <span style={{
                      padding: '1px 8px', borderRadius: 10, fontSize: 11,
                      background: 'rgba(139,92,246,0.15)', color: '#A78BFA',
                    }}>
                      {d.employeeDept}
                    </span>
                  )}
                </div>

                {/* Reason preview */}
                <p style={{
                  margin: '0 0 6px', color: 'rgba(255,255,255,0.75)', fontSize: 13,
                  lineHeight: 1.5, display: '-webkit-box',
                  WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}>
                  {d.reason}
                </p>

                <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                  <span>📅 Tháng {d.month}/{d.year}</span>
                  <span>💰 Thực nhận: <strong style={{ color: '#10B981' }}>{vnd(d.netSalary)}</strong></span>
                  <span>🕐 {dayAgo === 0 ? 'Hôm nay' : `${dayAgo} ngày trước`}</span>
                  {d.hrResponse && <span style={{ color: '#10B981' }}>✍️ Đã có phản hồi</span>}
                </div>
              </div>

              {/* Right: Arrow */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          );
        })}
      </div>

      {/* ── Pagination ─────────────────────────────────────────────────────── */}
      {pagination.totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
          {Array.from({ length: pagination.totalPages }, (_, i) => (
            <button key={i} onClick={() => setPage(i + 1)} style={{
              width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer',
              background: page === i + 1 ? '#6366F1' : 'rgba(255,255,255,0.08)',
              color: page === i + 1 ? '#fff' : 'rgba(255,255,255,0.6)',
              fontWeight: page === i + 1 ? 700 : 400,
            }}>
              {i + 1}
            </button>
          ))}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* REVIEW MODAL                                                          */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {selectedId && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setSelectedId(null); }}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
          }}
        >
          <div style={{
            background: '#1E1B2E', borderRadius: 16, width: '100%', maxWidth: 680,
            maxHeight: '90vh', overflowY: 'auto',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
          }}>
            {detailLoading || !detail ? (
              <div style={{ padding: 60, textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
                ⏳ Đang tải chi tiết...
              </div>
            ) : (
              <>
                {/* Modal header */}
                <div style={{
                  padding: '20px 24px 16px',
                  borderBottom: '1px solid rgba(255,255,255,0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{
                        padding: '3px 12px', borderRadius: 12, fontSize: 12, fontWeight: 700,
                        background: STATUS_STYLES[detail.status]?.bg,
                        color: STATUS_STYLES[detail.status]?.color,
                        border: `1px solid ${STATUS_STYLES[detail.status]?.border}`,
                      }}>
                        {STATUS_LABELS[detail.status]}
                      </span>
                      <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
                        Khiếu nại #{detail.id} — {detail.employeeName}
                      </h2>
                    </div>
                    <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
                      Phiếu lương tháng {detail.month}/{detail.year}
                      {detail.employeeDept && ` · ${detail.employeeDept}`}
                      {detail.employeeCode && ` · #${detail.employeeCode}`}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedId(null)}
                    style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 22 }}
                  >
                    ×
                  </button>
                </div>

                <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

                  {/* Nội dung khiếu nại */}
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      📝 Nội dung khiếu nại
                    </div>
                    <div style={{
                      background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)',
                      borderRadius: 10, padding: '14px 16px',
                      color: 'rgba(255,255,255,0.85)', fontSize: 14, lineHeight: 1.7,
                      whiteSpace: 'pre-wrap',
                    }}>
                      {detail.reason}
                    </div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 6 }}>
                      Gửi lúc: {new Date(detail.createdAt).toLocaleString('vi-VN')}
                    </div>
                  </div>

                  {/* Tóm tắt phiếu lương để HR đối chiếu */}
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      💰 Phiếu lương tháng {detail.month}/{detail.year} — Đối chiếu
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 12 }}>
                      {[
                        { label: 'Ngày công TT',  value: `${detail.regularWorkedDays} ngày` },
                        { label: 'OT chiều (h)',   value: `${detail.eveningOtHours}h` },
                        { label: 'OT đêm (h)',     value: `${detail.nightOtHours}h` },
                        { label: 'Phút muộn/sớm', value: `${detail.totalLateEarlyMins} phút` },
                        { label: 'Phụ cấp CC',    value: vnd(detail.attendanceAllowance) },
                        { label: 'Lương gộp',     value: vnd(detail.grossEarnings) },
                        { label: 'Khấu trừ',      value: vnd(detail.totalDeductions) },
                        { label: 'Thực nhận',     value: vnd(detail.netSalary), highlight: true },
                      ].map(item => (
                        <div key={item.label} style={{
                          background: item.highlight ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${item.highlight ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.07)'}`,
                          borderRadius: 8, padding: '10px 14px',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        }}>
                          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{item.label}</span>
                          <span style={{
                            fontSize: 13, fontWeight: item.highlight ? 700 : 600,
                            color: item.highlight ? '#10B981' : 'rgba(255,255,255,0.85)',
                          }}>
                            {item.value}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Line items accordion */}
                    {detail.lineItemsJson && detail.lineItemsJson.length > 0 && (
                      <details style={{ cursor: 'pointer' }}>
                        <summary style={{
                          fontSize: 12, color: 'rgba(255,255,255,0.4)', padding: '8px 0',
                          userSelect: 'none', listStyle: 'none', display: 'flex', alignItems: 'center', gap: 6,
                        }}>
                          <span>▶</span> Xem chi tiết {detail.lineItemsJson.length} dòng lương
                        </summary>
                        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {detail.lineItemsJson.map((li, i) => (
                            <div key={i} style={{
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                              padding: '8px 12px', borderRadius: 8,
                              background: li.isDeduction ? 'rgba(239,68,68,0.06)' : 'rgba(255,255,255,0.03)',
                              border: `1px solid ${li.isDeduction ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.05)'}`,
                            }}>
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 500 }}>{li.label}</div>
                                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>
                                  {li.formula}
                                </div>
                              </div>
                              <div style={{
                                fontWeight: 700, fontSize: 14,
                                color: li.isDeduction ? '#EF4444' : '#10B981',
                              }}>
                                {li.isDeduction ? '−' : '+'}{vnd(Math.abs(li.amount))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>

                  {/* Phản hồi HR cũ (nếu có) */}
                  {detail.hrResponse && (
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        💬 Phản hồi HR trước đó
                      </div>
                      <div style={{
                        background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
                        borderRadius: 10, padding: '14px 16px',
                        color: '#6EE7B7', fontSize: 14, lineHeight: 1.7,
                        whiteSpace: 'pre-wrap',
                      }}>
                        {detail.hrResponse}
                      </div>
                      {detail.reviewedAt && (
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 6 }}>
                          HR phản hồi lúc: {new Date(detail.reviewedAt).toLocaleString('vi-VN')}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Review section (chỉ hiện nếu còn action) ── */}
                  {(NEXT_ACTIONS[detail.status] ?? []).length > 0 && (
                    <div style={{
                      borderTop: '1px solid rgba(255,255,255,0.08)',
                      paddingTop: 20,
                    }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        ✍️ Xử lý khiếu nại
                      </div>

                      {/* HR Response textarea */}
                      <div style={{ marginBottom: 14 }}>
                        <label style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: 6 }}>
                          Phản hồi của HR{(reviewStatus === 'RESOLVED' || reviewStatus === 'CLOSED') && <span style={{ color: '#EF4444' }}> * (bắt buộc)</span>}
                        </label>
                        <textarea
                          value={hrResponse}
                          onChange={e => setHrResponse(e.target.value)}
                          placeholder={
                            reviewStatus === 'UNDER_REVIEW'
                              ? 'Ví dụ: HR đang rà soát log chấm công ngày 20/7, sẽ phản hồi trong 1-2 ngày làm việc...'
                              : reviewStatus === 'RESOLVED'
                              ? 'Ví dụ: HR đã xác nhận log GPS cho thấy bạn check-out lúc 20h28. Sẽ bổ sung 2h OT đêm vào tháng sau...'
                              : reviewStatus === 'CLOSED'
                              ? 'Ví dụ: HR đã kiểm tra và xác nhận dữ liệu chấm công là đúng. Khiếu nại không được chấp thuận vì...'
                              : 'Chọn hành động bên dưới trước...'
                          }
                          rows={4}
                          maxLength={2000}
                          style={{
                            width: '100%', padding: '12px 14px', borderRadius: 10, resize: 'vertical',
                            background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(255,255,255,0.1)',
                            color: '#fff', fontSize: 14, lineHeight: 1.6, fontFamily: 'inherit',
                            boxSizing: 'border-box',
                            transition: 'border-color 0.15s',
                          }}
                          onFocus={e => (e.target.style.borderColor = '#6366F1')}
                          onBlur={e  => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                        />
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'right', marginTop: 4 }}>
                          {hrResponse.length}/2000
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        {(NEXT_ACTIONS[detail.status] ?? []).map(action => (
                          <button
                            key={action.status}
                            id={`btn-dispute-${action.status.toLowerCase()}`}
                            onClick={() => setReviewStatus(action.status)}
                            style={{
                              padding: '9px 18px', borderRadius: 10, cursor: 'pointer',
                              border: `1.5px solid ${reviewStatus === action.status ? action.color : 'rgba(255,255,255,0.1)'}`,
                              background: reviewStatus === action.status ? `${action.color}22` : 'rgba(255,255,255,0.04)',
                              color: reviewStatus === action.status ? action.color : 'rgba(255,255,255,0.5)',
                              fontWeight: reviewStatus === action.status ? 700 : 400,
                              fontSize: 13, transition: 'all 0.15s',
                            }}
                          >
                            {action.label}
                          </button>
                        ))}

                        <button
                          id="btn-dispute-submit"
                          onClick={handleSubmit}
                          disabled={!reviewStatus || submitting}
                          style={{
                            marginLeft: 'auto', padding: '9px 24px', borderRadius: 10,
                            border: 'none', cursor: reviewStatus ? 'pointer' : 'not-allowed',
                            background: reviewStatus ? 'linear-gradient(135deg,#6366F1,#8B5CF6)' : 'rgba(255,255,255,0.08)',
                            color: reviewStatus ? '#fff' : 'rgba(255,255,255,0.3)',
                            fontWeight: 700, fontSize: 14,
                            boxShadow: reviewStatus ? '0 4px 20px rgba(99,102,241,0.4)' : 'none',
                            transition: 'all 0.2s',
                          }}
                        >
                          {submitting ? '⏳ Đang gửi...' : '📨 Xác nhận xử lý'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Terminal state: chỉ show message */}
                  {(NEXT_ACTIONS[detail.status] ?? []).length === 0 && (
                    <div style={{
                      textAlign: 'center', padding: '16px',
                      background: 'rgba(100,116,139,0.08)', borderRadius: 10,
                      color: 'rgba(255,255,255,0.4)', fontSize: 14,
                    }}>
                      ⛔ Khiếu nại này đã được đóng, không thể thay đổi trạng thái.
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideIn { from { opacity:0; transform: translateX(20px); } to { opacity:1; transform: translateX(0); } }
      `}</style>
    </div>
  );
}
