'use client';

// HR Dashboard — client component
// Fixed: was Server Component fetching internal API via localhost (fails on Vercel)
// Fixed: field name mismatch (data.stats?.total vs data.totalEmployees)
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

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

  const statCards = [
    { id: 'stat-total',     label: 'Tổng nhân viên',    value: data.totalEmployees, icon: '👥', color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
    { id: 'stat-present',   label: 'Có mặt',            value: data.presentToday,   icon: '✅', color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
    { id: 'stat-late',      label: 'Đi trễ',            value: data.lateToday,      icon: '⚡', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
    { id: 'stat-absent',    label: 'Vắng',              value: data.absentToday,    icon: '🚨', color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
    { id: 'stat-norecord',  label: 'Chưa chấm công',   value: data.notCheckedIn,   icon: '⏳', color: '#94A3B8', bg: 'rgba(148,163,184,0.12)' },
    { id: 'stat-onleave',   label: 'Đang nghỉ phép',   value: data.onLeave,        icon: '🌴', color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)' },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Nhân sự</h1>
          <p className="page-subtitle">Dashboard tổng quan nhân sự</p>
        </div>
      </div>

      {/* Filter */}
      <div className="card mb-6" style={{ padding: '16px' }}>
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
          <div className="form-group" style={{ justifyContent: 'flex-end' }}>
            <button
              className="btn btn-primary"
              onClick={handleFilter}
              disabled={loading}
            >
              {loading ? 'Đang tải...' : 'Lọc'}
            </button>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid-3 mb-8">
        {statCards.map(s => (
          <div key={s.id} className="stat-card" style={{ opacity: loading ? 0.5 : 1, transition: 'opacity 0.2s' }}>
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

      {/* Quick links */}
      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Chờ duyệt nghỉ phép</h2>
          </div>
          <div className="stat-card-value" style={{ color: '#F59E0B', marginBottom: '16px' }}>
            {loading ? '—' : data.pendingLeave}
          </div>
          <Link href="/leave" className="btn btn-secondary">Xem chi tiết</Link>
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
  );
}
