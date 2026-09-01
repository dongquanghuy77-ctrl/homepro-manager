'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Play, Check, AlertTriangle, ArrowLeft, Loader2, Target, CheckCircle2, Factory, Disc, Layers, Crosshair, Trophy, Menu, Bell, User, Home, BarChart2, Activity, Zap } from 'lucide-react';

export default function MobileStationClient() {
  const router = useRouter();
  const [activeStation, setActiveStation] = useState<string | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Stats dummy cho Gamification (thay bằng API thật sau)
  const stats = {
    total: 12,
    inProgress: 5,
    done: 36,
    xp: 120,
    level: 12,
    progress: 85 // %
  };

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
    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700;900&display=swap');
    
    * { font-family: 'Space Grotesk', sans-serif; }
    
    @keyframes spin-slow { 100% { transform: rotate(360deg); } }
    @keyframes spin-reverse { 100% { transform: rotate(-360deg); } }
    @keyframes pulse-glow { 
      0%, 100% { opacity: 0.8; filter: drop-shadow(0 0 8px currentColor); } 
      50% { opacity: 1; filter: drop-shadow(0 0 20px currentColor); } 
    }
    @keyframes scan-line {
      0% { top: 0; opacity: 0; }
      10% { opacity: 1; }
      90% { opacity: 1; }
      100% { top: 100%; opacity: 0; }
    }
    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-8px); }
    }
    
    .sci-fi-bg {
      background-color: #05050a;
      background-image: 
        radial-gradient(circle at 50% 0%, rgba(168, 85, 247, 0.15) 0%, transparent 50%),
        radial-gradient(circle at 100% 100%, rgba(6, 182, 212, 0.1) 0%, transparent 50%),
        linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
      background-size: 100% 100%, 100% 100%, 30px 30px, 30px 30px;
      background-position: center top;
    }

    .glass-panel {
      background: rgba(20, 20, 30, 0.6);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 20px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    }
    
    .station-card {
      width: 100%; text-align: left; padding: 20px; border-radius: 20px; border: none; cursor: pointer;
      position: relative; overflow: hidden;
      display: flex; align-items: center; gap: 16px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .station-card:active { transform: scale(0.96); }
    
    /* CNC Theme */
    .theme-cnc { background: linear-gradient(145deg, rgba(168,85,247,0.15) 0%, rgba(0,0,0,0.8) 100%); border: 1px solid rgba(168,85,247,0.3); }
    .theme-cnc:hover { box-shadow: 0 0 25px rgba(168,85,247,0.4); border-color: rgba(168,85,247,0.8); }
    .ring-cnc { color: #a855f7; box-shadow: 0 0 15px rgba(168,85,247,0.4), inset 0 0 15px rgba(168,85,247,0.4); }
    
    /* Edge Theme */
    .theme-edge { background: linear-gradient(145deg, rgba(16,185,129,0.15) 0%, rgba(0,0,0,0.8) 100%); border: 1px solid rgba(16,185,129,0.3); }
    .theme-edge:hover { box-shadow: 0 0 25px rgba(16,185,129,0.4); border-color: rgba(16,185,129,0.8); }
    .ring-edge { color: #10b981; box-shadow: 0 0 15px rgba(16,185,129,0.4), inset 0 0 15px rgba(16,185,129,0.4); }
    
    /* Drill Theme */
    .theme-drill { background: linear-gradient(145deg, rgba(14,165,233,0.15) 0%, rgba(0,0,0,0.8) 100%); border: 1px solid rgba(14,165,233,0.3); }
    .theme-drill:hover { box-shadow: 0 0 25px rgba(14,165,233,0.4); border-color: rgba(14,165,233,0.8); }
    .ring-drill { color: #0ea5e9; box-shadow: 0 0 15px rgba(14,165,233,0.4), inset 0 0 15px rgba(14,165,233,0.4); }

    .energy-ring {
      position: relative; width: 64px; height: 64px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .energy-ring::before, .energy-ring::after {
      content: ''; position: absolute; border-radius: 50%;
    }
    .energy-ring::before {
      inset: -4px; border: 2px dashed currentColor; animation: spin-slow 8s linear infinite; opacity: 0.6;
    }
    .energy-ring::after {
      inset: -8px; border: 1px solid currentColor; animation: spin-reverse 12s linear infinite; opacity: 0.3; border-top-color: transparent; border-bottom-color: transparent;
    }
    
    .nav-btn {
      display: flex; flex-direction: column; align-items: center; gap: 4px;
      color: #64748b; font-size: 10px; font-weight: 700; background: none; border: none; padding: 8px; cursor: pointer;
    }
    .nav-btn.active { color: #c084fc; filter: drop-shadow(0 0 8px rgba(192,132,252,0.6)); }
    
    .floating-center-btn {
      width: 60px; height: 60px; border-radius: 50%; 
      background: linear-gradient(135deg, #a855f7, #7e22ce);
      display: flex; align-items: center; justify-content: center;
      color: white; box-shadow: 0 0 20px rgba(168,85,247,0.6);
      transform: translateY(-20px); border: 4px solid #05050a;
      animation: float 4s ease-in-out infinite;
    }
    
    .progress-bar-bg { height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; width: 100%; margin-top: 8px; overflow: hidden; position: relative; }
    .progress-bar-fill { height: 100%; border-radius: 2px; transition: width 1s ease-out; position: relative; }
    .progress-bar-fill::after {
      content: ''; position: absolute; top: 0; right: 0; bottom: 0; width: 20px;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.8));
      filter: blur(2px);
    }
  `;

  if (!activeStation) {
    return (
      <div className="sci-fi-bg" style={{ minHeight: '100vh', paddingBottom: 100, color: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
        <style dangerouslySetInnerHTML={{ __html: STYLES }} />
        
        {/* Header Section */}
        <div style={{ padding: '24px 20px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button style={{ background: 'none', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 12, padding: 8, color: '#fff' }}>
            <Menu size={24} />
          </button>
          <div style={{ fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, color: '#10b981' }}>
            <Activity size={16} /> 5G <span style={{ color: '#fff' }}>81%</span>
          </div>
        </div>

        {/* Title Logo */}
        <div style={{ textAlign: 'center', marginBottom: 24, marginTop: 10 }}>
          <div style={{ 
            width: 64, height: 64, margin: '0 auto 16px', borderRadius: 20,
            background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a855f7',
            boxShadow: '0 0 30px rgba(168,85,247,0.3)', animation: 'pulse-glow 3s infinite'
          }}>
            <Factory size={32} />
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 900, margin: '0 0 6px 0', textShadow: '0 0 20px rgba(255,255,255,0.5)' }}>Trạm Làm Việc</h1>
          <p style={{ fontSize: 14, color: '#94a3b8', margin: 0, letterSpacing: 1, textTransform: 'uppercase' }}>Hệ thống điều khiển máy trạm</p>
        </div>

        {/* Player / Gamification Card */}
        <div style={{ padding: '0 20px', marginBottom: 30 }}>
          <div className="glass-panel" style={{ padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Huy&backgroundColor=3b82f6" alt="Avatar" style={{ width: 48, height: 48, borderRadius: '50%', border: '2px solid #a855f7' }} />
              <div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>Xin chào,</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>Anh Huy</div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#fbbf24', justifyContent: 'flex-end', marginBottom: 4 }}>
                <Trophy size={20} fill="currentColor" />
                <span style={{ fontSize: 20, fontWeight: 900 }}>{stats.xp}</span>
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>Điểm thành tích</div>
            </div>
          </div>
        </div>

        {/* Station Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '0 20px' }}>
          
          {/* CNC */}
          <button className="station-card theme-cnc" onClick={() => handleSelectStation('CNC')}>
            <div className="energy-ring ring-cnc">
              <Disc size={32} style={{ animation: 'spin-slow 2s linear infinite' }} />
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: 22, fontWeight: 900, color: '#fff', margin: '0 0 4px 0' }}>Tổ CNC</h2>
              <p style={{ fontSize: 13, color: '#cbd5e1', margin: 0 }}>Cắt ván, soi rãnh, đánh mòi</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
                <Trophy size={12} color="#fbbf24" fill="#fbbf24" />
                <div className="progress-bar-bg">
                  <div className="progress-bar-fill" style={{ width: '85%', background: '#a855f7', boxShadow: '0 0 10px #a855f7' }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#a855f7' }}>85%</span>
              </div>
            </div>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ArrowLeft size={20} style={{ transform: 'rotate(180deg)' }} />
            </div>
          </button>

          {/* Dán Cạnh */}
          <button className="station-card theme-edge" onClick={() => handleSelectStation('DAN_CANH')}>
            <div className="energy-ring ring-edge">
              <Layers size={32} style={{ animation: 'float 3s ease-in-out infinite' }} />
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: 22, fontWeight: 900, color: '#fff', margin: '0 0 4px 0' }}>Tổ Dán Cạnh</h2>
              <p style={{ fontSize: 13, color: '#cbd5e1', margin: 0 }}>Dán nẹp thẳng, vát, acrylic</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
                <Trophy size={12} color="#fbbf24" fill="#fbbf24" />
                <div className="progress-bar-bg">
                  <div className="progress-bar-fill" style={{ width: '70%', background: '#10b981', boxShadow: '0 0 10px #10b981' }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#10b981' }}>70%</span>
              </div>
            </div>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ArrowLeft size={20} style={{ transform: 'rotate(180deg)' }} />
            </div>
          </button>

          {/* Khoan Cam */}
          <button className="station-card theme-drill" onClick={() => handleSelectStation('KHOAN_CAM')}>
            <div className="energy-ring ring-drill">
              <Crosshair size={32} style={{ animation: 'pulse-glow 2s infinite' }} />
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: 22, fontWeight: 900, color: '#fff', margin: '0 0 4px 0' }}>Tổ Khoan Cam</h2>
              <p style={{ fontSize: 13, color: '#cbd5e1', margin: 0 }}>Khoan chốt, bản lề, ray trượt</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
                <Trophy size={12} color="#fbbf24" fill="#fbbf24" />
                <div className="progress-bar-bg">
                  <div className="progress-bar-fill" style={{ width: '60%', background: '#0ea5e9', boxShadow: '0 0 10px #0ea5e9' }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#0ea5e9' }}>60%</span>
              </div>
            </div>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ArrowLeft size={20} style={{ transform: 'rotate(180deg)' }} />
            </div>
          </button>

        </div>

        {/* Stats Summary Panel */}
        <div style={{ padding: '0 20px', marginTop: 24 }}>
          <div className="glass-panel" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', padding: '16px 8px' }}>
            <div style={{ textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ color: '#94a3b8', marginBottom: 8 }}><Disc size={20} style={{ margin: '0 auto' }} /></div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>Nhiệm vụ</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>12</div>
            </div>
            <div style={{ textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ color: '#0ea5e9', marginBottom: 8 }}><Zap size={20} style={{ margin: '0 auto' }} /></div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>Đang xử lý</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>5</div>
            </div>
            <div style={{ textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ color: '#10b981', marginBottom: 8 }}><CheckCircle2 size={20} style={{ margin: '0 auto' }} /></div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>Hoàn thành</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>36</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#fbbf24', marginBottom: 8 }}><Trophy size={20} style={{ margin: '0 auto' }} /></div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>Thành tích</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#fbbf24' }}>120</div>
            </div>
          </div>
        </div>

        {/* Bottom Nav Bar */}
        <div style={{ 
          position: 'fixed', bottom: 0, left: 0, right: 0, height: 70,
          background: 'rgba(10, 10, 15, 0.9)', backdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '0 10px',
          zIndex: 100
        }}>
          <button className="nav-btn active"><Home size={24} /> Trang chủ</button>
          <button className="nav-btn"><BarChart2 size={24} /> Xếp hạng</button>
          
          {/* Floating Center Button */}
          <div style={{ position: 'relative', width: 60, height: 60 }}>
            <button className="floating-center-btn">
              <Factory size={28} />
            </button>
          </div>
          
          <button className="nav-btn"><Bell size={24} /> Thông báo</button>
          <button className="nav-btn"><User size={24} /> Cá nhân</button>
        </div>

      </div>
    );
  }

  // --- MÀN HÌNH DANH SÁCH TASK TRÊN BÊN TRONG TRẠM ---
  const stationInfo = {
    CNC: { name: 'Tổ CNC', color: '#a855f7', bg: 'rgba(168,85,247,0.15)', shadow: 'rgba(168,85,247,0.4)' },
    DAN_CANH: { name: 'Tổ Dán Cạnh', color: '#10b981', bg: 'rgba(16,185,129,0.15)', shadow: 'rgba(16,185,129,0.4)' },
    KHOAN_CAM: { name: 'Tổ Khoan Cam', color: '#0ea5e9', bg: 'rgba(14,165,233,0.15)', shadow: 'rgba(14,165,233,0.4)' }
  }[activeStation] || { name: 'Chưa rõ', color: '#666', bg: '#eee', shadow: 'transparent' };

  return (
    <div className="sci-fi-bg" style={{ minHeight: '100vh', color: '#f8fafc' }}>
      <style dangerouslySetInnerHTML={{ __html: STYLES + `
        .glass-task-card {
          background: rgba(20,20,35,0.7); border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; padding: 20px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.5); position: relative; overflow: hidden; backdrop-filter: blur(10px);
        }
        .glass-header { background: rgba(10,10,15, 0.85); backdrop-filter: blur(20px); border-bottom: 1px solid rgba(255,255,255,0.1); }
      ` }} />
      
      {/* Header */}
      <div className="glass-header" style={{ position: 'sticky', top: 0, zIndex: 50, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button onClick={() => setActiveStation(null)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#f8fafc' }}>
            <ArrowLeft size={22} />
          </button>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>Trạm làm việc</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: stationInfo.color, textShadow: `0 0 10px ${stationInfo.shadow}` }}>{stationInfo.name}</div>
          </div>
        </div>
        <div style={{ padding: '0 16px', height: 40, borderRadius: '20px', background: stationInfo.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: stationInfo.color, fontWeight: 800, fontSize: 16, border: `1px solid ${stationInfo.shadow}` }}>
          {tasks.length} Việc
        </div>
      </div>

      {/* Task List */}
      <div style={{ padding: '24px 20px', maxWidth: 600, margin: '0 auto', paddingBottom: 120 }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', color: '#94a3b8' }}>
            <Loader2 size={36} className="animate-spin" style={{ marginBottom: 16, color: stationInfo.color }} />
            <div style={{ fontWeight: 600, fontSize: 16 }}>Đang đồng bộ vệ tinh...</div>
          </div>
        ) : tasks.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', textAlign: 'center' }}>
            <div style={{ width: 100, height: 100, background: stationInfo.bg, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24, color: stationInfo.color, boxShadow: `0 0 40px ${stationInfo.shadow}` }}>
              <CheckCircle2 size={50} />
            </div>
            <h3 style={{ fontSize: 24, fontWeight: 900, margin: '0 0 12px 0', color: '#f8fafc' }}>Nhiệm vụ hoàn tất!</h3>
            <p style={{ fontSize: 16, color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>Hệ thống không ghi nhận lệnh mới.<br/>Trạm vào chế độ nghỉ.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {tasks.map(t => (
              <div key={t.id} className="glass-task-card">
                <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 6, background: t.priority === 'CRITICAL' ? '#ef4444' : t.priority === 'HIGH' ? '#f59e0b' : '#3b82f6', boxShadow: `0 0 10px ${t.priority === 'CRITICAL' ? '#ef4444' : '#3b82f6'}` }} />
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, paddingLeft: 10 }}>
                  <div style={{ background: 'rgba(0,0,0,0.4)', padding: '6px 14px', borderRadius: 10, fontSize: 14, fontWeight: 700, color: '#cbd5e1', border: '1px solid rgba(255,255,255,0.1)' }}>
                    Mã Lệnh: <span style={{ color: stationInfo.color }}>{t.projectRef || 'SYS-000'}</span>
                  </div>
                  {t.priority === 'CRITICAL' && (
                    <div style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', padding: '6px 12px', borderRadius: 10, fontSize: 13, fontWeight: 800, border: '1px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 0 10px rgba(239,68,68,0.3)' }}>
                      <AlertTriangle size={14}/> KHẨN CẤP
                    </div>
                  )}
                </div>

                <h3 style={{ fontSize: 24, fontWeight: 900, margin: '0 0 12px 0', lineHeight: 1.3, color: '#f8fafc', paddingLeft: 10, textShadow: '0 2px 5px rgba(0,0,0,0.5)' }}>
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
                      style={{ width: '100%', padding: '20px', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', color: '#fff', border: '1px solid rgba(59,130,246,0.5)', borderRadius: 16, fontSize: 18, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, cursor: 'pointer', boxShadow: '0 0 20px rgba(59,130,246,0.4)', transition: 'transform 0.1s' }}>
                      <Play size={24} fill="currentColor" /> KHỞI ĐỘNG MÁY
                    </button>
                  ) : (
                    <div style={{ display: 'flex', gap: 12 }}>
                      <button onClick={() => updateTaskStatus(t.id, 'DONE')} 
                        style={{ flex: 1, padding: '20px', background: 'linear-gradient(135deg, #10b981, #047857)', color: '#fff', border: '1px solid rgba(16,185,129,0.5)', borderRadius: 16, fontSize: 18, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer', boxShadow: '0 0 20px rgba(16,185,129,0.4)' }}>
                        <Check size={28} strokeWidth={3} /> HOÀN THÀNH XE
                      </button>
                      <button onClick={() => alert('Đã mở form báo lỗi phôi!')} 
                        style={{ width: 72, padding: '20px 0', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.5)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: 'inset 0 0 10px rgba(239,68,68,0.2)' }}>
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
