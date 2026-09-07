'use client';
import { useState, useEffect } from 'react';
import { X, Clock, RotateCcw, Loader2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onRefreshTasks: () => void;
}

export default function PwrTaskHistoryDrawer({ isOpen, onClose, onRefreshTasks }: Props) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetch('/api/pwr/tasks/history?type=personal')
        .then(res => res.json())
        .then(d => {
          setTasks(d.tasks || []);
          setTotal(d.total || 0);
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  const handleReopen = async (taskId: number) => {
    if (!confirm('Khôi phục công việc này về trạng thái "Đang làm"?')) return;
    try {
      await fetch(`/api/pwr/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'IN_PROGRESS' })
      });
      setTasks(tasks.filter(t => t.id !== taskId));
      onRefreshTasks();
    } catch (e) {
      alert('Lỗi khi khôi phục');
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div 
        onClick={onClose}
        style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:999, backdropFilter:'blur(2px)' }} 
      />
      <div 
        style={{ 
          position:'fixed', top:0, right:0, bottom:0, width: 450, maxWidth:'100%', 
          background:'#1e293b', borderLeft:'1px solid rgba(255,255,255,0.1)', 
          zIndex:1000, display:'flex', flexDirection:'column',
          boxShadow:'-10px 0 30px rgba(0,0,0,0.5)',
          animation: 'slideInRight 0.2s ease-out'
        }}
      >
        <div style={{ padding: 20, borderBottom:'1px solid rgba(255,255,255,0.1)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <h2 style={{ margin:0, color:'#fff', fontSize:18, display:'flex', alignItems:'center', gap:8 }}>
              <Clock size={20} color="#94a3b8"/> Lịch sử công việc
            </h2>
            <p style={{ margin:'4px 0 0', color:'#94a3b8', fontSize:12 }}>
              Các công việc đã hoàn thành/hủy trước ngày hôm nay ({total} công việc)
            </p>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'#94a3b8', cursor:'pointer' }}>
            <X size={20}/>
          </button>
        </div>

        <div style={{ flex:1, overflowY:'auto', padding: 20, display:'flex', flexDirection:'column', gap:12 }}>
          {loading ? (
            <div style={{ textAlign:'center', color:'#94a3b8', marginTop: 40 }}><Loader2 className="pwr-spin" size={24}/></div>
          ) : tasks.length === 0 ? (
            <div style={{ textAlign:'center', color:'#64748b', marginTop: 40, fontSize:14 }}>Trống.</div>
          ) : (
            tasks.map(t => (
              <div key={t.id} style={{ background:'rgba(0,0,0,0.2)', padding:16, borderRadius:12, border:'1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ color: t.status === 'DONE' ? '#10b981' : '#ef4444', fontSize:11, fontWeight:700, marginBottom:4 }}>
                  {t.status === 'DONE' ? 'HOÀN THÀNH' : 'ĐÃ HỦY'} 
                  <span style={{ color:'#64748b', fontWeight:400, marginLeft: 8 }}>
                    ({new Date(t.updatedAt).toLocaleDateString('vi-VN')})
                  </span>
                </div>
                <div style={{ color:'#e2e8f0', fontSize:14, fontWeight:600, marginBottom:8 }}>
                  {t.title}
                </div>
                <button 
                  onClick={() => handleReopen(t.id)}
                  style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'#e2e8f0', padding:'6px 12px', borderRadius:6, fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}
                >
                  <RotateCcw size={14}/> Khôi phục
                </button>
              </div>
            ))
          )}
        </div>
      </div>
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}
