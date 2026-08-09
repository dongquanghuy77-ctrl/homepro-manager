'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// ── Types ─────────────────────────────────────────────────────────────────────
interface EmployeeDetail {
  id: number;
  name: string;
  username: string;
  employeeCode: string | null;
  department: string | null;
  position: string | null;
  phone: string | null;
  email: string | null;
  employeeStatus: string | null;
  employmentType: string | null;
  joinDate: string | null;
  birthDate: string | null;
  managerId: number | null;
  role: string;
  active: boolean;
  note: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

const DEPARTMENTS = [
  'Xưởng gỗ', 'Thi công', 'Thiết kế', 'Kế toán', 'Quản lý', 'Khác',
] as const;

const STATUS_LABELS: Record<string, string> = {
  ACTIVE:   'Đang làm việc',
  INACTIVE: 'Đã nghỉ',
  ON_LEAVE: 'Đang nghỉ phép',
};

const TYPE_LABELS: Record<string, string> = {
  FULL_TIME: 'Toàn thời gian',
  PART_TIME: 'Bán thời gian',
  CONTRACT:  'Hợp đồng',
};

// ── Page Component ─────────────────────────────────────────────────────────────
export default function EmployeeDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [editing,  setEditing]  = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [saveMsg,  setSaveMsg]  = useState('');
  const [saveErr,  setSaveErr]  = useState('');

  // Form state (only set when editing)
  const [form, setForm] = useState<Partial<EmployeeDetail>>({});

  const loadEmployee = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/hr/employees/${params.id}`);
      if (res.status === 404) {
        setError('Không tìm thấy nhân viên');
        return;
      }
      if (res.status === 403) {
        setError('Bạn không có quyền xem hồ sơ này');
        return;
      }
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? 'Không thể tải thông tin nhân viên');
        return;
      }
      const data: EmployeeDetail = await res.json();
      setEmployee(data);
      setForm(data);
    } catch {
      setError('Không thể kết nối đến server');
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => { loadEmployee(); }, [loadEmployee]);

  const handleEdit = () => {
    setEditing(true);
    setSaveMsg('');
    setSaveErr('');
  };

  const handleCancel = () => {
    setEditing(false);
    if (employee) setForm(employee); // reset form to saved state
    setSaveErr('');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value || null }));
  };

  const handleSave = async () => {
    if (!form.name?.trim()) {
      setSaveErr('Họ tên không được để trống');
      return;
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setSaveErr('Email không hợp lệ');
      return;
    }

    setSaving(true);
    setSaveMsg('');
    setSaveErr('');

    try {
      const res = await fetch(`/api/hr/employees/${params.id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          name:           form.name,
          position:       form.position,
          phone:          form.phone,
          email:          form.email,
          birthDate:      form.birthDate,
          department:     form.department,
          employmentType: form.employmentType,
          joinDate:       form.joinDate,
          managerId:      form.managerId,
          note:           form.note,
          role:           form.role,
          employeeStatus: form.employeeStatus,
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        setSaveErr(d.error ?? 'Không thể lưu thay đổi');
        return;
      }

