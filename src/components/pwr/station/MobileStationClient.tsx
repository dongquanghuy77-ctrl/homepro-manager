'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Play, Check, AlertTriangle, ArrowLeft, Loader2, Target, CheckCircle2, Factory, Disc, MoveRight, Crosshair, Box } from 'lucide-react';

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

  const STYLES = `
    @keyframes spin-blade { 100% { transform: rotate(360deg); } }
    @keyframes pulse-laser { 
      0%, 100% { transform: scale(1); filter: drop-shadow(0 0 2px rgba(6,182,212,0.5)); } 
      50% { transform: scale(1.15); filter: drop-shadow(0 0 12px rgba(6,182,212,1)); } 
    }
    @keyframes slide-edge { 
      0%, 100% { transform: translateX(-5px); } 
      50% { transform: translateX(8px); } 
    }
    .card-btn {
      width: 100%; text-align: left; padding: 24px; border-radius: 24px; border: none; cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); position: relative; overflow: hidden;
    }
    .card-btn:active { transform: scale(0.96); }
    .card-btn::after {
      content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px;
      background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0) 100%);
    }
    .card-cnc { background: linear-gradient(135deg, #a855f7 0%, #7e22ce 100%); box-shadow: 0 12px 30px -10px rgba(168,85,247,0.7); }
    .card-edge { background: linear-gradient(135deg, #10b981 0%, #047857 100%); box-shadow: 0 12px 30px -10px rgba(16,185,129,0.7); }
    .card-drill { background: linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%); box-shadow: 0 12px 30px -10px rgba(14,165,233,0.7); }
  `;

  if (!activeStation) {
    return (
      <div style={{ padding: '32px 20px', minHeight: '100vh', backgroundColor: '#0f172a', 
        backgroundImage: 'radial-gradient(circle at 50% -20%, rgba(139, 92, 246, 0.15) 0%, transparent 60%), url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' viewBox=\'0 0 20 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.03\' fill-rule=\'evenodd\'%3E%3Ccircle cx=\'2\' cy=\'2\' r=\'2\'/%3E%3C/g%3E%3C/svg%3E")',
        display: 'flex', flexDirection: 'column' }}>
        <style dangerouslySetInnerHTML={{ __html: STYLES }} />
        
        <div style={{ textAlign: 'center', marginBottom: 40, marginTop: 20 }}>
          <div style={{ width: 72, height: 72, background: 'linear-gradient(135deg, #334155, #1e293b)', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: '#fff', boxShadow: '0 8px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)' }}>
            <Factory size={36} />
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 900, color: '#f8fafc', letterSpacing: '-0.5px', margin: '0 0 8px 0' }}>Trạm Làm Việc</h1>
          <p style={{ fontSize: 16, color: '#94a3b8', margin: 0, fontWeight: 500 }}>Hệ thống điều khiển máy trạm</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 500, margin: '0 auto', width: '100%' }}>
          <button className="card-btn card-cnc" onClick={() => handleSelectStation('CNC')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 16 }}>
                <Disc size={36} color="#fff" style={{ animation: 'spin-blade 2s linear infinite' }} />
              </div>
              <div>
                <div style={{ fontSize: 26, fontWeight: 900, color: '#fff', marginBottom: 4, textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>Tổ CNC</div>
                <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>Cắt ván, soi rãnh, đánh mòi</div>
              </div>
            </div>
          </button>

          <button className="card-btn card-edge" onClick={() => handleSelectStation('DAN_CANH')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 16 }}>
                <MoveRight size={36} color="#fff" style={{ animation: 'slide-edge 2s ease-in-out infinite' }} />
              </div>
              <div>
                <div style={{ fontSize: 26, fontWeight: 900, color: '#fff', marginBottom: 4, textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>Tổ Dán Cạnh</div>
                <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>Dán nẹp thẳng, vát, acrylic</div>
              </div>
            </div>
          </button>

          <button className="card-btn card-drill" onClick={() => handleSelectStation('KHOAN_CAM')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 16 }}>
                <Crosshair size={36} color="#fff" style={{ animation: 'pulse-laser 1.5s ease-in-out infinite' }} />
              </div>
              <div>
                <div style={{ fontSize: 26, fontWeight: 900, color: '#fff', marginBottom: 4, textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>Tổ Khoan Cam</div>
                <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>Khoan chốt, bản lề, ray trượt</div>
              </div>
            </div>
          </button>
        </div>
      </div>
    );
  }

  // Giao diện Danh sách Task
  const stationInfo = {
    CNC: { name: 'Tổ CNC', color: '#a855f7', bg: 'rgba(168,85,247,0.15)' },
    DAN_CANH: { name: 'Tổ Dán Cạnh', color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
    KHOAN_CAM: { name: 'Tổ Khoan Cam', color: '#0ea5e9', bg: 'rgba(14,165,233,0.15)' }
  }[activeStation] || { name: 'Chưa rõ', color: '#666', bg: '#eee' };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: '#f8fafc' }}>
      <style dangerouslySetInnerHTML={{ __html: STYLES + `
        .glass-task-card {
          background: #1e293b; border: 1px solid #334155; border-radius: 20px; padding: 20px;
          box-shadow: 0 8px 25px -5px rgba(0,0,0,0.3); position: relative; overflow: hidden;
        }
        .glass-header { background: rgba(15,23,42, 0.85); backdrop-filter: blur(12px); border-bottom: 1px solid #334155; }
      ` }} />
      
      {/* Header */}
      <div className="glass-header" style={{ position: 'sticky', top: 0, zIndex: 50, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button onClick={() => setActiveStation(null)} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#f8fafc' }}>
            <ArrowLeft size={22} />
          </button>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>Trạm làm việc</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: stationInfo.color }}>{stationInfo.name}</div>
          </div>
        </div>
        <div style={{ padding: '0 16px', height: 40, borderRadius: '20px', background: stationInfo.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: stationInfo.color, fontWeight: 800, fontSize: 16 }}>
          {tasks.length} Việc
        </div>
      </div>

      {/* Task List */}
      <div style={{ padding: '24px 20px', maxWidth: 600, margin: '0 auto', paddingBottom: 120 }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', color: '#94a3b8' }}>
            <Loader2 size={36} className="animate-spin" style={{ marginBottom: 16, color: stationInfo.color }} />
            <div style={{ fontWeight: 600, fontSize: 16 }}>Đang quét mã lệnh...</div>
          </div>
        ) : tasks.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', textAlign: 'center' }}>
            <div style={{ width: 100, height: 100, background: stationInfo.bg, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24, color: stationInfo.color, boxShadow: `0 0 40px ${stationInfo.bg}` }}>
              <CheckCircle2 size={50} />
            </div>
            <h3 style={{ fontSize: 24, fontWeight: 900, margin: '0 0 12px 0', color: '#f8fafc' }}>Xưởng rảnh việc!</h3>
            <p style={{ fontSize: 16, color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>Không có lệnh sản xuất nào đang chờ.<br/>Anh em nghỉ ngơi uống nước nhé!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {tasks.map(t => (
              <div key={t.id} className="glass-task-card">
                <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 6, background: t.priority === 'CRITICAL' ? '#ef4444' : t.priority === 'HIGH' ? '#f59e0b' : '#3b82f6', boxShadow: `0 0 10px ${t.priority === 'CRITICAL' ? '#ef4444' : '#3b82f6'}` }} />
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, paddingLeft: 10 }}>
                  <div style={{ background: '#0f172a', padding: '6px 14px', borderRadius: 10, fontSize: 14, fontWeight: 700, color: '#cbd5e1', border: '1px solid #334155' }}>
                    Dự án: <span style={{ color: stationInfo.color }}>{t.projectRef || 'Chưa gán'}</span>
                  </div>
                  {t.priority === 'CRITICAL' && (
                    <div style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', padding: '6px 12px', borderRadius: 10, fontSize: 13, fontWeight: 800, border: '1px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <AlertTriangle size={14}/> GẤP
                    </div>
                  )}
                </div>

                <h3 style={{ fontSize: 24, fontWeight: 900, margin: '0 0 12px 0', lineHeight: 1.3, color: '#f8fafc', paddingLeft: 10 }}>
                  {t.title}
                </h3>
                
                <div style={{ fontSize: 15, color: '#94a3b8', marginBottom: 24, lineHeight: 1.6, paddingLeft: 10 }}>
                  {t.description.split('\n')[1] || t.description}
                </div>

                {t.waitingFor && (
                  <div style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', padding: '14px 16px', borderRadius: 12, fontSize: 15, fontWeight: 600, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10, marginLeft: 10, border: '1px solid rgba(239,68,68,0.2)' }}>
                    <AlertTriangle size={20} /> {t.waitingFor}
                  </div>
                )}
                
                <div style={{ paddingLeft: 10 }}>
                  {t.status === 'TODO' ? (
                    <button onClick={() => updateTaskStatus(t.id, 'IN_PROGRESS')} 
                      style={{ width: '100%', padding: '20px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#fff', border: 'none', borderRadius: 16, fontSize: 18, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, cursor: 'pointer', boxShadow: '0 8px 20px rgba(59,130,246,0.3)', transition: 'transform 0.1s' }}>
                      <Play size={24} fill="currentColor" /> BẮT ĐẦU LÀM
                    </button>
                  ) : (
                    <div style={{ display: 'flex', gap: 12 }}>
                      <button onClick={() => updateTaskStatus(t.id, 'DONE')} 
                        style={{ flex: 1, padding: '20px', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 'none', borderRadius: 16, fontSize: 18, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer', boxShadow: '0 8px 20px rgba(16,185,129,0.3)' }}>
                        <Check size={28} strokeWidth={3} /> HOÀN THÀNH XE
                      </button>
                      <button onClick={() => alert('Đã mở form báo lỗi phôi!')} 
                        style={{ width: 72, padding: '20px 0', background: 'transparent', color: '#ef4444', border: '2px solid #ef4444', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        <AlertTriangle size={24} strokeWidth={2.5} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
