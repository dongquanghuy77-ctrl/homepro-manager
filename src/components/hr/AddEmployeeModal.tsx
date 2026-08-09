'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AddEmployeeModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    try {
      const res = await fetch('/api/hr/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        // Fix 4: Đọc đúng error message từ server, không nuốt mất lỗi
        let message = 'Đã có lỗi xảy ra khi thêm nhân viên';
        try {
          const errData = await res.json();
          if (errData.error) message = errData.error;
        } catch {
          // JSON parse failed — giữ message mặc định
        }
        setError(message);
        return;
      }

      router.refresh();
      onClose();
    } catch (err: unknown) {
      // Network error hoặc lỗi không mong đợi
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
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body grid-2">
            {/* Fix 1: Đổi name="fullName" → name="name" để khớp với API field */}
            <div className="form-group">
              <label className="form-label">Họ tên *</label>
              <input type="text" name="name" className="form-input" required />
            </div>
            <div className="form-group">
              <label className="form-label">Tên đăng nhập *</label>
              <input type="text" name="username" className="form-input" required />
            </div>
            <div className="form-group">
              <label className="form-label">Mật khẩu *</label>
              <input type="password" name="password" className="form-input" required />
            </div>
            <div className="form-group">
              <label className="form-label">Số điện thoại</label>
              <input type="text" name="phone" className="form-input" />
            </div>
            <div className="form-group">
              <label className="form-label">Chức vụ</label>
              <input type="text" name="position" className="form-input" />
            </div>
            {/* Fix 2 (department options): Dùng đúng values từ schema Department type */}
            <div className="form-group">
              <label className="form-label">Bộ phận</label>
              <select name="department" className="form-select">
                <option value="">-- Chọn bộ phận --</option>
                <option value="Xưởng gỗ">Xưởng gỗ</option>
                <option value="Thi công">Thi công</option>
                <option value="Thiết kế">Thiết kế</option>
                <option value="Kế toán">Kế toán</option>
                <option value="Quản lý">Quản lý</option>
                <option value="Khác">Khác</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Loại hợp đồng</label>
              <select name="employmentType" className="form-select">
                <option value="FULL_TIME">Toàn thời gian</option>
                <option value="PART_TIME">Bán thời gian</option>
                <option value="CONTRACT">Hợp đồng</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Ngày vào làm</label>
              <input type="date" name="joinDate" className="form-input" />
            </div>
            <div className="form-group">
              <label className="form-label">Vai trò</label>
              <select name="role" className="form-select">
                <option value="WORKER">Nhân viên</option>
                <option value="SUPERVISOR">Giám sát</option>
                <option value="MANAGER">Quản lý</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Ngày sinh</label>
              <input type="date" name="birthDate" className="form-input" />
            </div>
          </div>

          {error && (
            <div className="modal-body">
              <div className="alert alert-danger">{error}</div>
            </div>
          )}

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={loading}>
              Hủy
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Đang lưu...' : 'Lưu nhân viên'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
