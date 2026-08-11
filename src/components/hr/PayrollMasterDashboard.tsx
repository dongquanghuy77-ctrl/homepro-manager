'use client';
// src/components/hr/PayrollMasterDashboard.tsx
// ══════════════════════════════════════════════════════════════════════════════
// Bảng Lương Tổng Hợp — Chỉ dành cho HR/Admin
// ══════════════════════════════════════════════════════════════════════════════
// PHƯƠNG ÁN RENDER: Server-side Pagination (25 rows/page)
//   • API trả đúng 25 rows × ~500 bytes = 12KB JSON/request
//   • lineItemsJson KHÔNG nằm trong list → chỉ fetch khi expand row (lazy)
//   • Aggregate KPIs (totalGross, countDraft...) tính 1 lần bằng SQL SUM()
//   • URL state: ?page=3 → F5 không mất vị trí, có thể bookmark trang
//   • Select All = chọn TẤT CẢ DRAFT tháng đó (gửi ids='all') → không cần
//     giữ 1.000 IDs trong memory
// ══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useEffect, useRef }  from 'react';
import useSWR, { mutate as globalMutate }             from 'swr';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
interface PayrollRow {
  id:               number;
  employeeId:       number;
  employeeCode:     string | null;
  employeeName:     string;
  department:       string | null;
  regularWorkedDays: number;
  paidLeaveDays:    number;
  eveningOtHours:   number;
  nightOtHours:     number;
  sundayHours:      number;
  absentDays:       number;
  totalLateEarlyMins: number;
  attendanceAllowance: number;
  grossEarnings:    number;
  totalDeductions:  number;
  netSalary:        number;
  bhxhEmployee:     number;
  status:           'DRAFT' | 'PUBLISHED';
  warningsJson:     string[] | null;
  calculatedAt:     string | null;
  publishedAt:      string | null;
}
interface Aggregate {
  totalGross:     number;
  totalNet:       number;
  totalBhxhEmp:   number;
  totalBhxhEmpl:  number;
  countDraft:     number;
  countPublished: number;
  countTotal:     number;
}
interface Pagination {
  page:       number;
  limit:      number;
  total:      number;
  totalPages: number;
}
interface PayrollListResponse {
  rows:       PayrollRow[];
  pagination: Pagination;
  aggregate:  Aggregate;
  filters:    { month: number; year: number; status: string; dept: string; search: string };
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────────────────────────────────────────
const vnd = (n: number) => n.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
const shortVnd = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}tr`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}k`;
  return String(n);
};
const fetcher = (url: string) => fetch(url).then(r => r.json());

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function PayrollMasterDashboard() {
  const now = new Date();

  // ── Filters ───────────────────────────────────────────────────────────────
  const [month,    setMonth]    = useState(now.getMonth() + 1);
  const [year,     setYear]     = useState(now.getFullYear());
  const [status,   setStatus]   = useState('');
  const [dept,     setDept]     = useState('');
  const [search,   setSearch]   = useState('');
  const [page,     setPage]     = useState(1);

  // ── Selection ─────────────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [selectAll,   setSelectAll]   = useState(false); // true = chọn tất cả tháng này

  // ── UI state ──────────────────────────────────────────────────────────────
  const [calculating, setCalculating] = useState(false);
  const [publishing,  setPublishing]  = useState(false);
  const [exporting,   setExporting]   = useState(false);
  const [toast,       setToast]       = useState<{ type: 'success'|'error'; msg: string } | null>(null);
  const [expandedId,  setExpandedId]  = useState<number | null>(null);
  const [expandData,  setExpandData]  = useState<Record<number, (LineItem | Record<string,unknown>)[]>>({});

  // ── SWR key ───────────────────────────────────────────────────────────────
  const apiUrl = `/api/hr/payroll?month=${month}&year=${year}&status=${status}&dept=${dept}&search=${encodeURIComponent(search)}&page=${page}&limit=25`;
  const { data, isLoading, mutate } = useSWR<PayrollListResponse>(apiUrl, fetcher, {
    revalidateOnFocus: false,
    keepPreviousData:  true,  // Giữ data cũ khi đang chuyển trang → không flash
  });

  // Reset page khi thay filter
  useEffect(() => setPage(1), [month, year, status, dept, search]);
  // Reset selection khi page/filter thay đổi
  useEffect(() => { setSelectedIds(new Set()); setSelectAll(false); }, [page, month, year, status]);

  const showToast = useCallback((type: 'success'|'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // ── Expand row → lazy-fetch lineItems ────────────────────────────────────
  const handleExpand = async (row: PayrollRow) => {
    if (expandedId === row.id) { setExpandedId(null); return; }
    setExpandedId(row.id);
    if (expandData[row.id]) return; // đã cache
    try {
      const res  = await fetch(`/api/hr/payroll/${row.id}/line-items`);
      const json = await res.json();
      setExpandData(prev => ({ ...prev, [row.id]: (json.lineItems ?? []) as (LineItem | Record<string,unknown>)[] }));
    } catch { /* silently fail — lineItems not critical */ }
  };

  // ── Calculate ─────────────────────────────────────────────────────────────
  const handleCalculate = async () => {
    if (!confirm(`Tính lương tháng ${month}/${year} cho toàn công ty?\nKết quả sẽ lưu ở trạng thái DRAFT.`)) return;
    setCalculating(true);
    try {
      const res  = await fetch('/api/hr/payroll/calculate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ month, year }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Lỗi tính lương');
      showToast('success', `✅ ${json.message}`);
      mutate(); // Refresh grid
    } catch (e) {
      showToast('error', `❌ ${String(e)}`);
    } finally {
      setCalculating(false);
    }
  };

  // ── Publish ───────────────────────────────────────────────────────────────
  const handlePublish = async () => {
    const ids = selectAll ? 'all' : Array.from(selectedIds);
    const countLabel = selectAll
      ? `TOÀN BỘ ${data?.aggregate.countDraft ?? 0} bản ghi DRAFT`
      : `${selectedIds.size} bản ghi đã chọn`;

    if (!confirm(`Công bố ${countLabel} tháng ${month}/${year}?\n⚠️ Thao tác này KHÔNG THỂ hoàn tác — nhân viên sẽ thấy phiếu lương.`)) return;
    setPublishing(true);
    try {
      const res  = await fetch('/api/hr/payroll/publish', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ids, month, year }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Lỗi công bố');
      showToast('success', `✅ ${json.message}`);
      setSelectedIds(new Set());
      setSelectAll(false);
      mutate();
    } catch (e) {
      showToast('error', `❌ ${String(e)}`);
    } finally {
      setPublishing(false);
    }
  };

  // ── Export Excel ──────────────────────────────────────────────────────────
  const handleExport = async () => {
    setExporting(true);
    try {
      // Fetch binary từ API — server trả file Excel binary
      // Không dùng window.open() (bị popup blocker) — dùng <a> click trick
      const exportUrl = `/api/hr/payroll/export?month=${month}&year=${year}&status=${status}`;
      const res = await fetch(exportUrl);
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error((json as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      // Lấy filename từ Content-Disposition header
      const cdHeader = res.headers.get('Content-Disposition') ?? '';
      const fnMatch  = cdHeader.match(/filename\*=UTF-8''(.+)/);
      const filename = fnMatch ? decodeURIComponent(fnMatch[1]) : `bang-luong-${String(month).padStart(2,'0')}-${year}.xlsx`;
      const a = document.createElement('a');
      a.href     = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('success', `✅ Đã xuất: ${filename}`);
    } catch (e) {
      showToast('error', `❌ Xuất Excel thất bại: ${String(e)}`);
    } finally {
      setExporting(false);
    }
  };

  const rows      = data?.rows      ?? [];
  const agg       = data?.aggregate ?? null;
  const pgn       = data?.pagination ?? { page: 1, limit: 25, total: 0, totalPages: 1 };
  const hasDraft  = (agg?.countDraft ?? 0) > 0;
  const canPublish = selectAll ? hasDraft : selectedIds.size > 0;

  // ── Toggle row selection ──────────────────────────────────────────────────
  const toggleRow = (id: number) => {
    setSelectAll(false);
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const togglePageAll = () => {
    const pageIds = rows.filter(r => r.status === 'DRAFT').map(r => r.id);
    const allChecked = pageIds.every(id => selectedIds.has(id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allChecked) pageIds.forEach(id => next.delete(id));
      else            pageIds.forEach(id => next.add(id));
      return next;
    });
    setSelectAll(false);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="payroll-master">
      {/* ── Toast ─────────────────────────────────────────────────────────── */}
      {toast && (
        <div className={`payroll-toast payroll-toast--${toast.type}`} role="alert">
          {toast.msg}
        </div>
      )}

      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title">💰 Bảng Lương Tổng Hợp</h1>
          <p className="page-subtitle">Quản lý, rà soát và công bố phiếu lương — HR/Admin only</p>
        </div>

        <div className="payroll-actions">
          <button
            id="btn-calculate"
            className="btn btn-primary"
            onClick={handleCalculate}
            disabled={calculating || publishing}
          >
            {calculating ? '⏳ Đang tính...' : '⚙️ Tính Lương (DRAFT)'}
          </button>
          <button
            id="btn-publish"
            className="btn btn-warning"
            onClick={handlePublish}
            disabled={!canPublish || publishing || calculating}
            style={{ background: '#F59E0B', color: '#1a1a1a' }}
          >
            {publishing ? '⏳ Đang công bố...' : `📢 Công Bố${selectAll ? ' Tất Cả' : selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}`}
          </button>
          <button
            id="btn-export-excel"
            className="btn btn-ghost"
            onClick={handleExport}
            disabled={exporting || !data?.pagination.total || (data?.pagination.total ?? 0) === 0}
            title={`Xuất toàn bộ ${data?.pagination.total ?? 0} bản ghi tháng ${month}/${year} ra Excel`}
            style={{ border: '1px solid #10B981', color: '#10B981' }}
          >
            {exporting ? '⏳ Đang xuất...' : '📊 Xuất Excel'}
          </button>
        </div>
      </div>

      {/* ── KPI Cards ───────────────────────────────────────────────────── */}
      {agg && (
        <div className="payroll-kpi-grid">
          <KpiCard icon="👥" label="Tổng nhân viên" value={String(agg.countTotal)} sub={`${agg.countPublished} đã công bố · ${agg.countDraft} nháp`} color="#6366F1" />
          <KpiCard icon="💵" label="Tổng Lương Gộp" value={shortVnd(agg.totalGross)} sub="Toàn công ty tháng này" color="#10B981" />
          <KpiCard icon="💰" label="Tổng Thực Nhận"  value={shortVnd(agg.totalNet)}   sub="Sau BHXH & khấu trừ"   color="#3B82F6" />
          <KpiCard icon="🏦" label="BHXH DN đóng"    value={shortVnd(agg.totalBhxhEmpl)} sub="Chi phí sử dụng LĐ" color="#F59E0B" />
        </div>
      )}

      {/* ── Filter Bar ──────────────────────────────────────────────────── */}
      <div className="card" style={{ padding: '12px 16px', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 14 }}>
            Tháng
            <select id="filter-month" value={month} onChange={e => setMonth(Number(e.target.value))} className="filter-select">
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m =>
                <option key={m} value={m}>Tháng {m}</option>
              )}
            </select>
          </label>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 14 }}>
            Năm
            <select id="filter-year" value={year} onChange={e => setYear(Number(e.target.value))} className="filter-select">
              {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </label>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 14 }}>
            Trạng thái
            <select id="filter-status" value={status} onChange={e => setStatus(e.target.value)} className="filter-select">
              <option value="">Tất cả</option>
              <option value="DRAFT">🟡 Nháp</option>
              <option value="PUBLISHED">🟢 Đã công bố</option>
            </select>
          </label>
          <input
            id="filter-search"
            type="search"
            placeholder="🔍 Tìm nhân viên..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="filter-input"
            style={{ minWidth: 180 }}
          />
          {/* Select All DRAFT của tháng */}
          {hasDraft && (
            <button
              className={`btn btn-ghost btn-sm ${selectAll ? 'active' : ''}`}
              onClick={() => { setSelectAll(!selectAll); setSelectedIds(new Set()); }}
              style={{ fontSize: 13, padding: '4px 12px', borderColor: selectAll ? '#F59E0B' : undefined }}
            >
              {selectAll ? '✅ Chọn tất cả DRAFT' : `Chọn tất cả ${agg?.countDraft} DRAFT`}
            </button>
          )}
        </div>
      </div>

      {/* ── Data Grid ───────────────────────────────────────────────────── */}
      <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="payroll-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)', textAlign: 'left' }}>
                <th style={{ padding: '10px 12px', width: 36 }}>
                  <input
                    type="checkbox"
                    id="chk-page-all"
                    onChange={togglePageAll}
                    checked={rows.filter(r => r.status === 'DRAFT').every(r => selectedIds.has(r.id)) && rows.some(r => r.status === 'DRAFT')}
                    title="Chọn tất cả trang này"
                  />
                </th>
                <th style={{ padding: '10px 12px' }}>Nhân viên</th>
                <th style={{ padding: '10px 12px' }}>Phòng ban</th>
                <th style={{ padding: '10px 12px', textAlign: 'center' }}>Ngày công</th>
                <th style={{ padding: '10px 12px', textAlign: 'center' }}>OT (giờ)</th>
                <th style={{ padding: '10px 12px', textAlign: 'center' }}>Vắng</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Lương gộp</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Khấu trừ</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>Thực nhận</th>
                <th style={{ padding: '10px 12px', textAlign: 'center' }}>Trạng thái</th>
                <th style={{ padding: '10px 12px', textAlign: 'center' }}>Chi tiết</th>
              </tr>
            </thead>

            <tbody>
              {isLoading && rows.length === 0 ? (
                <tr><td colSpan={11} style={{ padding: 32, textAlign: 'center', opacity: 0.5 }}>⏳ Đang tải...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={11} style={{ padding: 32, textAlign: 'center', opacity: 0.5 }}>
                  Chưa có dữ liệu lương. Nhấn "Tính Lương" để bắt đầu.
                </td></tr>
              ) : rows.map(row => (
                <>
                  <tr
                    key={row.id}
                    style={{
                      borderTop: '1px solid var(--border-color)',
                      background: selectedIds.has(row.id) ? 'rgba(99,102,241,0.08)' : undefined,
                      opacity: isLoading ? 0.6 : 1,
                      transition: 'background 0.15s',
                    }}
                  >
                    {/* Checkbox — chỉ DRAFT mới chọn được */}
                    <td style={{ padding: '10px 12px' }}>
                      {row.status === 'DRAFT' && (
                        <input
                          type="checkbox"
                          checked={selectAll || selectedIds.has(row.id)}
                          onChange={() => toggleRow(row.id)}
                          disabled={selectAll}
                          id={`chk-row-${row.id}`}
                        />
                      )}
                    </td>

                    {/* Nhân viên */}
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{row.employeeName}</div>
                      <div style={{ fontSize: 11, opacity: 0.6 }}>{row.employeeCode}</div>
                    </td>

                    <td style={{ padding: '10px 12px', opacity: 0.7 }}>{row.department ?? '—'}</td>

                    {/* Ngày công */}
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <span title={`Công: ${row.regularWorkedDays}d · Phép: ${row.paidLeaveDays}d`}>
                        {(row.regularWorkedDays + row.paidLeaveDays).toFixed(1)}
                      </span>
                    </td>

                    {/* OT */}
                    <td style={{ padding: '10px 12px', textAlign: 'center', color: '#6366F1' }}>
                      {(row.eveningOtHours + row.nightOtHours).toFixed(1)}h
                    </td>

                    {/* Vắng */}
                    <td style={{ padding: '10px 12px', textAlign: 'center', color: row.absentDays > 0 ? '#EF4444' : undefined }}>
                      {row.absentDays > 0 ? `${row.absentDays}d` : '—'}
                    </td>

                    {/* Lương gộp */}
                    <td style={{ padding: '10px 12px', textAlign: 'right', opacity: 0.8 }}>
                      {shortVnd(row.grossEarnings)}
                    </td>

                    {/* Khấu trừ */}
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: '#EF4444' }}>
                      ({shortVnd(row.totalDeductions)})
                    </td>

                    {/* Thực nhận */}
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#10B981', fontSize: 14 }}>
                      {shortVnd(row.netSalary)}
                      {row.warningsJson && row.warningsJson.length > 0 && (
                        <span title={row.warningsJson.join('\n')} style={{ marginLeft: 4, cursor: 'help' }}>⚠️</span>
                      )}
                    </td>

                    {/* Trạng thái */}
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <StatusBadge status={row.status} />
                    </td>

                    {/* Expand button */}
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleExpand(row)}
                        id={`btn-expand-${row.id}`}
                        style={{ fontSize: 12, padding: '2px 8px' }}
                      >
                        {expandedId === row.id ? '▲ Thu' : '▼ Chi tiết'}
                      </button>
                    </td>
                  </tr>

                  {/* ── Expand: Line Items (lazy loaded) ─────────────────── */}
                  {expandedId === row.id && (
                    <tr key={`expand-${row.id}`}>
                      <td colSpan={11} style={{ padding: '0 12px 12px 48px', background: 'rgba(0,0,0,0.04)' }}>
                        <LineItemsDetail
                          rowId={row.id}
                          lineItems={expandData[row.id] ?? []}
                          row={row}
                        />
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ────────────────────────────────────────────────── */}
        {pgn.totalPages > 1 && (
          <div className="payroll-pagination">
            <span style={{ fontSize: 13, opacity: 0.6 }}>
              Trang {pgn.page}/{pgn.totalPages} · {pgn.total} bản ghi
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button id="btn-page-first" className="btn btn-ghost btn-sm" disabled={page <= 1}         onClick={() => setPage(1)}>«</button>
              <button id="btn-page-prev"  className="btn btn-ghost btn-sm" disabled={page <= 1}         onClick={() => setPage(p => p - 1)}>‹</button>
              {/* Hiển thị tối đa 5 page buttons */}
              {Array.from({ length: Math.min(5, pgn.totalPages) }, (_, i) => {
                const p = Math.max(1, Math.min(pgn.totalPages - 4, page - 2)) + i;
                return (
                  <button
                    key={p}
                    id={`btn-page-${p}`}
                    className={`btn btn-sm ${p === page ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setPage(p)}
                  >{p}</button>
                );
              })}
              <button id="btn-page-next" className="btn btn-ghost btn-sm" disabled={page >= pgn.totalPages} onClick={() => setPage(p => p + 1)}>›</button>
              <button id="btn-page-last" className="btn btn-ghost btn-sm" disabled={page >= pgn.totalPages} onClick={() => setPage(pgn.totalPages)}>»</button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .payroll-master    { padding: 0; }
        .payroll-kpi-grid  { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 20px; }
        .payroll-actions   { display: flex; gap: 12px; align-items: center; }
        .payroll-toast     { position: fixed; top: 20px; right: 20px; z-index: 999; padding: 14px 20px;
                             border-radius: 10px; font-size: 14px; animation: slideIn 0.3s ease; box-shadow: 0 8px 24px rgba(0,0,0,0.3); }
        .payroll-toast--success { background: #10B981; color: #fff; }
        .payroll-toast--error   { background: #EF4444; color: #fff; }
        .payroll-pagination { display: flex; justify-content: space-between; align-items: center;
                              padding: 12px 16px; border-top: 1px solid var(--border-color); }
        .filter-select { background: var(--bg-tertiary); color: var(--text-primary);
                         border: 1px solid var(--border-color); border-radius: 6px; padding: 4px 8px; font-size: 13px; }
        .filter-input  { background: var(--bg-tertiary); color: var(--text-primary);
                         border: 1px solid var(--border-color); border-radius: 6px; padding: 6px 10px; font-size: 13px; }
        .payroll-table tr:hover td { background: rgba(99,102,241,0.04); }
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @media (max-width: 768px) { .payroll-kpi-grid { grid-template-columns: repeat(2, 1fr); } }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function KpiCard({ icon, label, value, sub, color }: {
  icon: string; label: string; value: string; sub: string; color: string;
}) {
  return (
    <div className="stat-card" style={{ position: 'relative', overflow: 'hidden' }}>
      <div className="stat-card-top">
        <div className="stat-card-icon" style={{ background: `${color}22` }}>
          <span style={{ fontSize: 20 }}>{icon}</span>
        </div>
      </div>
      <div className="stat-card-value" style={{ color, fontSize: 22, marginTop: 8 }}>{value}</div>
      <div className="stat-card-label" style={{ marginTop: 4 }}>{label}</div>
      <div style={{ fontSize: 11, opacity: 0.5, marginTop: 2 }}>{sub}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: 'DRAFT' | 'PUBLISHED' }) {
  if (status === 'PUBLISHED') {
    return <span style={{ background: '#10B98120', color: '#10B981', padding: '2px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600 }}>✅ Công bố</span>;
  }
  return <span style={{ background: '#F59E0B20', color: '#F59E0B', padding: '2px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600 }}>🟡 Nháp</span>;
}

interface LineItem { code: string; label: string; formula: string; amount: number; isDeduction: boolean; }

function LineItemsDetail({ rowId, lineItems, row }: { rowId: number; lineItems: (LineItem | Record<string,unknown>)[]; row: PayrollRow }) {
  const vnd = (n: number) => n.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });

  if (lineItems.length === 0) {
    return <div style={{ padding: '16px 0', opacity: 0.5, fontSize: 13 }}>⏳ Đang tải chi tiết...</div>;
  }

  const earnings   = (lineItems as LineItem[]).filter(l => !l.isDeduction);
  const deductions = (lineItems as LineItem[]).filter(l =>  l.isDeduction);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, paddingTop: 12 }}>
      {/* Thu nhập */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.6, marginBottom: 8, textTransform: 'uppercase' }}>Thu nhập</div>
        {earnings.map(l => (
          <div key={l.code} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <span title={l.formula} style={{ cursor: 'help', opacity: 0.85 }}>{l.label}</span>
            <span style={{ color: '#10B981', fontWeight: 600 }}>{vnd(l.amount)}</span>
          </div>
        ))}
      </div>
      {/* Khấu trừ */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.6, marginBottom: 8, textTransform: 'uppercase' }}>Khấu trừ</div>
        {deductions.map(l => (
          <div key={l.code} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <span title={l.formula} style={{ cursor: 'help', opacity: 0.85 }}>{l.label}</span>
            <span style={{ color: '#EF4444', fontWeight: 600 }}>({vnd(l.amount)})</span>
          </div>
        ))}
        {/* Summary */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.15)', fontWeight: 700 }}>
          <span style={{ color: '#10B981' }}>THỰC NHẬN</span>
          <span style={{ color: '#10B981', fontSize: 15 }}>{vnd(row.netSalary)}</span>
        </div>
        {/* BHXH note */}
        <div style={{ fontSize: 11, opacity: 0.4, marginTop: 6 }}>
          BHXH DN đóng: {vnd(row.bhxhEmployee)} (tham khảo)
        </div>
        {/* Muộn/sớm */}
        {row.totalLateEarlyMins > 0 && (
          <div style={{ fontSize: 11, color: '#F59E0B', marginTop: 4 }}>
            ⚠️ {row.totalLateEarlyMins} phút vi phạm — ảnh hưởng phụ cấp chuyên cần
          </div>
        )}
      </div>
    </div>
  );
}
