'use client';

import { useState, useEffect } from 'react';
import { FileCheck, Search, Plus, Trash2 } from 'lucide-react';

interface ContractItem {
  id: number;
  contractNumber: string;
  customerId: number;
  totalAmount: number;
  status: string;
  createdAt?: string;
}

export default function Page() {
  const [data, setData] = useState<ContractItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
  "contractNumber": "",
  "customerId": 0,
  "totalAmount": 0,
  "status": "DRAFT"
});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch('/api/crm/contracts');
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
      const res = await fetch('/api/crm/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setShowAddModal(false);
        setFormData({"contractNumber":"","customerId":0,"totalAmount":0,"status":"DRAFT"});
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
      const res = await fetch(`/api/crm/contracts/${id}`, { method: 'DELETE' });
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
            <FileCheck className="text-primary" size={24} />
            Quản lý Hợp đồng (Contracts)
          </h1>
          <p className="page-subtitle">Các hợp đồng đã ký kết.</p>
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
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Mã Hợp Đồng</th><th className="text-left py-3 px-4 text-sm font-medium text-gray-500">ID Khách hàng</th><th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Tổng tiền</th><th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Trạng thái</th>
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
                    <td className="py-3 px-4">{item.contractNumber}</td><td className="py-3 px-4">{Number(item.customerId).toLocaleString()}</td><td className="py-3 px-4">{Number(item.totalAmount).toLocaleString()}</td><td className="py-3 px-4"><span className="badge badge-primary">{item.status}</span></td>
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
                <label className="block text-sm font-medium mb-1">Mã Hợp Đồng</label>
                <input type="text" className="form-input w-full" value={formData.contractNumber as any} onChange={e => setFormData({...formData, contractNumber: e.target.value})} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">ID Khách hàng</label>
                <input type="number" className="form-input w-full" value={formData.customerId as any} onChange={e => setFormData({...formData, customerId: Number(e.target.value)})} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tổng tiền</label>
                <input type="number" className="form-input w-full" value={formData.totalAmount as any} onChange={e => setFormData({...formData, totalAmount: Number(e.target.value)})} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Trạng thái</label>
                <select className="form-input w-full" value={formData.status as string} onChange={e => setFormData({...formData, status: e.target.value})}>
                  <option value="DRAFT">DRAFT</option><option value="SIGNED">SIGNED</option><option value="IN_PROGRESS">IN_PROGRESS</option><option value="COMPLETED">COMPLETED</option><option value="CANCELLED">CANCELLED</option>
                </select>
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
