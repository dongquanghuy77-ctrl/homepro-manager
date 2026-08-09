'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Plus } from 'lucide-react';

interface ProjectFormProps {
  onClose: () => void;
}

export default function ProjectForm({ onClose }: ProjectFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    code: '',
    name: '',
    customer: '',
    location: '',
    manager: '',
    startDate: '',
    deadline: '',
    contractValue: '',
    status: 'ACTIVE',
    notes: '',
  });

  const set = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.code || !form.name || !form.customer || !form.manager) {
      setError('Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          contractValue: form.contractValue ? parseFloat(form.contractValue) : 0,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Lỗi không xác định');
      }
      const project = await res.json();
      router.push(`/projects/${project.id}`);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <h2 className="modal-title">Tạo dự án mới</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose} id="close-project-modal">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="alert alert-danger mb-4">{error}</div>}

            <div className="grid-2" style={{ marginBottom: 16 }}>
              <div className="form-group">
                <label className="form-label">Mã dự án *</label>
                <input
                  id="project-code"
                  className="form-input"
                  placeholder="VD: DA-2026-002"
                  value={form.code}
                  onChange={(e) => set('code', e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Tên dự án *</label>
                <input
                  id="project-name"
                  className="form-input"
                  placeholder="VD: Nhà anh Minh"
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid-2" style={{ marginBottom: 16 }}>
              <div className="form-group">
                <label className="form-label">Khách hàng *</label>
                <input
                  id="project-customer"
                  className="form-input"
                  placeholder="Tên khách hàng"
                  value={form.customer}
                  onChange={(e) => set('customer', e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Địa điểm</label>
                <input
                  id="project-location"
                  className="form-input"
                  placeholder="VD: Quận 1, TP.HCM"
                  value={form.location}
                  onChange={(e) => set('location', e.target.value)}
                />
              </div>
            </div>

            <div className="grid-2" style={{ marginBottom: 16 }}>
              <div className="form-group">
                <label className="form-label">Quản lý *</label>
                <input
                  id="project-manager"
                  className="form-input"
                  placeholder="Tên quản lý"
                  value={form.manager}
                  onChange={(e) => set('manager', e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Giá trị hợp đồng (VND)</label>
                <input
                  id="project-contract-value"
                  className="form-input"
                  type="number"
                  placeholder="VD: 150000000"
                  value={form.contractValue}
                  onChange={(e) => set('contractValue', e.target.value)}
                />
              </div>
            </div>

            <div className="grid-2" style={{ marginBottom: 16 }}>
              <div className="form-group">
                <label className="form-label">Ngày bắt đầu</label>
                <input
                  id="project-start-date"
                  type="date"
                  className="form-input"
                  value={form.startDate}
                  onChange={(e) => set('startDate', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Deadline</label>
                <input
                  id="project-deadline"
                  type="date"
                  className="form-input"
                  value={form.deadline}
                  onChange={(e) => set('deadline', e.target.value)}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">Trạng thái</label>
              <select
                id="project-status"
                className="form-select"
                value={form.status}
                onChange={(e) => set('status', e.target.value)}
              >
                <option value="ACTIVE">Đang thực hiện</option>
                <option value="ON_HOLD">Tạm dừng</option>
                <option value="COMPLETED">Hoàn thành</option>
                <option value="CANCELLED">Đã hủy</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Ghi chú</label>
              <textarea
                id="project-notes"
                className="form-textarea"
                placeholder="Mô tả dự án, yêu cầu đặc biệt..."
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Hủy
            </button>
            <button
              type="submit"
              id="save-project-btn"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? <span className="spinner" /> : <Plus size={14} />}
              Tạo dự án
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
