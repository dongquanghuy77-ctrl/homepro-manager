'use client';

import { useState, useEffect, useCallback } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────
interface AttendanceRecord {
  id: number;
  employeeId: number;
  workDate: string;
  checkIn:  string | null;
  checkOut: string | null;
  status:   string;
  lateMinutes:       number | null;
  earlyLeaveMinutes: number | null;
  totalHours:        number | null;
  note:         string | null;
  employeeName: string | null;
  employeeCode: string | null;
  department:   string | null;
}

interface EmployeeOption {
  id: number;
  name: string;
  employeeCode: string | null;
  department: string | null;
}

const DEPARTMENTS = ['Xưởng gỗ', 'Thi công', 'Thiết kế', 'Kế toán', 'Quản lý', 'Khác'] as const;

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  PRESENT:    { label: 'Có mặt',     bg: 'var(--color-success-bg)', color: 'var(--color-success)' },
  LATE:       { label: 'Đi trễ',     bg: 'var(--color-warning-bg)', color: 'var(--color-warning)' },
  ABSENT:     { label: 'Vắng',       bg: 'var(--color-danger-bg)',  color: 'var(--color-danger)' },
  HALF_DAY:   { label: 'Nửa ngày',   bg: '#fef9c3',                 color: '#a16207' },
  ON_LEAVE:   { label: 'Nghỉ phép',  bg: '#ede9fe',                 color: '#7c3aed' },
  NOT_CHECKED:{ label: 'Chưa chấm',  bg: 'var(--color-surface-3)',  color: 'var(--color-text-muted)' },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.NOT_CHECKED;
  return (
    <span className="badge" style={{ background: cfg.bg, color: cfg.color }}>
      {cfg.label}
    </span>
  );
}

