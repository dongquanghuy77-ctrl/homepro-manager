'use client';

import { useState, useEffect } from 'react';
import { DollarSign, Plus, Download, Printer, Filter, TrendingUp, TrendingDown, PieChart, FileSpreadsheet, Trash2, Edit } from 'lucide-react';

interface CostItem {
  id: number;
  projectId: number;
  projectName: string;
  projectCode: string;
  contractValue: number;
  title: string;
  amount: number;
  category: string;
  costDate: string;
  notes?: string;
  createdByName?: string;
}

interface ProjectOption {
  id: number;
  name: string;
  code: string;
  contractValue: number;
}

export default function CostsPage() {
  const [costs, setCosts] = useState<CostItem[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    projectId: '',
    title: '',
    amount: '',
    category: 'Vật tư mua ngoài',
    costDate: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [resCosts, resProjects] = await Promise.all([
        fetch('/api/costs'),
        fetch('/api/projects'),
      ]);
      const dataCosts = await resCosts.json();
      const dataProjects = await resProjects.json();

      if (Array.isArray(dataCosts)) setCosts(dataCosts);
      if (Array.isArray(dataProjects)) {
        setProjects(dataProjects.map((p: any) => ({
          id: p.id,
          name: p.name,
          code: p.code,
          contractValue: p.contractValue || 0,
        })));
        if (dataProjects.length > 0 && !formData.projectId) {
          setFormData((prev) => ({ ...prev, projectId: String(dataProjects[0].id) }));
        }
      }
    } catch (err) {
      console.error('Failed to load cost data:', err);
    } finally {
      setLoading(false);
    }
  }

  // Filter costs
  const filteredCosts = costs.filter((c) => {
    if (selectedProjectId !== 'ALL' && c.projectId !== parseInt(selectedProjectId)) return false;
    if (selectedCategory !== 'ALL' && c.category !== selectedCategory) return false;
    return true;
  });

  // Calculate Financial Metrics
  const totalCostAmount = filteredCosts.reduce((sum, c) => sum + (c.amount || 0), 0);

  // Contract Value calculation for selected project or total
  let totalContractValue = 0;
  if (selectedProjectId !== 'ALL') {
    const proj = projects.find((p) => p.id === parseInt(selectedProjectId));
    totalContractValue = proj?.contractValue || 0;
  } else {
    totalContractValue = projects.reduce((sum, p) => sum + (p.contractValue || 0), 0);
  }

  const grossProfit = totalContractValue - totalCostAmount;
  const profitMargin = totalContractValue > 0 ? ((grossProfit / totalContractValue) * 100).toFixed(1) : '0';

  async function handleCreateCost(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.projectId || !formData.title || !formData.amount) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/costs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setShowAddModal(false);
        setFormData({
          projectId: projects[0] ? String(projects[0].id) : '',
          title: '',
          amount: '',
          category: 'Vật tư mua ngoài',
          costDate: new Date().toISOString().split('T')[0],
          notes: '',
        });
        loadData();
      }
    } catch (err) {
      console.error('Failed to create cost:', err);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteCost(id: number, title: string) {
    if (!confirm(`Bạn có chắc muốn XÓA khoản chi "${title}"?`)) return;
    try {
      const res = await fetch(`/api/costs/${id}`, { method: 'DELETE' });
      if (res.ok) loadData();
    } catch (err) {
      console.error('Failed to delete cost:', err);
    }
  }

  function formatVND(num: number) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <DollarSign className="text-primary" size={24} />
            Báo cáo Chi phí & Lợi nhuận Dự án
          </h1>
          <p className="page-subtitle">
            Theo dõi khoản chi thực tế phát sinh, tính toán lợi nhuận gộp và tỷ suất sinh lời theo từng dự án.
          </p>
        </div>

        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={() => window.print()}>
            <Printer size={16} /> In Báo Cáo
          </button>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <Plus size={16} /> Nhập khoản chi mới
          </button>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid-3 mb-6">
        <div className="card" style={{ borderLeft: '4px solid #3B82F6' }}>
          <div className="card-subtitle mb-1">Tổng Giá Trị Hợp Đồng</div>
          <div className="card-value" style={{ color: '#60A5FA', fontSize: 24 }}>
            {formatVND(totalContractValue)}
          </div>
          <div className="card-trend text-muted" style={{ fontSize: 12 }}>
            Dựa trên hợp đồng {selectedProjectId !== 'ALL' ? 'dự án đang chọn' : `của ${projects.length} dự án`}
          </div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #EF4444' }}>
          <div className="card-subtitle mb-1">Tổng Chi Phí Thực Tế</div>
          <div className="card-value text-danger" style={{ fontSize: 24 }}>
            {formatVND(totalCostAmount)}
          </div>
          <div className="card-trend text-muted" style={{ fontSize: 12 }}>
            Tổng {filteredCosts.length} khoản chi phí đã phát sinh
          </div>
        </div>

        <div className="card" style={{ borderLeft: `4px solid ${grossProfit >= 0 ? '#10B981' : '#EF4444'}` }}>
          <div className="card-subtitle mb-1">Lợi Nhuận Gộp Ước Tính</div>
          <div className="card-value" style={{ color: grossProfit >= 0 ? '#34D399' : '#F87171', fontSize: 24 }}>
            {formatVND(grossProfit)}
          </div>
          <div className="card-trend" style={{ fontSize: 12, color: grossProfit >= 0 ? '#34D399' : '#F87171', fontWeight: 600 }}>
            Tỷ suất lợi nhuận: {profitMargin}%
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card mb-6" style={{ padding: '14px 18px' }}>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-muted" style={{ fontSize: 13, fontWeight: 600 }}>
            <Filter size={16} /> Lọc theo:
          </div>

          <div style={{ flex: 1, minWidth: 200 }}>
            <select
              className="form-select"
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
            >
              <option value="ALL">📁 Tất cả Dự án ({projects.length})</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  📁 {p.code} — {p.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ width: 180 }}>
            <select
              className="form-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="ALL">🏷️ Tất cả Phân loại</option>
              <option value="Vật tư mua ngoài">📦 Vật tư mua ngoài</option>
              <option value="Vận chuyển">🚚 Vận chuyển & Giao hàng</option>
              <option value="Nhân công ngoài">👷 Nhân công ngoài / Thợ phụ</option>
              <option value="Máy móc">⚙️ Thuê máy móc / Thiết bị</option>
              <option value="Khác">💡 Chi phí khác</option>
            </select>
          </div>
        </div>
      </div>

      {/* Cost Table */}
      <div className="card">
        <div className="card-header flex justify-between items-center">
          <div className="card-title flex items-center gap-2">
            <FileSpreadsheet size={18} className="text-primary" />
            Danh sách Chi phí Phát sinh ({filteredCosts.length})
          </div>
        </div>

        {loading ? (
          <div className="p-6 text-center text-muted">Đang tải dữ liệu chi phí...</div>
        ) : filteredCosts.length === 0 ? (
          <div className="empty-state">
            <DollarSign size={40} className="text-muted mb-2" />
            <p>Chưa có khoản chi phí nào được ghi nhận.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Ngày Chi</th>
                  <th>Dự Án</th>
                  <th>Nội Dung Chi Phi</th>
                  <th>Phân Loại</th>
                  <th style={{ textAlign: 'right' }}>Số Tiền (VNĐ)</th>
                  <th>Ghi Chú</th>
                  <th style={{ width: 80, textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredCosts.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontSize: 13, whiteSpace: 'nowrap' }}>{c.costDate}</td>
                    <td>
                      <span className="badge badge-info">{c.projectCode}</span>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#E2E8F0', marginTop: 2 }}>
                        {c.projectName}
                      </div>
                    </td>
                    <td style={{ fontWeight: 600 }}>{c.title}</td>
                    <td>
                      <span className="badge badge-secondary">{c.category}</span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#EF4444', fontSize: 14 }}>
                      {formatVND(c.amount)}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{c.notes || '—'}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDeleteCost(c.id, c.title)}
                        title="Xóa khoản chi"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Cost Modal */}
      {showAddModal && (
        <div className="modal-backdrop">
          <div className="modal" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <div className="modal-title">Ghi nhận Chi phí phát sinh mới</div>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>×</button>
            </div>

            <form onSubmit={handleCreateCost} className="modal-body">
              <div className="form-group mb-4">
                <label className="form-label">Chọn Dự án *</label>
                <select
                  className="form-select"
                  value={formData.projectId}
                  onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                  required
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      📁 {p.code} — {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group mb-4">
                <label className="form-label">Nội dung chi phí *</label>
                <input
                  className="form-input"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="vd: Mua keo 502 & đinh cuộn thi công"
                  required
                />
              </div>

              <div className="grid-2 mb-4">
                <div className="form-group">
                  <label className="form-label">Số tiền (VNĐ) *</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="vd: 500000"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Phân loại chi phí</label>
                  <select
                    className="form-select"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    <option value="Vật tư mua ngoài">📦 Vật tư mua ngoài</option>
                    <option value="Vận chuyển">🚚 Vận chuyển & Giao hàng</option>
                    <option value="Nhân công ngoài">👷 Nhân công ngoài / Thợ phụ</option>
                    <option value="Máy móc">⚙️ Thuê máy móc / Thiết bị</option>
                    <option value="Khác">💡 Chi phí khác</option>
                  </select>
                </div>
              </div>

              <div className="form-group mb-4">
                <label className="form-label">Ngày chi phát sinh *</label>
                <input
                  type="date"
                  className="form-input"
                  value={formData.costDate}
                  onChange={(e) => setFormData({ ...formData, costDate: e.target.value })}
                  required
                />
              </div>

              <div className="form-group mb-4">
                <label className="form-label">Ghi chú thêm</label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Người chi, hóa đơn đính kèm..."
                />
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAddModal(false)}
                  disabled={submitting}
                >
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <span className="spinner" /> : <Plus size={16} />}
                  Lưu Khoản Chi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
