'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Briefcase, Search, Plus, MoreHorizontal, User, DollarSign, Calendar, ChevronRight } from 'lucide-react';

interface Opportunity {
  id: number;
  code?: string;
  name: string;
  customerId: number;
  estimatedValue: number;
  probability: number;
  status: string;
  projectType?: string;
  expectedCloseDate?: string;
  createdAt?: string;
}

const STAGES = [
  { id: 'NEW', label: 'Tiếp nhận / Mới', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { id: 'SURVEY', label: 'Đang Khảo sát', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  { id: 'REQUIREMENT', label: 'Phân tích Yêu cầu', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { id: 'DESIGN', label: 'Lên Thiết kế', color: 'bg-pink-100 text-pink-800 border-pink-200' },
  { id: 'BOQ', label: 'Bóc tách BOQ', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  { id: 'QUOTATION', label: 'Gửi Báo giá', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  { id: 'NEGOTIATION', label: 'Đàm phán', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  { id: 'WON', label: 'Chốt (Won)', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  { id: 'LOST', label: 'Thất bại (Lost)', color: 'bg-red-100 text-red-800 border-red-200' },
];

export default function OpportunitiesPage() {
  const [data, setData] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch('/api/crm/opportunities');
      const json = await res.json();
      if (Array.isArray(json)) setData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const filteredData = data.filter(d => d.name.toLowerCase().includes(search.toLowerCase()) || (d.code && d.code.toLowerCase().includes(search.toLowerCase())));

  return (
    <div className="page-container flex flex-col h-screen" style={{ height: 'calc(100vh - 64px)' }}>
      {/* Header */}
      <div className="flex-none p-6 border-b border-gray-100 bg-white">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Briefcase className="text-primary" size={24} />
              Quản lý Cơ hội / Pipeline
            </h1>
            <p className="text-sm text-gray-500 mt-1">Theo dõi tiến trình các dự án tiềm năng từ Tiếp nhận đến Ký hợp đồng.</p>
          </div>
          <div className="flex gap-2">
            <div className="flex bg-gray-100 p-1 rounded-lg">
              <button 
                onClick={() => setViewMode('kanban')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'kanban' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Kanban
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
              >
                List
              </button>
            </div>
            <button className="btn btn-primary flex items-center gap-2">
              <Plus size={16} /> Thêm Cơ hội mới
            </button>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Tìm theo tên hoặc mã cơ hội..." 
              className="form-input pl-10 w-full" 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
            />
          </div>
          <div className="text-sm text-gray-500">
            Tổng: <span className="font-bold text-gray-800">{filteredData.length}</span> cơ hội
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden p-6 bg-gray-50/50">
        {loading ? (
          <div className="h-full flex items-center justify-center text-gray-500">Đang tải dữ liệu pipeline...</div>
        ) : viewMode === 'kanban' ? (
          <div className="h-full flex gap-4 overflow-x-auto pb-4 snap-x">
            {STAGES.map(stage => {
              const stageOpps = filteredData.filter(o => (o.status || 'NEW') === stage.id);
              const totalVal = stageOpps.reduce((acc, o) => acc + (Number(o.estimatedValue) || 0), 0);
              
              return (
                <div key={stage.id} className="flex-none w-80 flex flex-col bg-gray-50/80 rounded-xl border border-gray-100 max-h-full snap-start">
                  <div className={`p-3 border-b-2 ${stage.color.split(' ')[2]} flex justify-between items-center rounded-t-xl bg-white`}>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${stage.color}`}>{stageOpps.length}</span>
                      <h3 className="font-bold text-sm text-gray-800">{stage.label}</h3>
                    </div>
                  </div>
                  <div className="px-4 py-2 bg-white/50 border-b border-gray-100 text-xs text-gray-500 font-medium">
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalVal)}
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-3 space-y-3">
                    {stageOpps.map(opp => (
                      <Link href={`/crm/opportunities/${opp.id}`} key={opp.id} className="block bg-white p-3 rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-primary/30 transition-all cursor-pointer group">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold text-gray-800 text-sm group-hover:text-primary transition-colors line-clamp-2">{opp.name}</h4>
                          <button className="text-gray-400 hover:text-gray-600"><MoreHorizontal size={16}/></button>
                        </div>
                        {opp.code && <div className="text-xs text-gray-400 mb-2 font-mono">{opp.code}</div>}
                        
                        <div className="space-y-1.5 mb-3">
                          <div className="flex items-center gap-1.5 text-xs text-gray-600">
                            <User size={12} className="text-gray-400"/> KH-{opp.customerId}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                            <DollarSign size={12} className="text-emerald-500"/> 
                            {new Intl.NumberFormat('vi-VN', { notation: "compact", compactDisplay: "short" }).format(opp.estimatedValue || 0)} 
                          </div>
                        </div>

                        <div className="pt-2 border-t border-gray-100 flex justify-between items-center text-xs">
                          <span className="text-gray-500 flex items-center gap-1">
                            <Calendar size={12}/> {opp.expectedCloseDate ? new Date(opp.expectedCloseDate).toLocaleDateString('vi-VN') : '—'}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded font-medium ${opp.probability >= 50 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                            {opp.probability || 0}%
                          </span>
                        </div>
                      </Link>
                    ))}
                    {stageOpps.length === 0 && (
                      <div className="p-4 text-center text-xs text-gray-400 border border-dashed border-gray-200 rounded-lg">Trống</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden h-full flex flex-col">
            <div className="overflow-x-auto flex-1">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100 sticky top-0">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Mã</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Tên cơ hội</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Khách hàng</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Giá trị dự kiến</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Giai đoạn</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Dự kiến chốt</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((item) => (
                    <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 text-sm font-mono text-gray-500">{item.code || `OPP-${item.id}`}</td>
                      <td className="py-3 px-4 font-medium text-gray-800">
                        <Link href={`/crm/opportunities/${item.id}`} className="hover:text-primary transition-colors">{item.name}</Link>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">ID: {item.customerId}</td>
                      <td className="py-3 px-4 font-medium text-emerald-600">
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.estimatedValue || 0)}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${STAGES.find(s => s.id === item.status)?.color || 'bg-gray-100'}`}>
                          {STAGES.find(s => s.id === item.status)?.label || item.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500">
                        {item.expectedCloseDate ? new Date(item.expectedCloseDate).toLocaleDateString('vi-VN') : '—'}
                      </td>
                    </tr>
                  ))}
                  {filteredData.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-8 text-gray-500">Không có dữ liệu</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