function fmt(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

// ── AddAttendanceModal ────────────────────────────────────────────────────────
function AddAttendanceModal({
  employees,
  onClose,
  onSuccess,
}: {
  employees: EmployeeOption[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  // Use Vietnam timezone for default date (avoid UTC date mismatch after 17:00 UTC = 00:00 VN+1)
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const fd = new FormData(e.currentTarget);

    const payload: Record<string, string | null> = {
      employeeId: fd.get('employeeId') as string,
      workDate:   fd.get('workDate')   as string,
      status:     fd.get('status')     as string,
      note:       (fd.get('note') as string)?.trim() || null,
    };
    const checkInVal  = (fd.get('checkIn')  as string)?.trim();
    const checkOutVal = (fd.get('checkOut') as string)?.trim();

    // Build ISO datetime strings from workDate + HH:MM
    // IMPORTANT: append +07:00 so server correctly stores UTC equivalent of VN local time
    // Without timezone suffix → server (UTC) treats it as UTC → 7h offset in display
    if (checkInVal)  payload.checkIn  = `${payload.workDate}T${checkInVal}:00+07:00`;
    if (checkOutVal) payload.checkOut = `${payload.workDate}T${checkOutVal}:00+07:00`;

    if (!payload.employeeId) { setError('Vui lòng chọn nhân viên'); setLoading(false); return; }
    if (!payload.workDate)   { setError('Vui lòng chọn ngày');       setLoading(false); return; }

    try {
      const res = await fetch('/api/hr/attendance', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? 'Lỗi khi lưu chấm công');
        return;
      }
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
          <h2 className="modal-title">Thêm bản ghi chấm công</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose} disabled={loading}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body grid-2">
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Nhân viên *</label>
              <select name="employeeId" className="form-select" required>
                <option value="">-- Chọn nhân viên --</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.employeeCode ? `[${e.employeeCode}] ` : ''}{e.name}
                    {e.department ? ` — ${e.department}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Ngày *</label>
              <input type="date" name="workDate" className="form-input" defaultValue={today} required />
            </div>
            <div className="form-group">
              <label className="form-label">Trạng thái</label>
              <select name="status" className="form-select">
                <option value="PRESENT">Có mặt</option>
                <option value="LATE">Đi trễ</option>
                <option value="ABSENT">Vắng</option>
                <option value="HALF_DAY">Nửa ngày</option>
                <option value="ON_LEAVE">Nghỉ phép</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Giờ vào (HH:MM)</label>
              <input type="time" name="checkIn" className="form-input" />
            </div>
            <div className="form-group">
              <label className="form-label">Giờ ra (HH:MM)</label>
              <input type="time" name="checkOut" className="form-input" />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Ghi chú</label>
              <input type="text" name="note" className="form-input" placeholder="Ghi chú thêm..." />
            </div>
          </div>
          {error && <div className="modal-body" style={{ paddingTop: 0 }}><div className="alert alert-danger">{error}</div></div>}
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={loading}>Hủy</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Đang lưu...' : '+ Lưu chấm công'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── EditAttendanceModal ───────────────────────────────────────────────────────
function EditAttendanceModal({
  record,
  onClose,
  onSuccess,
}: {
  record: AttendanceRecord;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const toTimeInput = (iso: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const checkInVal  = (fd.get('checkIn')  as string)?.trim();
    const checkOutVal = (fd.get('checkOut') as string)?.trim();

    const payload: Record<string, string | null> = {
      status: fd.get('status') as string,
      note:   (fd.get('note') as string)?.trim() || null,
      // +07:00 suffix ensures server stores correct UTC equivalent of VN local time
      checkIn:  checkInVal  ? `${record.workDate}T${checkInVal}:00+07:00`  : null,
      checkOut: checkOutVal ? `${record.workDate}T${checkOutVal}:00+07:00` : null,
    };

    try {
      const res = await fetch(`/api/hr/attendance/${record.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? 'Lỗi khi cập nhật');
        return;
      }
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
          <h2 className="modal-title">Sửa chấm công — {record.employeeName}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose} disabled={loading}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body grid-2">
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Ngày làm việc</label>
              <input type="text" className="form-input" value={record.workDate} disabled />
            </div>
            <div className="form-group">
              <label className="form-label">Trạng thái</label>
              <select name="status" className="form-select" defaultValue={record.status}>
                <option value="PRESENT">Có mặt</option>
                <option value="LATE">Đi trễ</option>
                <option value="ABSENT">Vắng</option>
                <option value="HALF_DAY">Nửa ngày</option>
                <option value="ON_LEAVE">Nghỉ phép</option>
                <option value="NOT_CHECKED">Chưa chấm</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Ghi chú</label>
              <input type="text" name="note" className="form-input" defaultValue={record.note ?? ''} />
            </div>
            <div className="form-group">
              <label className="form-label">Giờ vào (HH:MM)</label>
              <input type="time" name="checkIn" className="form-input" defaultValue={toTimeInput(record.checkIn)} />
            </div>
            <div className="form-group">
              <label className="form-label">Giờ ra (HH:MM)</label>
              <input type="time" name="checkOut" className="form-input" defaultValue={toTimeInput(record.checkOut)} />
            </div>
          </div>
          {error && <div className="modal-body" style={{ paddingTop: 0 }}><div className="alert alert-danger">{error}</div></div>}
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={loading}>Hủy</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Đang lưu...' : '💾 Lưu thay đổi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AttendancePage() {
  // Use Vietnam timezone to avoid date mismatch after 17:00 UTC (= midnight VN+1)
  const today   = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });
  const thisMonth = today.substring(0, 7); // YYYY-MM

  const [records,   setRecords]   = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [filterDate,       setFilterDate]       = useState(today);
  const [filterMonth,      setFilterMonth]      = useState('');
  const [filterEmployee,   setFilterEmployee]   = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [showAdd,       setShowAdd]       = useState(false);
  const [editRecord,    setEditRecord]    = useState<AttendanceRecord | null>(null);

  // Load employee list for filter/modal
  useEffect(() => {
    fetch('/api/hr/employees')
      .then((r) => r.ok ? r.json() : [])
      .then((data: EmployeeOption[]) => setEmployees(data))
      .catch(() => setEmployees([]));
  }, []);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    const q = new URLSearchParams();
    if (filterDate && !filterMonth) q.set('date',       filterDate);
    if (filterMonth)                q.set('month',      filterMonth);
    if (filterEmployee)             q.set('employeeId', filterEmployee);
    if (filterDepartment)           q.set('department', filterDepartment);

    try {
      const res = await fetch(`/api/hr/attendance?${q.toString()}`);
      if (res.ok) setRecords(await res.json());
      else        setRecords([]);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [filterDate, filterMonth, filterEmployee, filterDepartment]);

  useEffect(() => { loadRecords(); }, [loadRecords]);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const totalEmployees = employees.length;
  const present  = records.filter((r) => r.status === 'PRESENT').length;
  const late     = records.filter((r) => r.status === 'LATE').length;
  const absent   = records.filter((r) => r.status === 'ABSENT').length;
  const onLeave  = records.filter((r) => r.status === 'ON_LEAVE').length;
  const checked  = records.filter((r) => r.status !== 'NOT_CHECKED' && r.status !== 'ABSENT').length;

  // ── Filter handlers ────────────────────────────────────────────────────────
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadRecords();
  };

  const handleReset = () => {
    setFilterDate(today);
    setFilterMonth('');
    setFilterEmployee('');
    setFilterDepartment('');
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Chấm công</h1>
          <p className="page-subtitle">Quản lý thời gian làm việc của nhân viên</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          + Chấm công
        </button>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Tổng NV',     value: totalEmployees, color: 'var(--color-primary)' },
          { label: 'Đã chấm',     value: checked,        color: 'var(--color-success)' },
          { label: 'Đi trễ',      value: late,           color: 'var(--color-warning)' },
          { label: 'Vắng mặt',    value: absent,         color: 'var(--color-danger)' },
          { label: 'Nghỉ phép',   value: onLeave,        color: '#7c3aed' },
        ].map((s) => (
          <div key={s.label} className="card" style={{ textAlign: 'center', padding: '1rem' }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '0.82rem', opacity: 0.65, marginTop: '0.25rem' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <form onSubmit={handleSearch}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Ngày</label>
              <input type="date" className="form-input" value={filterDate}
                onChange={(e) => { setFilterDate(e.target.value); setFilterMonth(''); }} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Tháng</label>
              <input type="month" className="form-input" value={filterMonth}
                onChange={(e) => { setFilterMonth(e.target.value); setFilterDate(''); }} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Nhân viên</label>
              <select className="form-select" value={filterEmployee}
                onChange={(e) => setFilterEmployee(e.target.value)}>
                <option value="">Tất cả NV</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.employeeCode ? `[${emp.employeeCode}] ` : ''}{emp.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Bộ phận</label>
              <select className="form-select" value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}>
                <option value="">Tất cả</option>
                {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="submit" className="btn btn-secondary" style={{ flex: 1 }}>🔍 Tìm</button>
              <button type="button" className="btn btn-ghost" onClick={handleReset} title="Đặt lại">✕</button>
            </div>
          </div>
        </form>
      </div>

      {/* Table */}
      <div className="card">
        {loading ? (
          <div className="empty-state"><div className="empty-state-text">Đang tải dữ liệu...</div></div>
        ) : records.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <div className="empty-state-text">Chưa có dữ liệu chấm công</div>
            <div className="empty-state-subtext">Nhấn <strong>+ Chấm công</strong> để thêm bản ghi</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Mã NV</th>
                  <th>Tên nhân viên</th>
                  <th>Bộ phận</th>
                  <th>Ngày</th>
                  <th>Giờ vào</th>
                  <th>Giờ ra</th>
                  <th>Tổng giờ</th>
                  <th>Trạng thái</th>
                  <th>Ghi chú</th>
                  <th style={{ textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r, i) => (
                  <tr key={r.id}>
                    <td style={{ opacity: 0.5, fontSize: '0.8rem' }}>{i + 1}</td>
                    <td><code style={{ fontSize: '0.8rem' }}>{r.employeeCode ?? '—'}</code></td>
                    <td><strong>{r.employeeName ?? '—'}</strong></td>
                    <td>{r.department ?? '—'}</td>
                    <td>{r.workDate}</td>
                    <td>{fmt(r.checkIn)}</td>
                    <td>{fmt(r.checkOut)}</td>
                    <td>
                      {r.totalHours != null ? `${r.totalHours.toFixed(1)}h` : '—'}
                      {r.lateMinutes && r.lateMinutes > 0 ? (
                        <span style={{ marginLeft: '4px', fontSize: '0.75rem', color: 'var(--color-warning)', whiteSpace: 'nowrap' }}
                              title={`Đi trễ ${r.lateMinutes} phút`}>
                          ⚡ Trễ {r.lateMinutes}ph
                        </span>
                      ) : null}
                    </td>
                    <td><StatusBadge status={r.status} /></td>
                    <td style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.note ?? '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setEditRecord(r)}>
                          ✏️ Sửa
                        </button>
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
      {showAdd && (
        <AddAttendanceModal
          employees={employees}
          onClose={() => setShowAdd(false)}
          onSuccess={loadRecords}
        />
      )}
      {editRecord && (
        <EditAttendanceModal
          record={editRecord}
          onClose={() => setEditRecord(null)}
          onSuccess={loadRecords}
        />
      )}
    </div>
  );
}
