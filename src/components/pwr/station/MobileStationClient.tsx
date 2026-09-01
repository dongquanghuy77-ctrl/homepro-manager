'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Play, Check, AlertTriangle, ArrowLeft, Loader2, Target, CheckCircle2, Factory, Scissors, Grid3X3 } from 'lucide-react';

export default function MobileStationClient() {
  const router = useRouter();
  const [activeStation, setActiveStation] = useState<string | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTasks = async (station: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/pwr/tasks?limit=50&status=TODO,IN_PROGRESS');
      const data = await res.json();
      
      let filtered = data.tasks || [];
      if (station === 'CNC') filtered = filtered.filter((t: any) => t.title.includes('[CNC]'));
      if (station === 'DAN_CANH') filtered = filtered.filter((t: any) => t.title.includes('[DÁN CẠNH]'));
      if (station === 'KHOAN_CAM') filtered = filtered.filter((t: any) => t.title.includes('[KHOAN CAM]'));
      
      setTasks(filtered);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleSelectStation = (station: string) => {
    setActiveStation(station);
    fetchTasks(station);
  };

  const updateTaskStatus = async (taskId: number, newStatus: string) => {
    try {
      await fetch('/api/pwr/tasks/' + taskId, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      fetchTasks(activeStation!);
    } catch (e) {
      console.error(e);
    }
  };

  // Giao diện Màn hình chờ (Chọn trạm)
  if (!activeStation) {
    return (
      <div style={{ padding: '32px 20px', minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ textAlign: 'center', marginBottom: 40, marginTop: 20 }}>
          <div style={{ width: 64, height: 64, background: 'rgba(139, 92, 246, 0.1)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#8b5cf6' }}>
            <Factory size={32} />
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: 'var(--color-text)', letterSpacing: '-0.5px', marginBottom: 8 }}>Trạm Làm Việc</h1>
          <p style={{ fontSize: 15, color: 'var(--color-text-muted)', margin: 0 }}>Vui lòng chọn tổ sản xuất của bạn</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 500, margin: '0 auto', width: '100%' }}>
          <button onClick={() => handleSelectStation('CNC')} 
            style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12, background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', color: '#fff', borderRadius: 24, border: 'none', boxShadow: '0 12px 24px -8px rgba(139,92,246,0.5)', cursor: 'pointer', transition: 'transform 0.1s' }}>
            <Scissors size={36} opacity={0.9} />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Tổ CNC</div>
              <div style={{ fontSize: 14, opacity: 0.8, fontWeight: 500 }}>Cắt ván, soi rãnh, đánh mòi</div>
            </div>
          </button>

          <button onClick={() => handleSelectStation('DAN_CANH')} 
            style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12, background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)', color: '#fff', borderRadius: 24, border: 'none', boxShadow: '0 12px 24px -8px rgba(16,185,129,0.5)', cursor: 'pointer', transition: 'transform 0.1s' }}>
            <Grid3X3 size={36} opacity={0.9} />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Tổ Dán Cạnh</div>
              <div style={{ fontSize: 14, opacity: 0.8, fontWeight: 500 }}>Dán nẹp thẳng, vát, acrylic</div>
            </div>
          </button>

          <button onClick={() => handleSelectStation('KHOAN_CAM')} 
            style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12, background: 'linear-gradient(135deg, #06b6d4 0%, #0369a1 100%)', color: '#fff', borderRadius: 24, border: 'none', boxShadow: '0 12px 24px -8px rgba(6,182,212,0.5)', cursor: 'pointer', transition: 'transform 0.1s' }}>
            <Target size={36} opacity={0.9} />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Tổ Khoan Cam</div>
              <div style={{ fontSize: 14, opacity: 0.8, fontWeight: 500 }}>Khoan chốt, bản lề, ray trượt</div>
            </div>
          </button>
        </div>
      </div>
    );
  }

  // Giao diện Danh sách Task
  const stationInfo = {
    CNC: { name: 'Tổ CNC', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
    DAN_CANH: { name: 'Tổ Dán Cạnh', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
    KHOAN_CAM: { name: 'Tổ Khoan Cam', color: '#06b6d4', bg: 'rgba(6,182,212,0.1)' }
  }[activeStation] || { name: 'Chưa rõ', color: '#666', bg: '#eee' };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(var(--color-bg-rgb), 0.8)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--color-border)', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => setActiveStation(null)} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <ArrowLeft size={20} color="var(--color-text)" />
          </button>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Trạm làm việc</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: stationInfo.color }}>{stationInfo.name}</div>
          </div>
        </div>
        <div style={{ width: 40, height: 40, borderRadius: '12px', background: stationInfo.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: stationInfo.color, fontWeight: 800 }}>
          {tasks.length}
        </div>
      </div>

      {/* Task List */}
      <div style={{ padding: '20px', maxWidth: 600, margin: '0 auto', paddingBottom: 120 }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', color: 'var(--color-text-muted)' }}>
            <Loader2 size={32} className="animate-spin" style={{ marginBottom: 16, color: stationInfo.color }} />
            <div style={{ fontWeight: 600 }}>Đang tải công việc...</div>
          </div>
        ) : tasks.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', textAlign: 'center' }}>
            <div style={{ width: 80, height: 80, background: stationInfo.bg, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, color: stationInfo.color }}>
              <CheckCircle2 size={40} />
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 8px 0' }}>Xưởng rảnh việc!</h3>
            <p style={{ fontSize: 15, color: 'var(--color-text-muted)', margin: 0 }}>Chưa có dự án nào được giao cho tổ của bạn. Hãy nghỉ ngơi nhé!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {tasks.map(t => (
              <div key={t.id} style={{ 
                background: 'var(--color-surface)', 
                borderRadius: 20, 
                padding: 20, 
                boxShadow: '0 4px 24px rgba(0,0,0,0.06)', 
                border: '1px solid var(--color-border)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                {/* Priority Indicator Bar */}
                <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 6, background: t.priority === 'CRITICAL' ? '#ef4444' : t.priority === 'HIGH' ? '#f59e0b' : '#3b82f6' }} />
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, paddingLeft: 8 }}>
                  <div style={{ background: 'var(--color-bg)', padding: '6px 12px', borderRadius: 8, fontSize: 13, fontWeight: 700, color: 'var(--color-text)', border: '1px solid var(--color-border)' }}>
                    Dự án: <span style={{ color: stationInfo.color }}>{t.projectRef || 'Chưa gán'}</span>
                  </div>
                  {t.priority === 'CRITICAL' && (
                    <div style={{ background: '#fef2f2', color: '#ef4444', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 800, border: '1px solid #fecaca' }}>GẤP</div>
                  )}
                </div>

                <h3 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 8px 0', lineHeight: 1.4, color: 'var(--color-text)', paddingLeft: 8 }}>
                  {t.title}
                </h3>
                
                <div style={{ fontSize: 15, color: 'var(--color-text-muted)', marginBottom: 24, lineHeight: 1.5, paddingLeft: 8 }}>
                  {t.description.split('\n')[1] || t.description}
                </div>

                {t.waitingFor && (
                  <div style={{ background: '#fef2f2', color: '#ef4444', padding: '12px 16px', borderRadius: 12, fontSize: 14, fontWeight: 600, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8, marginLeft: 8 }}>
                    <AlertTriangle size={18} /> {t.waitingFor}
                  </div>
                )}
                
                {t.status === 'TODO' ? (
                  <button onClick={() => updateTaskStatus(t.id, 'IN_PROGRESS')} 
                    style={{ width: '100%', padding: '20px', background: 'var(--color-text)', color: 'var(--color-bg)', border: 'none', borderRadius: 16, fontSize: 18, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer', boxShadow: '0 8px 16px rgba(0,0,0,0.1)', transition: 'transform 0.1s' }}>
                    <Play size={24} fill="currentColor" /> BẮT ĐẦU LÀM
                  </button>
                ) : (
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button onClick={() => updateTaskStatus(t.id, 'DONE')} 
                      style={{ flex: 1, padding: '20px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 16, fontSize: 18, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', boxShadow: '0 8px 16px rgba(16,185,129,0.25)' }}>
                      <Check size={28} strokeWidth={3} /> HOÀN THÀNH XE NÀY
                    </button>
                    <button onClick={() => alert('Đã mở form báo lỗi phôi!')} 
                      style={{ width: 68, padding: '20px 0', background: '#fef2f2', color: '#ef4444', border: '2px solid #fecaca', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                      <AlertTriangle size={24} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
