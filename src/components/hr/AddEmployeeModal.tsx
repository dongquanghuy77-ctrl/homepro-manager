'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const DEPARTMENTS = [
  'Xưởng gỗ', 'Thi công', 'Thiết kế', 'Kế toán', 'Quản lý', 'Khác',
] as const;

interface Manager {
  id: number;
  name: string;
  employeeCode: string | null;
}

export default function AddEmployeeModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [error,    setError]   = useState('');
  const [loading,  setLoading] = useState(false);
  const [managers, setManagers] = useState<Manager[]>([]);

  // Load danh sách manager/admin để chọn người quản lý
  useEffect(() => {
    fetch('/api/hr/employees')
      .then((res) => res.ok ? res.json() : [])
      .then((data: Manager[]) => setManagers(data))
      .catch(() => setManagers([]));
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data: Record<string, string | null> = {};

    for (const [key, value] of formData.entries()) {
      data[key] = (value as string).trim() || null;
    }

    // Client-side validation (server also validates)
    if (!data.name) {
      setError('Vui lòng nhập họ tên');
      setLoading(false);
      return;
    }
    if (!data.username) {
      setError('Vui lòng nhập tên đăng nhập');
      setLoading(false);
      return;
    }
    if (!data.password || data.password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      setLoading(false);
      return;
    }
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      setError('Email không hợp lệ');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/hr/employees', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(data),
      });

      if (!res.ok) {
        let message = 'Đã có lỗi xảy ra khi thêm nhân viên';
        try {
          const errData = await res.json();
          if (errData.error) message = errData.error;
        } catch { /* JSON parse failed */ }
        setError(message);
        return;
      }

      const result = await res.json();
      // Show success briefly then close
      router.refresh();
      onClose();
      // Optionally navigate to the new employee's profile
      if (result.id) {
        router.push(`/employees/${result.id}`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Không thể kết nối đến server';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal modal-lg">
        <div className="modal-header">
          <h2 className="modal-title">Thêm nhân viên mới</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose} disabled={loading}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body grid-2">
            {/* Họ tên */}
            <div className="form-group">
              <label className="form-label">Họ tên *</label>
              <input type="text" name="name" className="form-input"
                placeholder="Nguyễn Văn A" required />
            </div>

            {/* Tên đăng nhập */}
            <div className="form-group">
              <label className="form-label">Tên đăng nhập *</label>
              <input type="text" name="username" className="form-input"
                placeholder="nguyenvana" required autoComplete="off" />
            </div>

            {/* Mật khẩu */}
            <div className="form-group">
              <label className="form-label">Mật khẩu * (tối thiểu 6 ký tự)</label>
              <input type="password" name="password" className="form-input"
                placeholder="••••••••" required minLength={6} autoComplete="new-password" />
            </div>

            {/* Số điện thoại */}
            <div className="form-group">
              <label className="form-label">Số điện thoại</label>
              <input type="tel" name="phone" className="form-input"
                placeholder="0901234567" />
            </div>

            {/* Email */}
            <div className="form-group">
              <label className="form-label">Email</label>
              <input type="email" name="email" className="form-input"
                placeholder="example@homepro.vn" />
            </div>

            {/* Chức vụ */}
            <div className="form-group">
              <label className="form-label">Chức vụ</label>
              <input type="text" name="position" className="form-input"
                placeholder="Thợ mộc, Kỹ thuật viên..." />
            </div>

            {/* Bộ phận */}
            <div className="form-group">
              <label className="form-label">Bộ phận</label>
              <select name="department" className="form-select">
                <option value="">-- Chọn bộ phận --</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* Loại hợp đồng */}
            <div className="form-group">
              <label className="form-label">Loại hợp đồng</label>
              <select name="employmentType" className="form-select">
                <option value="FULL_TIME">Toàn thời gian</option>
                <option value="PART_TIME">Bán thời gian</option>
                <option value="CONTRACT">Hợp đồng</option>
              </select>
            </div>

            {/* Ngày vào làm */}
            <div className="form-group">
              <label className="form-label">Ngày vào làm</label>
              <input type="date" name="joinDate" className="form-input" />
            </div>

            {/* Ngày sinh */}
            <div className="form-group">
              <label className="form-label">Ngày sinh</label>
              <input type="date" name="birthDate" className="form-input" />
            </div>

            {/* Vai trò hệ thống */}
            <div className="form-group">
              <label className="form-label">Vai trò hệ thống</label>
              <select name="role" className="form-select">
                <option value="WORKER">Nhân viên (WORKER)</option>
                <option value="SUPERVISOR">Giám sát (SUPERVISOR)</option>
                <option value="MANAGER">Quản lý (MANAGER)</option>
              </select>
            </div>

            {/* Người quản lý */}
            <div className="form-group">
              <label className="form-label">Người quản lý</label>
              <select name="managerId" className="form-select">
                <option value="">-- Không có --</option>
                {managers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.employeeCode ? `[${m.employeeCode}] ` : ''}{m.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Ghi chú — full width */}
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Ghi chú</label>
              <textarea name="note" className="form-input" rows={3}
                placeholder="Ghi chú thêm về nhân viên..." style={{ resize: 'vertical' }} />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="modal-body" style={{ paddingTop: 0 }}>
              <div className="alert alert-danger">{error}</div>
            </div>
          )}

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={loading}>
              Hủy
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Đang lưu...' : '+ Lưu nhân viên'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
