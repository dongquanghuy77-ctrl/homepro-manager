'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FileText, Search, Plus, Trash2, Edit2, Download, Eye, DollarSign } from 'lucide-react';

interface QuoteItem {
  id: number;
  quoteNumber: string;
  version: number;
  customerId: number;
  opportunityId?: number;
  totalAmount: number;
  costAmount: number;
  margin: number;
  status: string;
  validUntil?: string;
  createdAt?: string;
}

const STATUS_COLORS: Record<string, string> = {
  'DRAFT': 'bg-gray-100 text-gray-700 border-gray-200',
  'INTERNAL_REVIEW': 'bg-purple-100 text-purple-700 border-purple-200',
  'SENT': 'bg-blue-100 text-blue-700 border-blue-200',
  'NEGOTIATING': 'bg-amber-100 text-amber-700 border-amber-200',
  'ACCEPTED': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'REJECTED': 'bg-red-100 text-red-700 border-red-200',
  'EXPIRED': 'bg-gray-200 text-gray-500 border-gray-300',
};

const STATUS_LABELS: Record<string, string> = {
  'DRAFT': 'Nháp',
  'INTERNAL_REVIEW': 'Chờ duyệt nội bộ',
  'SENT': 'Đã gửi khách',
  'NEGOTIATING': 'Đang thương lượng',
  'ACCEPTED': 'Đã chốt (Win)',
  'REJECTED': 'Từ chối (Loss)',
  'EXPIRED': 'Hết hạn',
};

export default function QuotesPage() {
  const [data, setData] = useState<QuoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch('/api/crm/quotes');
      const json = await res.json();
      if (Array.isArray(json)) setData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Bạn có chắc muốn xoá báo giá này?')) return;
    try {
      const res = await fetch(`/api/crm/quotes/${id}`, { method: 'DELETE' });
      if (res.ok) loadData();
    } catch (err) {
      console.error(err);
    }
  }

  const filtered = data.filter(q => q.quoteNumber.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <FileText className="text-primary" size={24} />
            Quản lý Báo giá (Quotations)
          </h1>
          <p className="page-subtitle">Quản lý và theo dõi các bản báo giá dự án, nội thất gửi cho khách hàng.</p>
        </div>
        <button className="btn btn-primary flex items-center gap-2">
          <Plus size={20} /> Tạo Báo giá mới
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="card p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium">Tổng số Báo giá</p>
            <p className="text-2xl font-bold text-gray-800">{data.length}</p>
          </div>
          <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center">
            <FileText size={20} />
          </div>
        </div>
        <div className="card p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium">Đã gửi / Chờ chốt</p>
            <p className="text-2xl font-bold text-amber-600">
              {data.filter(q => ['SENT', 'NEGOTIATING'].includes(q.status)).length}
            </p>
          </div>
          <div className="w-10 h-10 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center">
            <DollarSign size={20} />
          </div>
        </div>
        <div className="card p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium">Đã chốt (Accepted)</p>
            <p className="text-2xl font-bold text-emerald-600">
              {data.filter(q => q.status === 'ACCEPTED').length}
            </p>
          </div>
          <div className="w-10 h-10 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center">
            <FileText size={20} />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input type="text" placeholder="Tìm theo mã báo giá..." className="form-input pl-10 w-full bg-white" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white border-b border-gray-200 shadow-sm">
              <tr>
                <th className="text-left py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Mã Báo Giá</th>
                <th className="text-left py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Khách hàng</th>
                <th className="text-right py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tổng giá trị</th>
                <th className="text-right py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Biên lợi nhuận</th>
                <th className="text-center py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Trạng thái</th>
                <th className="text-center py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Hiệu lực đến</th>
                <th className="text-right py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-500">Đang tải danh sách báo giá...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-500">Không tìm thấy báo giá nào</td></tr>
              ) : (
                filtered.map((item) => {
                  const marginPct = item.totalAmount > 0 ? (item.margin / item.totalAmount) * 100 : 0;
                  return (
                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="py-3 px-4">
                        <Link href={`/crm/quotes/${item.id}`} className="font-semibold text-primary hover:underline flex items-center gap-2">
                          {item.quoteNumber} <span className="text-xs font-normal text-gray-400 bg-gray-100 px-1.5 rounded">v{item.version}</span>
                        </Link>
                      </td>
                      <td className="py-3 px-4">
                        <Link href={`/crm/customers/${item.customerId}`} className="text-sm font-medium text-gray-700 hover:text-primary">
                          KH-{item.customerId}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-bold text-gray-800">
                          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.totalAmount)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex flex-col items-end">
                          <span className="text-sm font-medium text-gray-600">
                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.margin)}
                          </span>
                          <span className={`text-xs ${marginPct >= 20 ? 'text-green-600' : marginPct > 10 ? 'text-amber-500' : 'text-red-500'}`}>
                            {marginPct.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2.5 py-1 text-xs font-medium border rounded-full ${STATUS_COLORS[item.status] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                          {STATUS_LABELS[item.status] || item.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center text-sm text-gray-500">
                        {item.validUntil ? new Date(item.validUntil).toLocaleDateString('vi-VN') : '—'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link href={`/crm/quotes/${item.id}`} className="p-2 text-gray-400 hover:text-primary hover:bg-blue-50 rounded-lg transition-colors">
                            <Eye size={18} />
                          </Link>
                          <button className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                            <Download size={18} />
                          </button>
                          <button onClick={() => handleDelete(item.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
