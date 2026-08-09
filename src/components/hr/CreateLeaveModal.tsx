'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CreateLeaveModal() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    try {
      const res = await fetch('/api/hr/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        throw new Error('Lỗi khi tạo đơn');
      }

      router.refresh();
      setIsOpen(false);
    } catch (err: any) {
      setError(err.message || 'Đã có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button className="btn btn-primary" onClick={() => setIsOpen(true)}>+ Tạo đơn nghỉ</button>

      {isOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Tạo đơn xin nghỉ</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setIsOpen(false)}>✕</button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="modal-body grid-2 gap-4">
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Loại nghỉ *</label>
                  <select name="type" className="form-select" required>
                    <option value="ANNUAL">Nghỉ phép năm</option>
                    <option value="SICK">Ốm</option>
                    <option value="PERSONAL">Cá nhân</option>
                    <option value="UNPAID">Không lương</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Từ ngày *</label>
                  <input type="date" name="startDate" className="form-input" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Đến ngày *</label>
                  <input type="date" name="endDate" className="form-input" required />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Lý do *</label>
                  <textarea name="reason" className="form-textarea" required rows={3}></textarea>
                </div>
              </div>
              
              {error && <div className="modal-body text-red-500">{error}</div>}

              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setIsOpen(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Đang gửi...' : 'Gửi đơn'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
