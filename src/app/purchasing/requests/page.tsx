'use client';

import { useState, useEffect } from 'react';
import { FileText, Search, Plus, Trash2 } from 'lucide-react';

interface PurchaseRequest {
  id: number;
  prNumber: string;
  projectId: number;
  requestDate: string;
  requiredDate: string;
  status: string;
  notes: string;
  createdAt?: string;
}

export default function Page() {
  const [data, setData] = useState<PurchaseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
  "prNumber": "",
  "projectId": 0,
  "requestDate": "",
  "requiredDate": "",
  "status": "DRAFT",
  "notes": ""
});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch('/api/purchasing/purchase_requests');
      const json = await res.json();
      if (Array.isArray(json)) setData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/purchasing/purchase_requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setShowAddModal(false);
        setFormData({"prNumber":"","projectId":0,"requestDate":"","requiredDate":"","status":"DRAFT","notes":""});
        loadData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Bạn có chắc muốn xoá?')) return;
    try {
      const res = await fetch(`/api/purchasing/purchase_requests/${id}`, { method: 'DELETE' });
      if (res.ok) loadData();
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <FileText className="text-primary" size={24} />
            Yêu cầu mua hàng (PR)
          </h1>
          <p className="page-subtitle">Quản lý yêu cầu mua vật tư từ xưởng và các bộ phận.</p>
        </div>
        <button className="btn btn-primary flex items-center gap-2" onClick={() => setShowAddModal(true)}>
          <Plus size={20} /> Thêm mới
        </button>
      </div>

      <div className="card">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input type="text" placeholder="Tìm kiếm..." className="form-input pl-10 w-full" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Mã PR</th><th className="text-left py-3 px-4 text-sm font-medium text-gray-500">ID Dự án</th><th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Ngày yêu cầu</th><th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Ngày cần hàng</th><th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Trạng thái</th><th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Ghi chú</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="text-center py-8 text-gray-500">Đang tải...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-8 text-gray-500">Không có dữ liệu</td></tr>
              ) : (
                data.map((item) => (
                  <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4">{item.prNumber}</td><td className="py-3 px-4">{Number(item.projectId).toLocaleString()}</td><td className="py-3 px-4">{item.requestDate}</td><td className="py-3 px-4">{item.requiredDate}</td><td className="py-3 px-4"><span className="badge badge-primary">{item.status}</span></td><td className="py-3 px-4">{item.notes}</td>
                    <td className="py-3 px-4 text-right">
                      <button onClick={() => handleDelete(item.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={18} /></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 md:p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-800">Thêm mới</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">×</button>
            </div>
            <div className="p-4 md:p-6 overflow-y-auto flex-1">
              <form id="add-form" onSubmit={handleCreate} className="space-y-4">
                
              <div>
                <label className="block text-sm font-medium mb-1">Mã PR</label>
                <input type="text" className="form-input w-full" value={formData.prNumber as any} onChange={e => setFormData({...formData, prNumber: e.target.value})} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">ID Dự án</label>
                <input type="number" className="form-input w-full" value={formData.projectId as any} onChange={e => setFormData({...formData, projectId: Number(e.target.value)})} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Ngày yêu cầu</label>
                <input type="text" className="form-input w-full" value={formData.requestDate as any} onChange={e => setFormData({...formData, requestDate: e.target.value})} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Ngày cần hàng</label>
                <input type="text" className="form-input w-full" value={formData.requiredDate as any} onChange={e => setFormData({...formData, requiredDate: e.target.value})} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Trạng thái</label>
                <select className="form-input w-full" value={formData.status as string} onChange={e => setFormData({...formData, status: e.target.value})}>
                  <option value="DRAFT">DRAFT</option><option value="SUBMITTED">SUBMITTED</option><option value="APPROVED">APPROVED</option><option value="REJECTED">REJECTED</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Ghi chú</label>
                <input type="text" className="form-input w-full" value={formData.notes as any} onChange={e => setFormData({...formData, notes: e.target.value})} required />
              </div>
              </form>
            </div>
            <div className="p-4 md:p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
              <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary">Hủy</button>
              <button type="submit" form="add-form" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Đang lưu...' : 'Lưu lại'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
