'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Briefcase, Calendar, User, CheckCircle2, ChevronRight, DollarSign, Clock, FileText, Settings, XCircle } from 'lucide-react';

const STAGES = [
  { id: 'NEW', label: 'Mới' },
  { id: 'SURVEY', label: 'Khảo sát' },
  { id: 'REQUIREMENT', label: 'Yêu cầu' },
  { id: 'DESIGN', label: 'Thiết kế' },
  { id: 'BOQ', label: 'BOQ' },
  { id: 'QUOTATION', label: 'Báo giá' },
  { id: 'NEGOTIATION', label: 'Đàm phán' },
];

export default function OpportunityDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [opp, setOpp] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/crm/opportunities/${id}`);
        const json = await res.json();
        if (json.success) setOpp(json.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  async function updateStage(newStage: string) {
    try {
      setOpp({ ...opp, status: newStage });
      await fetch(`/api/crm/opportunities/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStage })
      });
    } catch (err) {
      console.error(err);
    }
  }

  if (loading) return <div className="page-container p-8 text-center text-gray-500">Đang tải chi tiết cơ hội...</div>;
  if (!opp) return <div className="page-container p-8 text-center text-red-500">Không tìm thấy Cơ hội này.</div>;

  const currentStageIndex = STAGES.findIndex(s => s.id === opp.status);
  const isWon = opp.status === 'WON';
  const isLost = opp.status === 'LOST';

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            {opp.name} 
            {isWon && <span className="badge bg-emerald-100 text-emerald-800 border-emerald-200">WON (Thắng)</span>}
            {isLost && <span className="badge bg-red-100 text-red-800 border-red-200">LOST (Thua)</span>}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Mã: <span className="font-mono text-gray-400">{opp.code || `OPP-${opp.id}`}</span> | 
            Khách hàng: <span className="font-medium text-primary cursor-pointer hover:underline">KH-{opp.customerId}</span>
          </p>
        </div>
      </div>

      {/* Pipeline Stepper */}
      <div className="card p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-800">Tiến trình (Pipeline)</h3>
          {!(isWon || isLost) && (
            <div className="flex gap-2">
              <button onClick={() => updateStage('LOST')} className="btn btn-sm btn-danger">Đánh dấu LOST</button>
              <button onClick={() => updateStage('WON')} className="btn btn-sm btn-success">Đánh dấu WON</button>
            </div>
          )}
        </div>
        
        <div className="relative">
          <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-100">
            {STAGES.map((s, idx) => (
              <div 
                key={s.id}
                style={{ width: `${100 / STAGES.length}%` }} 
                className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${
                  isWon ? 'bg-emerald-500' :
                  isLost ? 'bg-red-500' :
                  idx <= currentStageIndex ? 'bg-primary' : 'bg-transparent'
                } border-r border-white/20`}
              ></div>
            ))}
          </div>
          
          <div className="flex justify-between text-xs font-medium text-gray-400">
            {STAGES.map((s, idx) => (
              <div 
                key={s.id} 
                className={`text-center w-full cursor-pointer transition-colors hover:text-primary ${
                  isWon ? 'text-emerald-600 font-bold' :
                  isLost ? 'text-red-600 font-bold' :
                  idx === currentStageIndex ? 'text-primary font-bold' : 
                  idx < currentStageIndex ? 'text-gray-600' : ''
                }`}
                onClick={() => !(isWon||isLost) && updateStage(s.id)}
              >
                {s.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Briefcase size={18}/> Thông tin Dự án / Cơ hội</h3>
            <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
              <div>
                <p className="text-gray-500 mb-1">Loại công trình</p>
                <p className="font-medium text-gray-800">{opp.projectType || '—'}</p>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Diện tích (m2)</p>
                <p className="font-medium text-gray-800">{opp.area || '—'}</p>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Ngân sách dự kiến</p>
                <p className="font-medium text-gray-800">{opp.budget ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(opp.budget) : '—'}</p>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Địa điểm</p>
                <p className="font-medium text-gray-800">{opp.location || '—'}</p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Settings size={18}/> Liên kết dữ liệu (Modules)</h3>
            <div className="grid grid-cols-3 gap-4">
              <button className="p-4 border border-gray-100 rounded-xl bg-gray-50 hover:border-primary/50 hover:bg-blue-50 transition-colors text-center group">
                <FileText className="mx-auto mb-2 text-gray-400 group-hover:text-primary transition-colors" size={24} />
                <span className="text-sm font-medium text-gray-700 group-hover:text-primary">Khảo sát & Thiết kế</span>
              </button>
              <button className="p-4 border border-gray-100 rounded-xl bg-gray-50 hover:border-primary/50 hover:bg-blue-50 transition-colors text-center group">
                <DollarSign className="mx-auto mb-2 text-gray-400 group-hover:text-primary transition-colors" size={24} />
                <span className="text-sm font-medium text-gray-700 group-hover:text-primary">Báo giá (Quotes)</span>
              </button>
              <button className="p-4 border border-gray-100 rounded-xl bg-gray-50 hover:border-primary/50 hover:bg-blue-50 transition-colors text-center group">
                <CheckCircle2 className="mx-auto mb-2 text-gray-400 group-hover:text-primary transition-colors" size={24} />
                <span className="text-sm font-medium text-gray-700 group-hover:text-primary">Hợp đồng</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Col */}
        <div className="lg:col-span-1 space-y-6">
          <div className="card p-5 bg-gradient-to-br from-indigo-50 to-blue-50 border-blue-100">
            <h3 className="font-bold text-gray-800 mb-4 text-sm uppercase tracking-wider">Trị giá kỳ vọng</h3>
            <div className="text-3xl font-bold text-primary mb-2">
              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(opp.estimatedValue || 0)}
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Xác suất thành công:</span>
              <span className={`font-bold ${opp.probability >= 50 ? 'text-green-600' : 'text-amber-600'}`}>{opp.probability || 0}%</span>
            </div>
            <div className="mt-4 pt-4 border-t border-blue-200/50 flex items-center gap-2 text-sm text-gray-600">
              <Calendar size={14} className="text-blue-500"/> Dự kiến chốt: <span className="font-medium text-gray-800">{opp.expectedCloseDate ? new Date(opp.expectedCloseDate).toLocaleDateString('vi-VN') : '—'}</span>
            </div>
          </div>

          <div className="card p-5">
            <h3 className="font-bold text-gray-800 mb-4 text-sm uppercase tracking-wider">Thông tin thêm</h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-gray-500 mb-1">Người phụ trách (Sales)</p>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs"><User size={12}/></div>
                  <span className="font-medium text-gray-800">User-{opp.assignedTo || 'Chưa gán'}</span>
                </div>
              </div>
              <div>
                <p className="text-gray-500 mb-1 mt-3">Đối thủ cạnh tranh</p>
                <p className="font-medium text-gray-800">{opp.competitors || '—'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
