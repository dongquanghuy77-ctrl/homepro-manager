'use client';

// HR Dashboard — client component
import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import PendingLeaveAlert from '@/components/hr/PendingLeaveAlert';

interface DashboardData {
  totalEmployees: number;
  presentToday: number;
  lateToday: number;
  absentToday: number;
  notCheckedIn: number;
  onLeave: number;
  pendingLeave: number;
  pendingOvertime: number;
}

const DEFAULT_DATA: DashboardData = {
  totalEmployees: 0,
  presentToday: 0,
  lateToday: 0,
  absentToday: 0,
  notCheckedIn: 0,
  onLeave: 0,
  pendingLeave: 0,
  pendingOvertime: 0,
};

const DEPARTMENTS = [
  'Quản lý', 'Xưởng gỗ', 'Lắp đặt', 'Sơn', 'Kho',
  'Thi công', 'Thiết kế', 'Kế toán',
];

export default function HRDashboardPage() {
  const [data,       setData]       = useState<DashboardData>(DEFAULT_DATA);
  const [loading,    setLoading]    = useState(true);
  const [dateFilter, setDateFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [printing,   setPrinting]   = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Default to today's date in Vietnam
  const todayVN = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });

  const loadDashboard = useCallback(async (date: string, dept: string) => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      q.set('date', date || todayVN);
      if (dept) q.set('department', dept);
      const res = await fetch(`/api/hr/dashboard?${q.toString()}`);
      if (res.ok) {
        const json: DashboardData = await res.json();
        setData(json);
      } else {
        setData(DEFAULT_DATA);
      }
    } catch {
      setData(DEFAULT_DATA);
    } finally {
      setLoading(false);
    }
  }, [todayVN]);

  useEffect(() => {
    setDateFilter(todayVN);
    loadDashboard(todayVN, '');
  }, [todayVN, loadDashboard]);

  const handleFilter = () => loadDashboard(dateFilter || todayVN, deptFilter);

  // ── PDF Print ─────────────────────────────────────────────────────────────
  const handlePrintPDF = () => {
    setPrinting(true);
    // Brief delay cho state update + CSS apply trước khi print dialog mở
    setTimeout(() => {
      window.print();
      // Reset printing state sau khi dialog đóng (print / cancel)
      setTimeout(() => setPrinting(false), 500);
    }, 120);
  };

  // ── Stat cards ──────────────────────────────────────────────────────────
  const statCards = [
    { id: 'stat-total',    label: 'Tổng nhân viên',  value: data.totalEmployees, icon: '👥', color: '#3B82F6', bg: 'rgba(59,130,246,0.12)'  },
    { id: 'stat-present',  label: 'Có mặt',          value: data.presentToday,   icon: '✅', color: '#10B981', bg: 'rgba(16,185,129,0.12)'  },
    { id: 'stat-late',     label: 'Đi trễ',          value: data.lateToday,      icon: '⚡', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)'  },
    { id: 'stat-absent',   label: 'Vắng',            value: data.absentToday,    icon: '🚨', color: '#EF4444', bg: 'rgba(239,68,68,0.12)'   },
    { id: 'stat-norecord', label: 'Chưa chấm công',  value: data.notCheckedIn,   icon: '⏳', color: '#94A3B8', bg: 'rgba(148,163,184,0.12)' },
    { id: 'stat-onleave',  label: 'Đang nghỉ phép',  value: data.onLeave,        icon: '🌴', color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)'  },
  ];

  const printDate = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
  const filterLabel = `${dateFilter || todayVN}${deptFilter ? ` · Bộ phận: ${deptFilter}` : ''}`;

  return (
    <>
      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* CSS @media print — nhúng thẳng vào component, không cần file riêng */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <style>{`
        @media print {
          /* ── Ẩn sidebar, topbar, action buttons ── */
          .sidebar,
          .topbar,
          .nav-sidebar,
          nav,
          aside,
          [class*="sidebar"],
          [class*="Sidebar"],
          [class*="nav-"],
          .no-print {
            display: none !important;
          }

          /* ── Xóa margin trái do sidebar chiếm ── */
          .main-content,
          .page-container,
          body > div,
          #__next > div {
            margin-left: 0 !important;
            padding-left: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
          }

          body {
            background: #fff !important;
            color: #111 !important;
            font-size: 12pt;
          }

          /* ── Stat cards: in màu nền nhạt, hiển thị 3 cột ── */
          .stat-card {
            break-inside: avoid;
            border: 1px solid #e5e7eb !important;
            background: #f9fafb !important;
          }

          /* ── Cards: viền nhẹ ── */
          .card {
            border: 1px solid #e5e7eb !important;
            box-shadow: none !important;
            background: #fff !important;
          }

          /* ── Ẩn card filter, alert PendingLeave, quick-link buttons ── */
          #hr-filter-card,
          #hr-pending-alert,
          #hr-quick-links {
            display: none !important;
          }

          /* ── Print header hiển thị chỉ khi in ── */
          #hr-print-header {
            display: block !important;
          }

          /* ── Không vỡ trang ở stat grid ── */
          .grid-3, .grid-2 {
            grid-template-columns: repeat(3, 1fr) !important;
          }

          a { text-decoration: none !important; color: inherit !important; }
          @page { margin: 1.5cm; }
        }

        /* Print header: ẩn trên screen, hiển thị khi in */
        #hr-print-header { display: none; }
      `}</style>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* PRINT HEADER — chỉ hiển thị khi print (display:none on screen)    */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <div id="hr-print-header" style={{ marginBottom: 24, borderBottom: '2px solid #3B82F6', paddingBottom: 12 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>
          BÁO CÁO TỔNG QUAN NHÂN SỰ
        </h1>
        <p style={{ margin: '4px 0 0', color: '#6B7280', fontSize: 12 }}>
          Ngày lọc: {filterLabel} &nbsp;|&nbsp; Xuất lúc: {printDate}
        </p>
      </div>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* NỘI DUNG CHÍNH                                                     */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <div className="page-container" ref={printRef}>
        <div className="page-header">
          <div>
            <h1 className="page-title">Nhân sự</h1>
            <p className="page-subtitle">Dashboard tổng quan nhân sự</p>
          </div>
        </div>

        {/* ══ Cảnh báo đơn chờ duyệt ══ */}
        <div id="hr-pending-alert" style={{ marginBottom: 20 }}>
          <PendingLeaveAlert approvalUrl="/leave" />
        </div>

        {/* ══ Filter ══ */}
        <div id="hr-filter-card" className="card mb-6" style={{ padding: '16px' }}>
          <div className="grid-3">
            <div className="form-group">
              <label className="form-label">Ngày</label>
              <input
                type="date"
                className="form-input"
                value={dateFilter}
                onChange={e => setDateFilter(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Bộ phận</label>
              <select
                className="form-select"
                value={deptFilter}
                onChange={e => setDeptFilter(e.target.value)}
              >
                <option value="">Tất cả</option>
                {DEPARTMENTS.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* ── Nút Lọc + Nút Xuất PDF ── */}
            <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
              <button
                id="btn-filter"
                className="btn btn-primary"
                onClick={handleFilter}
                disabled={loading}
              >
                {loading ? 'Đang tải...' : '🔍 Lọc'}
              </button>

              <button
                id="btn-export-pdf"
                onClick={handlePrintPDF}
                disabled={printing || loading}
                title="Xuất Dashboard này ra file PDF (Ctrl+P)"
                style={{
                  display:        'inline-flex',
                  alignItems:     'center',
                  gap:            6,
                  padding:        '8px 16px',
                  borderRadius:   8,
                  border:         '1.5px solid #6366F1',
                  background:     printing ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.10)',
                  color:          '#6366F1',
                  fontWeight:     600,
                  fontSize:       14,
                  cursor:         printing ? 'wait' : 'pointer',
                  whiteSpace:     'nowrap',
                  transition:     'all 0.18s',
                  backdropFilter: 'blur(4px)',
                }}
                onMouseEnter={e => {
                  if (!printing) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(99,102,241,0.2)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = printing
                    ? 'rgba(99,102,241,0.08)'
                    : 'rgba(99,102,241,0.10)';
                }}
              >
                {printing ? (
                  <>
                    <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid #6366F1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                    Đang in...
                  </>
                ) : (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 6 2 18 2 18 9" />
                      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                      <rect x="6" y="14" width="12" height="8" />
                    </svg>
                    Xuất Báo Cáo (PDF)
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ══ Stat Cards ══ */}
        <div className="grid-3 mb-8">
          {statCards.map(s => (
            <div
              key={s.id}
              id={s.id}
              className="stat-card"
              style={{ opacity: loading ? 0.5 : 1, transition: 'opacity 0.2s' }}
            >
              <div className="stat-card-top">
                <div className="stat-card-icon" style={{ background: s.bg }}>
                  <span style={{ fontSize: 20 }}>{s.icon}</span>
                </div>
              </div>
              <div>
                <div className="stat-card-value" style={{ color: s.color }}>
                  {loading ? '—' : s.value}
                </div>
                <div className="stat-card-label">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ══ Quick links (ẩn khi print) ══ */}
        <div id="hr-quick-links" className="grid-2">
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Chờ duyệt nghỉ phép</h2>
            </div>
            <div className="stat-card-value" style={{ color: '#F59E0B', marginBottom: '16px' }}>
              {loading ? '—' : data.pendingLeave}
            </div>
            <Link href="/leave" className="btn btn-secondary">⏱ Duyệt ngay</Link>
          </div>
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Chờ duyệt tăng ca</h2>
            </div>
            <div className="stat-card-value" style={{ color: '#F59E0B', marginBottom: '16px' }}>
              {loading ? '—' : data.pendingOvertime}
            </div>
            <Link href="/overtime" className="btn btn-secondary">Xem chi tiết</Link>
          </div>
        </div>
      </div>

      {/* Spinner keyframe */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
