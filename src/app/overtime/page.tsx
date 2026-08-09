'use client';

// Overtime page — minimal stable client component
// NOTE: Full overtime feature development is deferred to Phase 3.
// This component exists to prevent the React serialization crash
// caused by having onChange event handlers in a Server Component.

import { useState, useEffect, useCallback } from 'react';
import CreateOvertimeModal from '@/components/hr/CreateOvertimeModal';

interface OvertimeRecord {
  id: number;
  employeeId: number;
  workDate: string;
  startTime: string;
  endTime: string;
  totalHours: number;
  reason: string | null;
  projectId: number | null;
  status: string;
  createdAt: string | null;
  user: { id: number; name: string; department: string | null } | null;
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  PENDING:   { label: 'Chờ duyệt', bg: 'var(--color-warning-bg)', color: 'var(--color-warning)' },
  APPROVED:  { label: 'Đã duyệt',  bg: 'var(--color-success-bg)', color: 'var(--color-success)' },
  REJECTED:  { label: 'Từ chối',   bg: 'var(--color-danger-bg)',  color: 'var(--color-danger)' },
  CANCELLED: { label: 'Đã hủy',    bg: 'var(--color-surface-3)',  color: 'var(--color-text-muted)' },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING;
  return <span className="badge" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>;
}

export default function OvertimePage() {
  const [records,  setRecords]  = useState<OvertimeRecord[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [myRole,   setMyRole]   = useState('WORKER');
  const [filterStatus, setFilterStatus] = useState('');

  const isAdminOrManager = myRole === 'ADMIN' || myRole === 'MANAGER';

  const loadRecords = useCallback(async () => {
    setLoading(true);
    const q = new URLSearchParams();
    if (filterStatus) q.set('status', filterStatus);
    try {
      const res = await fetch(`/api/hr/overtime?${q.toString()}`);
      if (res.ok) {
        const data: OvertimeRecord[] = await res.json();
        setRecords(Array.isArray(data) ? data : []);
      }
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  // Load role from session
  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.user?.role) setMyRole(d.user.role); })
      .catch(() => {});
  }, []);

  useEffect(() => { loadRecords(); }, [loadRecords]);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Tăng ca</h1>
          <p className="page-subtitle">Quản lý đơn xin tăng ca (OT)</p>
        </div>
        <div>
          <CreateOvertimeModal />
        </div>
      </div>

      {/* Filter */}
      <div className="card mb-6" style={{ padding: '16px' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Trạng thái</label>
            <select
              className="form-select"
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
            >
              <option value="">Tất cả trạng thái</option>
              <option value="PENDING">Chờ duyệt</option>
              <option value="APPROVED">Đã duyệt</option>
              <option value="REJECTED">Từ chối</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        {loading ? (
          <div className="empty-state"><div className="empty-state-text">Đang tải dữ liệu...</div></div>
        ) : records.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">⏱️</div>
            <div className="empty-state-text">Không có đơn xin tăng ca nào</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nhân viên</th>
                  <th>Ngày</th>
                  <th>Giờ bắt đầu</th>
                  <th>Giờ kết thúc</th>
                  <th>Tổng giờ</th>
                  <th>Lý do</th>
                  <th>Trạng thái</th>
                  {isAdminOrManager && <th>Thao tác</th>}
                </tr>
              </thead>
              <tbody>
                {records.map(r => (
                  <tr key={r.id}>
                    <td>{r.user?.name ?? '—'}</td>
                    <td>{r.workDate}</td>
                    <td>{r.startTime}</td>
                    <td>{r.endTime}</td>
                    <td>{r.totalHours}h</td>
                    <td>{r.reason ?? '—'}</td>
                    <td><StatusBadge status={r.status} /></td>
                    {isAdminOrManager && (
                      <td>
                        {r.status === 'PENDING' && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                            (Sắp có)
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
