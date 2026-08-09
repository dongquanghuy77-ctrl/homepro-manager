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
        throw new Error('Lỗi khi thêm nhân viên');
      }

      router.refresh();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Đã có lỗi xảy ra');
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
            <div className="form-group">
              <label className="form-label">Họ tên *</label>
              <input type="text" name="fullName" className="form-input" required />
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
            <div className="form-group">
              <label className="form-label">Bộ phận</label>
              <select name="department" className="form-select">
                <option value="IT">IT</option>
                <option value="HR">HR</option>
                <option value="SALES">Sales</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Loại hợp đồng</label>
              <input type="text" name="contractType" className="form-input" />
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
          </div>
          
          {error && <div className="modal-body text-red-500">{error}</div>}

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Hủy</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Đang lưu...' : 'Lưu nhân viên'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