      setSaveMsg('✅ Đã lưu thay đổi thành công');
      setEditing(false);
      await loadEmployee(); // reload fresh data
    } catch {
      setSaveErr('Không thể kết nối đến server');
    } finally {
      setSaving(false);
    }
  };

  // ── Render states ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <div className="empty-state-text">Đang tải hồ sơ nhân viên...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="card">
          <div className="alert alert-danger">{error}</div>
          <button className="btn btn-ghost" onClick={() => router.push('/employees')}>
            ← Quay lại danh sách
          </button>
        </div>
      </div>
    );
  }

  if (!employee) return null;

  // ── Main Render ────────────────────────────────────────────────────────────
  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <button className="btn btn-ghost btn-sm" onClick={() => router.push('/employees')}
            style={{ marginBottom: '0.5rem' }}>
            ← Danh sách nhân viên
          </button>
          <h1 className="page-title">{employee.name}</h1>
          <p className="page-subtitle">
            {employee.employeeCode && (
              <code style={{ marginRight: '0.75rem', fontSize: '0.85rem' }}>
                {employee.employeeCode}
              </code>
            )}
            {employee.department && <span>{employee.department}</span>}
            {employee.position && <span style={{ marginLeft: '0.5rem' }}>· {employee.position}</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
          {!editing ? (
            <button className="btn btn-primary" onClick={handleEdit}>✏️ Chỉnh sửa</button>
          ) : (
            <>
              <button className="btn btn-ghost" onClick={handleCancel} disabled={saving}>Hủy</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Đang lưu...' : '💾 Lưu thay đổi'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Success / Error messages */}
      {saveMsg && (
        <div className="alert alert-success" style={{ marginBottom: '1rem' }}>{saveMsg}</div>
      )}
      {saveErr && (
        <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>{saveErr}</div>
      )}

      {/* Form / View */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>

        {/* LEFT: Personal info */}
        <div className="card">
          <h3 className="card-title">Thông tin cá nhân</h3>
          <div className="grid-2" style={{ gap: '1rem' }}>
            {/* Họ tên */}
            <Field label="Họ tên *" editing={editing}>
              {editing ? (
                <input name="name" type="text" className="form-input"
                  value={form.name ?? ''} onChange={handleChange} required />
              ) : (
                <strong>{employee.name}</strong>
              )}
            </Field>

            {/* Mã nhân viên */}
            <Field label="Mã nhân viên" editing={false}>
              <code>{employee.employeeCode ?? '—'}</code>
            </Field>

            {/* Số điện thoại */}
            <Field label="Số điện thoại" editing={editing}>
              {editing ? (
                <input name="phone" type="tel" className="form-input"
                  value={form.phone ?? ''} onChange={handleChange} />
              ) : (
                employee.phone ?? '—'
              )}
            </Field>

            {/* Email */}
            <Field label="Email" editing={editing}>
              {editing ? (
                <input name="email" type="email" className="form-input"
                  value={form.email ?? ''} onChange={handleChange} />
              ) : (
                employee.email ?? '—'
              )}
            </Field>

            {/* Ngày sinh */}
            <Field label="Ngày sinh" editing={editing}>
              {editing ? (
                <input name="birthDate" type="date" className="form-input"
                  value={form.birthDate ?? ''} onChange={handleChange} />
              ) : (
                employee.birthDate ?? '—'
              )}
            </Field>

            {/* Tên đăng nhập */}
            <Field label="Tên đăng nhập" editing={false}>
              <span style={{ opacity: 0.7 }}>{employee.username}</span>
            </Field>
          </div>
        </div>

        {/* RIGHT: Work info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card">
            <h3 className="card-title">Thông tin công việc</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

              <Field label="Bộ phận" editing={editing}>
                {editing ? (
                  <select name="department" className="form-select"
                    value={form.department ?? ''} onChange={handleChange}>
                    <option value="">-- Chọn --</option>
                    {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                ) : (
                  employee.department ?? '—'
                )}
              </Field>

              <Field label="Chức vụ" editing={editing}>
                {editing ? (
                  <input name="position" type="text" className="form-input"
                    value={form.position ?? ''} onChange={handleChange} />
                ) : (
                  employee.position ?? '—'
                )}
              </Field>

              <Field label="Loại HĐ" editing={editing}>
                {editing ? (
                  <select name="employmentType" className="form-select"
                    value={form.employmentType ?? 'FULL_TIME'} onChange={handleChange}>
                    <option value="FULL_TIME">Toàn thời gian</option>
                    <option value="PART_TIME">Bán thời gian</option>
                    <option value="CONTRACT">Hợp đồng</option>
                  </select>
                ) : (
                  TYPE_LABELS[employee.employmentType ?? ''] ?? employee.employmentType ?? '—'
                )}
              </Field>

              <Field label="Ngày vào làm" editing={editing}>
                {editing ? (
                  <input name="joinDate" type="date" className="form-input"
                    value={form.joinDate ?? ''} onChange={handleChange} />
                ) : (
                  employee.joinDate ?? '—'
                )}
              </Field>

              <Field label="Vai trò" editing={editing}>
                {editing ? (
                  <select name="role" className="form-select"
                    value={form.role ?? 'WORKER'} onChange={handleChange}>
                    <option value="WORKER">Nhân viên</option>
                    <option value="SUPERVISOR">Giám sát</option>
                    <option value="MANAGER">Quản lý</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                ) : (
                  employee.role
                )}
              </Field>

              <Field label="Trạng thái" editing={editing}>
                {editing ? (
                  <select name="employeeStatus" className="form-select"
                    value={form.employeeStatus ?? 'ACTIVE'} onChange={handleChange}>
                    <option value="ACTIVE">Đang làm việc</option>
                    <option value="INACTIVE">Đã nghỉ</option>
                    <option value="ON_LEAVE">Đang nghỉ phép</option>
                  </select>
                ) : (
                  <span className="badge" style={{
                    background: employee.employeeStatus === 'ACTIVE' ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
                    color:      employee.employeeStatus === 'ACTIVE' ? 'var(--color-success)' : 'var(--color-danger)',
                  }}>
                    {STATUS_LABELS[employee.employeeStatus ?? 'ACTIVE'] ?? employee.employeeStatus}
                  </span>
                )}
              </Field>
            </div>
          </div>

          {/* Meta */}
          <div className="card" style={{ fontSize: '0.82rem', opacity: 0.7 }}>
            <div>Tạo lúc: {employee.createdAt ? new Date(employee.createdAt).toLocaleDateString('vi-VN') : '—'}</div>
            <div style={{ marginTop: '0.25rem' }}>Cập nhật: {employee.updatedAt ? new Date(employee.updatedAt).toLocaleDateString('vi-VN') : '—'}</div>
          </div>
        </div>
      </div>

      {/* Note */}
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h3 className="card-title">Ghi chú</h3>
        {editing ? (
          <textarea name="note" className="form-input" rows={4}
            value={form.note ?? ''} onChange={handleChange}
            placeholder="Ghi chú về nhân viên..." style={{ resize: 'vertical' }} />
        ) : (
          <p style={{ margin: 0, opacity: employee.note ? 1 : 0.5 }}>
            {employee.note ?? 'Không có ghi chú'}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Field component ────────────────────────────────────────────────────────────
function Field({
  label, editing, children,
}: {
  label: string;
  editing: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={editing ? 'form-group' : ''} style={editing ? { margin: 0 } : {}}>
      <div style={{ fontSize: '0.78rem', fontWeight: 600, opacity: 0.55, marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </div>
      {children}
    </div>
  );
}
