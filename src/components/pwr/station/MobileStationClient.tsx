'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Play, Check, AlertTriangle, ArrowLeft } from 'lucide-react';

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

  if (!activeStation) {
    return (
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 500, margin: '0 auto' }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, textAlign: 'center', marginTop: 40, marginBottom: 20 }}>CHỌN TỔ SẢN XUẤT</h1>
        <button onClick={() => handleSelectStation('CNC')} style={{ padding: 24, fontSize: 20, fontWeight: 700, background: '#8b5cf6', color: '#fff', borderRadius: 16, border: 'none' }}>🕹️ Tổ CNC</button>
        <button onClick={() => handleSelectStation('DAN_CANH')} style={{ padding: 24, fontSize: 20, fontWeight: 700, background: '#10b981', color: '#fff', borderRadius: 16, border: 'none' }}>🛋️ Tổ Dán Cạnh</button>
        <button onClick={() => handleSelectStation('KHOAN_CAM')} style={{ padding: 24, fontSize: 20, fontWeight: 700, background: '#06b6d4', color: '#fff', borderRadius: 16, border: 'none' }}>🪛 Tổ Khoan Cam</button>
      </div>
    );
  }

  return (
    <div style={{ padding: 16, maxWidth: 500, margin: '0 auto', paddingBottom: 100 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => setActiveStation(null)} style={{ background: 'transparent', border: 'none', padding: 8 }}>
          <ArrowLeft size={24} color="var(--color-text)" />
        </button>
        <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>
          {activeStation === 'CNC' ? '🕹️ Tổ CNC' : activeStation === 'DAN_CANH' ? '🛋️ Tổ Dán Cạnh' : '🪛 Tổ Khoan Cam'}
        </h2>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, opacity: 0.5 }}>Đang tải công việc...</div>
      ) : tasks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, opacity: 0.5 }}>🎉 Không có việc chờ!</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {tasks.map(t => (
            <div key={t.id} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 4 }}>Dự án: {t.projectRef || 'Chưa gán'}</div>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, lineHeight: 1.4 }}>{t.title}</div>
              {t.waitingFor && <div style={{ fontSize: 13, color: '#ef4444', marginBottom: 12 }}>⚠️ {t.waitingFor}</div>}
              
              {t.status === 'TODO' ? (
                <button onClick={() => updateTaskStatus(t.id, 'IN_PROGRESS')} style={{ width: '100%', padding: 16, background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <Play size={20} /> BẮT ĐẦU LÀM
                </button>
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => updateTaskStatus(t.id, 'DONE')} style={{ flex: 1, padding: 16, background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <Check size={20} /> HOÀN THÀNH XE NÀY
                  </button>
                  <button onClick={() => alert('Đã ghi nhận hỏng phôi vào danh sách chờ cắt bù!')} style={{ width: 60, padding: 16, background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <AlertTriangle size={20} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
