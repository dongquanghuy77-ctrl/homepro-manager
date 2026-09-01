'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, Trophy, ChevronRight, Home, BarChart2, Bell, User, Factory, BatteryMedium, Signal, CheckCircle2, ClipboardList, ArrowLeft, Play, AlertTriangle, Check, ShieldAlert } from 'lucide-react';

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
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    
    * { font-family: 'Inter', sans-serif; box-sizing: border-box; }
    
    .app-container {
      background-color: #03030a;
      background-image: url('/pwr-assets/factory-bg.png');
      background-size: cover;
      background-position: center;
      background-attachment: fixed;
      min-height: 100vh;
      color: #ffffff;
      padding-bottom: 90px;
    }

    .app-overlay {
      position: absolute; inset: 0;
      background: linear-gradient(180deg, rgba(3,3,10,0.4) 0%, rgba(3,3,10,0.9) 100%);
      z-index: 0; pointer-events: none;
    }

    .content-wrapper {
      position: relative; z-index: 10;
    }

    .glass-card {
      background: rgba(15, 15, 20, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 24px;
      backdrop-filter: blur(16px);
    }

    .machine-btn {
      width: 100%; padding: 0; margin-bottom: 16px;
      background: transparent; border: none; cursor: pointer;
      transition: transform 0.2s;
      border-radius: 24px;
      overflow: hidden;
      display: block;
    }
    .machine-btn:active { transform: scale(0.96); }
    .machine-btn img {
      width: 100%; height: auto; display: block;
      border-radius: 24px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    }

    .nav-item {
      display: flex; flex-direction: column; align-items: center; gap: 4px;
      color: #6b7280; font-size: 10px; border: none; background: none; cursor: pointer;
    }
    .nav-item.active { color: #c084fc; }
    
    .floating-fab {
      width: 56px; height: 56px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
      background: #03030a; border: 2px solid #a855f7; color: #c084fc;
      transform: translateY(-20px); box-shadow: 0 0 15px rgba(139,92,246,0.4), inset 0 0 15px rgba(139,92,246,0.4);
    }
  `;

  if (!activeStation) {
    return (
      <div className="app-container" style={{ maxWidth: 480, margin: '0 auto', position: 'relative' }}>
        <style dangerouslySetInnerHTML={{ __html: STYLES }} />
        <div className="app-overlay" />

        <div className="content-wrapper">
          {/* iOS Status Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 24px', fontSize: 14, fontWeight: 600 }}>
            <div>11:26</div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <Signal size={16} />
              <span style={{ fontSize: 12 }}>5G</span>
              <BatteryMedium size={18} color="#22c55e" />
            </div>
          </div>

          {/* Header Menu */}
          <div style={{ padding: '0 24px', marginBottom: 20 }}>
            <Menu size={28} color="#9ca3af" />
          </div>

          {/* App Logo & Title */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ 
              width: 72, height: 72, margin: '0 auto 16px', borderRadius: 20,
              border: '1px solid #a855f7', background: 'rgba(139,92,246,0.05)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 30px rgba(139,92,246,0.2), inset 0 0 20px rgba(139,92,246,0.1)'
            }}>
              <Factory size={32} color="#c084fc" />
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 4px 0', letterSpacing: '-0.5px' }}>Trạm Làm Việc</h1>
            <p style={{ fontSize: 14, color: '#9ca3af', margin: 0 }}>Hệ thống điều khiển máy trạm</p>
          </div>

          <div style={{ padding: '0 20px' }}>
            {/* User Profile Card */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Huy&backgroundColor=3b82f6" alt="Avatar" style={{ width: 48, height: 48, borderRadius: '50%', border: '2px solid #374151' }} />
                <div>
                  <div style={{ fontSize: 12, color: '#9ca3af' }}>Xin chào,</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#f3f4f6' }}>Anh Huy</div>
                  <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>Level 12</div>
                </div>
              </div>
              
              <div style={{ textAlign: 'right' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end', color: '#fbbf24', marginBottom: 2 }}>
                  <Trophy size={20} fill="currentColor" />
                  <span style={{ fontSize: 24, fontWeight: 800 }}>120</span>
                </div>
                <div style={{ fontSize: 12, color: '#9ca3af' }}>Điểm thành tích</div>
              </div>
            </div>

            {/* DIRECT IMAGE REPLACEMENTS FOR MACHINE CARDS */}
            <button className="machine-btn" onClick={() => handleSelectStation('CNC')}>
              <img src="/pwr-assets/cnc-card.png" alt="Tổ CNC" />
            </button>

            <button className="machine-btn" onClick={() => handleSelectStation('DAN_CANH')}>
              <img src="/pwr-assets/edge-card.png" alt="Tổ Dán Cạnh" />
            </button>

            <button className="machine-btn" onClick={() => handleSelectStation('KHOAN_CAM')}>
              <img src="/pwr-assets/drill-card.png" alt="Tổ Khoan Cam" />
            </button>

            {/* Bottom Stats Grid */}
            <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 24px', marginTop: 32 }}>
              <div style={{ textAlign: 'center' }}>
                <ClipboardList size={20} color="#9ca3af" style={{ margin: '0 auto 8px' }} />
                <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>Nhiệm vụ</div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>12</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <CheckCircle2 size={20} color="#9ca3af" style={{ margin: '0 auto 8px' }} />
                <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>Đang xử lý</div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>5</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <CheckCircle2 size={20} color="#10b981" style={{ margin: '0 auto 8px' }} />
                <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>Hoàn thành</div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>36</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <Trophy size={20} color="#fbbf24" style={{ margin: '0 auto 8px' }} />
                <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>Thành tích</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#fbbf24' }}>120</div>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Bottom Nav */}
        <div style={{ 
          position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', 
          width: '100%', maxWidth: 480, height: 70,
          background: 'rgba(10, 10, 15, 0.95)', borderTop: '1px solid rgba(255,255,255,0.05)',
          display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '0 16px',
          zIndex: 100
        }}>
          <button className="nav-item active"><Home size={24} /> Trang chủ</button>
          <button className="nav-item"><BarChart2 size={24} /> Bảng xếp hạng</button>
          
          <div style={{ position: 'relative', width: 56, height: 56 }}>
            <button className="floating-fab">
              <Factory size={24} />
            </button>
          </div>
          
          <button className="nav-item"><Bell size={24} /> Thông báo</button>
          <button className="nav-item"><User size={24} /> Cá nhân</button>
        </div>
      </div>
    );
  }

  // --- MÀN HÌNH BÊN TRONG TRẠM (DANH SÁCH LỆNH) ---
  const stationInfo = {
    CNC: { name: 'Tổ CNC', color: '#a855f7', bg: 'rgba(139,92,246,0.1)' },
    DAN_CANH: { name: 'Tổ Dán Cạnh', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
    KHOAN_CAM: { name: 'Tổ Khoan Cam', color: '#0ea5e9', bg: 'rgba(14,165,233,0.1)' }
  }[activeStation] || { name: '', color: '', bg: '' };

  return (
    <div className="app-container" style={{ maxWidth: 480, margin: '0 auto', position: 'relative' }}>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <div className="app-overlay" />

      <div className="content-wrapper">
        <div style={{ position: 'sticky', top: 0, zIndex: 50, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(10,10,15, 0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button onClick={() => setActiveStation(null)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f8fafc' }}><ArrowLeft size={22} /></button>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Trạm làm việc</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: stationInfo.color }}>{stationInfo.name}</div>
            </div>
          </div>
        </div>

        <div style={{ padding: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {tasks.map(t => (
              <div key={t.id} className="glass-card" style={{ padding: 20, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 6, background: t.priority === 'CRITICAL' ? '#ef4444' : '#3b82f6', boxShadow: `0 0 10px ${t.priority === 'CRITICAL' ? '#ef4444' : '#3b82f6'}` }} />
                
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, paddingLeft: 10 }}>
                  <div style={{ background: 'rgba(0,0,0,0.4)', padding: '6px 14px', borderRadius: 10, fontSize: 14, fontWeight: 700, color: '#cbd5e1', border: '1px solid rgba(255,255,255,0.1)' }}>Mã Lệnh: <span style={{ color: stationInfo.color }}>{t.projectRef || 'SYS-000'}</span></div>
                  {t.priority === 'CRITICAL' && <div style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', padding: '6px 12px', borderRadius: 10, fontSize: 13, fontWeight: 800, border: '1px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 0 10px rgba(239,68,68,0.3)' }}><ShieldAlert size={14}/> KHẨN CẤP</div>}
                </div>

                <h3 style={{ fontSize: 24, fontWeight: 900, margin: '0 0 12px 0', color: '#f8fafc', paddingLeft: 10 }}>{t.title}</h3>
                <div style={{ fontSize: 15, color: '#9ca3af', marginBottom: 24, paddingLeft: 10 }}>{t.description.split('\n')[1] || t.description}</div>

                <div style={{ paddingLeft: 10 }}>
                  {t.status === 'TODO' ? (
                    <button onClick={() => updateTaskStatus(t.id, 'IN_PROGRESS')} style={{ width: '100%', padding: '20px', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', color: '#fff', border: '1px solid rgba(59,130,246,0.5)', borderRadius: 16, fontSize: 18, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, cursor: 'pointer', boxShadow: '0 0 20px rgba(59,130,246,0.4)' }}>
                      <Play size={24} fill="currentColor" /> KHỞI ĐỘNG MÁY
                    </button>
                  ) : (
                    <div style={{ display: 'flex', gap: 12 }}>
                      <button onClick={() => updateTaskStatus(t.id, 'DONE')} style={{ flex: 1, padding: '20px', background: 'linear-gradient(135deg, #10b981, #047857)', color: '#fff', border: '1px solid rgba(16,185,129,0.5)', borderRadius: 16, fontSize: 18, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer', boxShadow: '0 0 20px rgba(16,185,129,0.4)' }}>
                        <Check size={28} strokeWidth={3} /> HOÀN THÀNH
                      </button>
                      <button style={{ width: 72, padding: '20px 0', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.5)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: 'inset 0 0 10px rgba(239,68,68,0.2)' }}>
                        <AlertTriangle size={24} strokeWidth={2.5} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
