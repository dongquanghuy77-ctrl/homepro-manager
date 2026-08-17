'use client';

import { useState, useEffect } from 'react';
import { UserPlus, Search, Plus, Trash2, LayoutGrid, List } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface LeadItem {
  id: number;
  code?: string;
  name: string;
  company?: string;
  phone?: string;
  email?: string;
  address?: string;
  region?: string;
  source?: string;
  type?: string;
  status: string;
  potentialLevel?: string;
  estimatedValue?: number;
  assignedTo?: number;
  notes?: string;
  followUpDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

const STATUSES = ['NEW', 'CONTACTED', 'QUALIFIED', 'UNQUALIFIED', 'CONVERTED', 'LOST'];

export default function Page() {
  const router = useRouter();
  const [data, setData] = useState<LeadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'LIST' | 'KANBAN'>('KANBAN');
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState<Partial<LeadItem>>({
    name: "",
    phone: "",
    email: "",
    company: "",
    source: "",
    status: "NEW",
    type: "",
    potentialLevel: "",
    estimatedValue: 0
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch('/api/crm/leads');
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
      const res = await fetch('/api/crm/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setShowAddModal(false);
        setFormData({ name: "", phone: "", email: "", company: "", source: "", status: "NEW", type: "", potentialLevel: "", estimatedValue: 0 });
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
      const res = await fetch(`/api/crm/leads/${id}`, { method: 'DELETE' });
      if (res.ok) loadData();
    } catch (err) {
      console.error(err);
    }
  }

  const filteredData = data.filter(item => 
    item.name?.toLowerCase().includes(search.toLowerCase()) || 
    item.phone?.includes(search) ||
    item.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <UserPlus className="text-primary" size={24} />
            Quản lý Khách hàng tiềm năng (Leads)
          </h1>
          <p className="page-subtitle">Danh sách các khách hàng tiềm năng thu thập từ nhiều nguồn.</p>
        </div>
        <button className="btn btn-primary flex items-center gap-2" onClick={() => setShowAddModal(true)}>
          <Plus size={20} /> Thêm mới
        </button>
      </div>

      <div className="flex gap-2 mb-4 bg-white p-2 rounded-lg shadow-sm border border-gray-100 w-fit">
        <button 
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors ${viewMode === 'LIST' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          onClick={() => setViewMode('LIST')}
        >
          <List size={18} /> Danh sách
        </button>
        <button 
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors ${viewMode === 'KANBAN' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          onClick={() => setViewMode('KANBAN')}
        >
          <LayoutGrid size={18} /> Kanban
        </button>
      </div>

      <div className="card mb-6">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input type="text" placeholder="Tìm kiếm..." className="form-input pl-10 w-full" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Đang tải...</div>
      ) : viewMode === 'LIST' ? (
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Họ tên</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Điện thoại</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Email</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Công ty</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Nguồn</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Trạng thái</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-gray-500">Không có dữ liệu</td></tr>
              ) : (
                filteredData.map((item) => (
                  <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4">
                      <Link href={`/crm/leads/${item.id}`} className="text-primary font-medium hover:underline">
                        {item.name}
                      </Link>
                    </td>
                    <td className="py-3 px-4">{item.phone}</td>
                    <td className="py-3 px-4">{item.email}</td>
                    <td className="py-3 px-4">{item.company}</td>
                    <td className="py-3 px-4">{item.source}</td>
                    <td className="py-3 px-4"><span className="badge badge-primary">{item.status}</span></td>
                    <td className="py-3 px-4 text-right flex justify-end gap-2">
                      <button onClick={() => handleDelete(item.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={18} /></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-280px)]">
          {STATUSES.map(status => {
            const columnLeads = filteredData.filter(l => l.status === status);
            return (
              <div key={status} className="flex-shrink-0 w-80 bg-gray-50 rounded-lg border border-gray-200 flex flex-col max-h-full">
                <div className="p-3 border-b border-gray-200 flex justify-between items-center bg-gray-100 rounded-t-lg">
                  <h3 className="font-semibold text-gray-700">{status}</h3>
                  <span className="bg-gray-200 text-gray-700 text-xs font-bold px-2 py-1 rounded-full">{columnLeads.length}</span>
                </div>
                <div className="p-2 flex-1 overflow-y-auto space-y-2">
                  {columnLeads.map(lead => (
                    <div 
                      key={lead.id} 
                      className="bg-white p-3 rounded shadow-sm border border-gray-200 cursor-pointer hover:border-primary transition-colors"
                      onClick={() => router.push(`/crm/leads/${lead.id}`)}
                    >
                      <h4 className="font-medium text-gray-800">{lead.name}</h4>
                      {lead.company && <p className="text-sm text-gray-500 mt-1">{lead.company}</p>}
                      {lead.phone && <p className="text-xs text-gray-400 mt-2">{lead.phone}</p>}
                      <div className="flex justify-between items-center mt-3">
                        <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded">{lead.source || 'N/A'}</span>
                        {lead.estimatedValue ? <span className="text-xs font-semibold text-green-600">{lead.estimatedValue.toLocaleString()}đ</span> : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 md:p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-800">Thêm Lead mới</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">×</button>
            </div>
            <div className="p-4 md:p-6 overflow-y-auto flex-1">
              <form id="add-form" onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-medium mb-1">Họ tên *</label>
                  <input type="text" className="form-input w-full" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} required />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-medium mb-1">Điện thoại</label>
                  <input type="text" className="form-input w-full" value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input type="email" className="form-input w-full" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-medium mb-1">Công ty</label>
                  <input type="text" className="form-input w-full" value={formData.company || ''} onChange={e => setFormData({...formData, company: e.target.value})} />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-medium mb-1">Nguồn (Source)</label>
                  <input type="text" className="form-input w-full" placeholder="VD: Website, Facebook..." value={formData.source || ''} onChange={e => setFormData({...formData, source: e.target.value})} />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-medium mb-1">Trạng thái</label>
                  <select className="form-input w-full" value={formData.status || 'NEW'} onChange={e => setFormData({...formData, status: e.target.value})}>
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-medium mb-1">Loại (Type)</label>
                  <input type="text" className="form-input w-full" value={formData.type || ''} onChange={e => setFormData({...formData, type: e.target.value})} />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-medium mb-1">Mức độ tiềm năng (Level)</label>
                  <select className="form-input w-full" value={formData.potentialLevel || ''} onChange={e => setFormData({...formData, potentialLevel: e.target.value})}>
                    <option value="">-- Chọn --</option>
                    <option value="LOW">Thấp</option>
                    <option value="MEDIUM">Trung bình</option>
                    <option value="HIGH">Cao</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Giá trị dự kiến (VNĐ)</label>
                  <input type="number" className="form-input w-full" value={formData.estimatedValue || 0} onChange={e => setFormData({...formData, estimatedValue: parseFloat(e.target.value)})} />
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
