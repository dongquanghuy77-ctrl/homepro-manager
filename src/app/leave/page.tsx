'use client';

import { useState, useEffect, useCallback } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────
interface LeaveRecord {
  id: number;
  employeeId: number;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string | null;
  status: string;
  reviewedBy: number | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  createdAt: string | null;
  employeeName: string | null;
  department: string | null;
  employeeCode: string | null;
}

interface LeaveResponse {
  records: LeaveRecord[];
  myRole: string;
  myId: number;
}

interface EmployeeOption {
  id: number;
  name: string;
  employeeCode: string | null;
  department: string | null;
}

const LEAVE_TYPE_LABELS: Record<string, string> = {
  ANNUAL:   'Phép năm',
  SICK:     'Nghỉ ốm',
  PERSONAL: 'Cá nhân',
  UNPAID:   'Không lương',
  OTHER:    'Khác',
};

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

// ── CreateLeaveModal ──────────────────────────────────────────────────────────
function CreateLeaveModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const today = new Date().toISOString().split('T')[0];
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate]     = useState(today);

  const calcDays = () => {
    if (!startDate || !endDate || endDate < startDate) return 0;
    const diff = new Date(endDate).getTime() - new Date(startDate).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const payload = {
      leaveType: fd.get('leaveType') as string,
      startDate: fd.get('startDate') as string,
      endDate:   fd.get('endDate')   as string,
      reason:    (fd.get('reason') as string)?.trim() || null,
    };

    if (!payload.leaveType) { setError('Vui lòng chọn loại nghỉ'); setLoading(false); return; }
    if (!payload.startDate || !payload.endDate) { setError('Vui lòng chọn ngày'); setLoading(false); return; }
    if (payload.endDate < payload.startDate) { setError('Ngày kết thúc phải sau ngày bắt đầu'); setLoading(false); return; }

    try {
      const res = await fetch('/api/hr/leave', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Lỗi khi tạo đơn'); return; }
      onSuccess();
      onClose();
    } catch {
      setError('Không thể kết nối đến server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">Tạo đơn xin nghỉ</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose} disabled={loading}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body grid-2">
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Loại nghỉ *</label>
              <select name="leaveType" className="form-select" required>
                <option value="">-- Chọn loại nghỉ --</option>
                {Object.entries(LEAVE_TYPE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Từ ngày *</label>
              <input type="date" name="startDate" className="form-input" required
                value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Đến ngày *</label>
              <input type="date" name="endDate" className="form-input" required
                value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)} />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Số ngày nghỉ</label>
              <div style={{ padding: '8px 12px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', fontWeight: 600, color: 'var(--color-primary)' }}>
                {calcDays()} ngày
              </div>
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Lý do</label>
              <textarea name="reason" className="form-textarea" rows={3} placeholder="Lý do xin nghỉ..." />
            </div>
          </div>
          {error && <div className="modal-body" style={{ paddingTop: 0 }}><div className="alert alert-danger">{error}</div></div>}
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={loading}>Hủy</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Đang gửi...' : '📤 Gửi đơn'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── RejectModal ───────────────────────────────────────────────────────────────
function RejectModal({
  recordId,
  onClose,
  onSuccess,
}: {
  recordId: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [note, setNote]       = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const handleReject = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`/api/hr/leave/${recordId}/reject`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ reviewNote: note }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Lỗi khi từ chối'); return; }
      onSuccess();
      onClose();
    } catch {
      setError('Không thể kết nối đến server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: '400px' }}>
        <div className="modal-header">
          <h2 className="modal-title">Từ chối đơn nghỉ</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Lý do từ chối</label>
            <textarea className="form-textarea" rows={3} value={note}
              onChange={e => setNote(e.target.value)} placeholder="Ghi chú lý do từ chối..." />
          </div>
          {error && <div className="alert alert-danger">{error}</div>}
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose} disabled={loading}>Hủy</button>
          <button className="btn btn-danger" onClick={handleReject} disabled={loading}>
            {loading ? 'Đang xử lý...' : '✕ Từ chối'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function LeavePage() {
  const [records,   setRecords]   = useState<LeaveRecord[]>([]);
  const [myRole,    setMyRole]    = useState('WORKER');
  const [myId,      setMyId]      = useState(0);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [showCreate,     setShowCreate]     = useState(false);
  const [rejectTargetId, setRejectTargetId] = useState<number | null>(null);

  // Filters
  const [filterStatus,   setFilterStatus]   = useState('');
  const [filterEmployee, setFilterEmployee] = useState('');
  const [filterStart,    setFilterStart]    = useState('');
  const [filterEnd,      setFilterEnd]      = useState('');

  const isAdminOrManager = myRole === 'ADMIN' || myRole === 'MANAGER';

  // Load employees for filter dropdown
  useEffect(() => {
    fetch('/api/hr/employees')
      .then(r => r.ok ? r.json() : [])
      .then((data: EmployeeOption[]) => setEmployees(data))
      .catch(() => setEmployees([]));
  }, []);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    const q = new URLSearchParams();
    if (filterStatus)   q.set('status',     filterStatus);
    if (filterEmployee) q.set('employeeId', filterEmployee);
    if (filterStart)    q.set('startDate',  filterStart);
    if (filterEnd)      q.set('endDate',    filterEnd);

    try {
      const res = await fetch(`/api/hr/leave?${q.toString()}`);
      if (res.ok) {
        const data: LeaveResponse = await res.json();
        setRecords(data.records ?? []);
        setMyRole(data.myRole   ?? 'WORKER');
        setMyId(data.myId       ?? 0);
      } else {
        setRecords([]);
      }
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterEmployee, filterStart, filterEnd]);

  useEffect(() => { loadRecords(); }, [loadRecords]);

  // Quick approve (no modal needed)
  const handleApprove = async (id: number) => {
    try {
      const res = await fetch(`/api/hr/leave/${id}/approve`, { method: 'PATCH' });
      if (res.ok) loadRecords();
      else { const d = await res.json(); alert(d.error ?? 'Lỗi khi duyệt đơn'); }
    } catch { alert('Không thể kết nối đến server'); }
  };

  // Quick cancel (own PENDING request)
  const handleCancel = async (id: number) => {
    if (!confirm('Bạn có chắc muốn hủy đơn nghỉ này không?')) return;
    try {
      const res = await fetch(`/api/hr/leave/${id}`, { method: 'PATCH' });
      if (res.ok) loadRecords();
      else { const d = await res.json(); alert(d.error ?? 'Lỗi khi hủy đơn'); }
    } catch { alert('Không thể kết nối đến server'); }
  };

  const handleReset = () => {
    setFilterStatus('');
    setFilterEmployee('');
    setFilterStart('');
    setFilterEnd('');
  };

  // ── Stats ─────────────────────────────────────────────────────────────────
  const countByStatus = (s: string) => records.filter(r => r.status === s).length;

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Nghỉ phép</h1>
          <p className="page-subtitle">Quản lý đơn xin nghỉ phép của nhân viên</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          + Tạo đơn nghỉ
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Chờ duyệt',  value: countByStatus('PENDING'),   color: 'var(--color-warning)' },
          { label: 'Đã duyệt',   value: countByStatus('APPROVED'),  color: 'var(--color-success)' },
          { label: 'Từ chối',    value: countByStatus('REJECTED'),  color: 'var(--color-danger)' },
          { label: 'Đã hủy',     value: countByStatus('CANCELLED'), color: 'var(--color-text-muted)' },
        ].map(s => (
          <div key={s.label} className="card" style={{ textAlign: 'center', padding: '1rem' }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '0.82rem', opacity: 0.65, marginTop: '0.25rem' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Trạng thái</label>
            <select className="form-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">Tất cả</option>
              <option value="PENDING">Chờ duyệt</option>
              <option value="APPROVED">Đã duyệt</option>
              <option value="REJECTED">Từ chối</option>
              <option value="CANCELLED">Đã hủy</option>
            </select>
          </div>
          {isAdminOrManager && (
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Nhân viên</label>
              <select className="form-select" value={filterEmployee} onChange={e => setFilterEmployee(e.target.value)}>
                <option value="">Tất cả NV</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.employeeCode ? `[${emp.employeeCode}] ` : ''}{emp.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Từ ngày</label>
            <input type="date" className="form-input" value={filterStart} onChange={e => setFilterStart(e.target.value)} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Đến ngày</label>
            <input type="date" className="form-input" value={filterEnd} onChange={e => setFilterEnd(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-ghost" onClick={handleReset} title="Đặt lại">✕ Reset</button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        {loading ? (
          <div className="empty-state"><div className="empty-state-text">Đang tải dữ liệu...</div></div>
        ) : records.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <div className="empty-state-text">Chưa có đơn nghỉ phép nào</div>
            <div className="empty-state-subtext">Nhấn <strong>+ Tạo đơn nghỉ</strong> để tạo đơn mới</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>STT</th>
                  {isAdminOrManager && <th>Nhân viên</th>}
                  {isAdminOrManager && <th>Bộ phận</th>}
                  <th>Loại nghỉ</th>
                  <th>Từ ngày</th>
                  <th>Đến ngày</th>
                  <th style={{ textAlign: 'center' }}>Số ngày</th>
                  <th>Lý do</th>
                  <th>Trạng thái</th>
                  <th>Ngày tạo</th>
                  <th style={{ textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r, i) => (
                  <tr key={r.id}>
                    <td style={{ opacity: 0.5, fontSize: '0.8rem' }}>{i + 1}</td>
                    {isAdminOrManager && <td><strong>{r.employeeName ?? '—'}</strong></td>}
                    {isAdminOrManager && <td>{r.department ?? '—'}</td>}
                    <td>{LEAVE_TYPE_LABELS[r.leaveType] ?? r.leaveType}</td>
                    <td>{r.startDate}</td>
                    <td>{r.endDate}</td>
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>{r.totalDays}</td>
                    <td style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.reason ?? '—'}
                    </td>
                    <td>
                      <StatusBadge status={r.status} />
                      {r.reviewNote && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                          {r.reviewNote}
                        </div>
                      )}
                    </td>
                    <td style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                      {r.createdAt ? new Date(r.createdAt).toLocaleDateString('vi-VN') : '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        {/* ADMIN/MANAGER: Duyệt + Từ chối khi PENDING */}
                        {isAdminOrManager && r.status === 'PENDING' && (
                          <>
                            <button className="btn btn-success btn-sm"
                              onClick={() => handleApprove(r.id)}>
                              ✓ Duyệt
                            </button>
                            <button className="btn btn-danger btn-sm"
                              onClick={() => setRejectTargetId(r.id)}>
                              ✕ Từ chối
                            </button>
                          </>
                        )}
                        {/* Employee: Hủy đơn của chính mình khi PENDING */}
                        {!isAdminOrManager && r.status === 'PENDING' && r.employeeId === myId && (
                          <button className="btn btn-ghost btn-sm" onClick={() => handleCancel(r.id)}>
                            🗑 Hủy đơn
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreate && (
        <CreateLeaveModal onClose={() => setShowCreate(false)} onSuccess={loadRecords} />
      )}
      {rejectTargetId !== null && (
        <RejectModal
          recordId={rejectTargetId}
          onClose={() => setRejectTargetId(null)}
          onSuccess={loadRecords}
        />
      )}
    </div>
  );
}
