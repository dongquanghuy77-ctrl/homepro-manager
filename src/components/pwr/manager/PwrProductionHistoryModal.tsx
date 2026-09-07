'use client';
import { useState, useEffect } from 'react';
import { X, Clock, Loader2, RotateCcw, Filter } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onRefreshTasks: () => void;
}

const STATIONS = [
  { id: '', name: 'Tất cả trạm máy' },
  { id: 'CNC', name: 'Máy CNC' },
  { id: 'DAN_CANH', name: 'Máy Dán Cạnh' },
  { id: 'KHOAN_CAM', name: 'Máy Khoan Cam' },
  { id: 'DONG_GOI', name: 'Đóng Gói' },
];

export default function PwrProductionHistoryModal({ isOpen, onClose, onRefreshTasks }: Props) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [stationFilter, setStationFilter] = useState('');

  const fetchHistory = async () => {
    setLoading(true);
    let url = '/api/pwr/tasks/history?type=production';
    if (stationFilter) url += `&stationTeam=${stationFilter}`;
    try {
      const res = await fetch(url);
      const d = await res.json();
      setTasks(d.tasks || []);
      setTotal(d.total || 0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen, stationFilter]);

  const handleReopen = async (taskId: number) => {
    if (!confirm('Khôi phục công việc này về trạng thái "Cần làm"?')) return;
    try {
      await fetch(`/api/pwr/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'TODO' })
      });
      setTasks(tasks.filter(t => t.id !== taskId));
      onRefreshTasks();
    } catch (e) {
      alert('Lỗi khi khôi phục');
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', zIndex:999, backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ background:'#1e293b', width:900, maxWidth:'95%', maxHeight:'85vh', borderRadius:16, border:'1px solid rgba(255,255,255,0.1)', display:'flex', flexDirection:'column', boxShadow:'0 25px 50px -12px rgba(0,0,0,0.5)', animation:'fadein 0.2s' }}>
        
        {/* Header */}
        <div style={{ padding: 24, borderBottom:'1px solid rgba(255,255,255,0.1)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <h2 style={{ margin:0, color:'#fff', fontSize:20, display:'flex', alignItems:'center', gap:10 }}>
              <Clock size={24} color="#a855f7"/> Lịch Sử Điều Phối Sản Xuất
            </h2>
            <p style={{ margin:'6px 0 0', color:'#94a3b8', fontSize:13 }}>
              Danh sách {total} công việc đã hoàn thành/đã hủy trước ngày hôm nay
            </p>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'#94a3b8', cursor:'pointer' }}>
            <X size={24}/>
          </button>
        </div>

        {/* Filters */}
        <div style={{ padding: '16px 24px', background:'rgba(0,0,0,0.2)', borderBottom:'1px solid rgba(255,255,255,0.05)', display:'flex', gap:16, alignItems:'center' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, color:'#94a3b8', fontSize:13 }}>
            <Filter size={16}/> Lọc theo trạm:
          </div>
          <select 
            value={stationFilter}
            onChange={e => setStationFilter(e.target.value)}
            style={{ background:'#0f172a', border:'1px solid rgba(255,255,255,0.2)', color:'#e2e8f0', padding:'8px 12px', borderRadius:8, fontSize:13, outline:'none' }}
          >
            {STATIONS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        {/* Table/List */}
        <div style={{ flex:1, overflowY:'auto', padding: 24 }}>
          {loading ? (
            <div style={{ textAlign:'center', color:'#94a3b8', padding: 40 }}><Loader2 className="pwr-spin" size={32}/></div>
          ) : tasks.length === 0 ? (
            <div style={{ textAlign:'center', color:'#64748b', padding: 40 }}>Không có dữ liệu lịch sử.</div>
          ) : (
            <table style={{ width:'100%', borderCollapse:'collapse', textAlign:'left', color:'#e2e8f0', fontSize:13 }}>
              <thead>
                <tr style={{ borderBottom:'1px solid rgba(255,255,255,0.1)', color:'#94a3b8' }}>
                  <th style={{ paddingBottom:12, fontWeight:600 }}>TÊN CÔNG VIỆC</th>
                  <th style={{ paddingBottom:12, fontWeight:600 }}>TRẠM/TỔ</th>
                  <th style={{ paddingBottom:12, fontWeight:600 }}>TRẠNG THÁI</th>
                  <th style={{ paddingBottom:12, fontWeight:600 }}>NGÀY LƯU</th>
                  <th style={{ paddingBottom:12, fontWeight:600, textAlign:'right' }}>THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map(t => (
                  <tr key={t.id} style={{ borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding:'16px 0', fontWeight:600 }}>{t.title}</td>
                    <td style={{ padding:'16px 0', color:'#94a3b8' }}>
                      {STATIONS.find(s => s.id === t.stationTeam)?.name || 'Hàng Đợi'}
                    </td>
                    <td style={{ padding:'16px 0' }}>
                      <span style={{ 
                        background: t.status === 'DONE' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                        color: t.status === 'DONE' ? '#10b981' : '#ef4444',
                        padding:'4px 8px', borderRadius:6, fontSize:11, fontWeight:700 
                      }}>
                        {t.status === 'DONE' ? 'HOÀN THÀNH' : 'ĐÃ HỦY'}
                      </span>
                    </td>
                    <td style={{ padding:'16px 0', color:'#94a3b8' }}>
                      {new Date(t.updatedAt).toLocaleDateString('vi-VN')}
                    </td>
                    <td style={{ padding:'16px 0', textAlign:'right' }}>
                      <button 
                        onClick={() => handleReopen(t.id)}
                        style={{ background:'transparent', border:'1px solid rgba(255,255,255,0.2)', color:'#e2e8f0', padding:'6px 12px', borderRadius:6, fontSize:12, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:6 }}
                      >
                        <RotateCcw size={14}/> Khôi phục
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      <style>{`
        @keyframes fadein { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
}
