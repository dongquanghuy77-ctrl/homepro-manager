'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Play, Check, AlertTriangle, ArrowLeft, Loader2, Trophy, Menu, Bell, User, Home, BarChart2, Activity, Zap, CheckCircle2, Factory, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- CUSTOM ANIMATED SVGS ---
const CncMachine = ({ isWorking }: { isWorking: boolean }) => (
  <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_15px_rgba(168,85,247,0.8)]">
    {/* Base/Table */}
    <rect x="20" y="70" width="60" height="10" rx="2" fill="#334155" />
    <rect x="25" y="65" width="50" height="5" fill="#475569" />
    
    {/* Moving Gantry */}
    <motion.g
      animate={isWorking ? { x: [-10, 10, -10] } : { x: 0 }}
      transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
    >
      <rect x="35" y="30" width="30" height="15" rx="3" fill="#64748b" />
      <rect x="45" y="25" width="10" height="5" fill="#a855f7" />
      
      {/* Plunging Spindle */}
      <motion.g
        animate={isWorking ? { y: [0, 15, 0] } : { y: 0 }}
        transition={{ repeat: Infinity, duration: 0.5, ease: "easeOut" }}
      >
        <rect x="46" y="45" width="8" height="15" fill="#94a3b8" />
        <polygon points="46,60 54,60 50,68" fill="#e2e8f0" />
        {/* Sparks */}
        <AnimatePresence>
          {isWorking && (
            <>
              <motion.circle cx="48" cy="68" r="2" fill="#fbbf24" initial={{ opacity: 1, x: 0, y: 0 }} animate={{ opacity: 0, x: -15, y: -10 }} transition={{ repeat: Infinity, duration: 0.3 }} />
              <motion.circle cx="52" cy="68" r="1.5" fill="#fbbf24" initial={{ opacity: 1, x: 0, y: 0 }} animate={{ opacity: 0, x: 15, y: -15 }} transition={{ repeat: Infinity, duration: 0.4 }} />
              <motion.circle cx="50" cy="68" r="2.5" fill="#fbbf24" initial={{ opacity: 1, x: 0, y: 0 }} animate={{ opacity: 0, x: 5, y: -20 }} transition={{ repeat: Infinity, duration: 0.35 }} />
            </>
          )}
        </AnimatePresence>
      </motion.g>
    </motion.g>
  </svg>
);

const EdgeMachine = ({ isWorking }: { isWorking: boolean }) => (
  <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_15px_rgba(16,185,129,0.8)]">
    {/* Machine Body */}
    <rect x="20" y="30" width="60" height="40" rx="5" fill="#334155" />
    <path d="M 25 35 h 50 v 10 h -50 z" fill="#475569" />
    <rect x="45" y="25" width="10" height="5" fill="#10b981" />
    
    {/* Rollers */}
    <circle cx="35" cy="55" r="5" fill="#94a3b8" />
    <circle cx="50" cy="55" r="5" fill="#94a3b8" />
    <circle cx="65" cy="55" r="5" fill="#94a3b8" />
    
    {/* Moving Board */}
    <motion.g
      animate={isWorking ? { x: [-30, 30] } : { x: 0 }}
      transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
    >
      <rect x="30" y="60" width="40" height="6" fill="#ca8a04" rx="1" />
      <rect x="30" y="60" width="40" height="2" fill="#fef08a" />
      {/* Light sweep effect on edge */}
      {isWorking && (
        <motion.rect x="30" y="60" width="5" height="6" fill="#10b981" filter="blur(2px)"
          animate={{ x: [0, 40] }} transition={{ repeat: Infinity, duration: 0.5, ease: "linear" }}
        />
      )}
    </motion.g>
  </svg>
);

const DrillMachine = ({ isWorking }: { isWorking: boolean }) => (
  <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_15px_rgba(14,165,233,0.8)]">
    {/* Machine Structure */}
    <path d="M 40 20 L 60 20 L 55 40 L 45 40 Z" fill="#475569" />
    <rect x="48" y="15" width="4" height="5" fill="#0ea5e9" />
    
    {/* Rotating Chuck */}
    <motion.rect x="46" y="40" width="8" height="10" fill="#94a3b8" 
      animate={isWorking ? { rotateY: 180 } : {}}
      transition={{ repeat: Infinity, duration: 0.2 }}
    />
    
    {/* Drill Bit */}
    <motion.g
      animate={isWorking ? { y: [0, 15, 0] } : { y: 0 }}
      transition={{ repeat: Infinity, duration: 0.8, ease: "easeInOut" }}
    >
      <path d="M 48 50 L 52 50 L 50 65 Z" fill="#e2e8f0" />
      {/* Wood chips flying */}
      <AnimatePresence>
        {isWorking && (
          <>
            <motion.rect x="48" y="60" width="3" height="3" fill="#ca8a04" initial={{ opacity: 1, x: 0, y: 0 }} animate={{ opacity: 0, x: -12, y: -15, rotate: 180 }} transition={{ repeat: Infinity, duration: 0.4 }} />
            <motion.rect x="50" y="60" width="2" height="4" fill="#ca8a04" initial={{ opacity: 1, x: 0, y: 0 }} animate={{ opacity: 0, x: 14, y: -10, rotate: 90 }} transition={{ repeat: Infinity, duration: 0.5 }} />
          </>
        )}
      </AnimatePresence>
    </motion.g>
    
    {/* Board */}
    <rect x="30" y="70" width="40" height="8" rx="1" fill="#854d0e" />
  </svg>
);


export default function MobileStationClient() {
  const router = useRouter();
  const [activeStation, setActiveStation] = useState<string | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [xpRewards, setXpRewards] = useState<{id: number, xp: number, x: number, y: number}[]>([]);
  const [totalXp, setTotalXp] = useState(120);
  
  const stats = {
    total: 12,
    inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
    done: 36,
    level: 12,
    progress: 85
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

  const triggerReward = (e: React.MouseEvent) => {
    const newReward = {
      id: Date.now(),
      xp: 15,
      x: e.clientX,
      y: e.clientY
    };
    setXpRewards(prev => [...prev, newReward]);
    setTotalXp(prev => prev + 15);
    setTimeout(() => {
      setXpRewards(prev => prev.filter(r => r.id !== newReward.id));
    }, 1500);
  };

  const updateTaskStatus = async (taskId: number, newStatus: string, e?: React.MouseEvent) => {
    if (newStatus === 'DONE' && e) triggerReward(e);
    
    try {
      await fetch('/api/pwr/tasks/' + taskId, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      fetchTasks(activeStation!);
    } catch (err) {
      console.error(err);
    }
  };

  const STYLES = `
    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700;900&display=swap');
    * { font-family: 'Space Grotesk', sans-serif; }
    
    .sci-fi-bg {
      background-color: #05050a;
      background-image: 
        radial-gradient(circle at 50% 0%, rgba(168, 85, 247, 0.15) 0%, transparent 50%),
        radial-gradient(circle at 100% 100%, rgba(6, 182, 212, 0.1) 0%, transparent 50%),
        linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
      background-size: 100% 100%, 100% 100%, 30px 30px, 30px 30px;
      background-position: center top;
      color: #f8fafc;
    }
    .glass-panel {
      background: rgba(20, 20, 30, 0.6); backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 20px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    }
    .nav-btn { display: flex; flex-direction: column; align-items: center; gap: 4px; color: #64748b; font-size: 10px; font-weight: 700; background: none; border: none; padding: 8px; cursor: pointer; }
    .nav-btn.active { color: #c084fc; filter: drop-shadow(0 0 8px rgba(192,132,252,0.6)); }
    .floating-center-btn {
      width: 60px; height: 60px; border-radius: 50%; background: linear-gradient(135deg, #a855f7, #7e22ce);
      display: flex; align-items: center; justify-content: center; color: white; box-shadow: 0 0 20px rgba(168,85,247,0.6);
      transform: translateY(-20px); border: 4px solid #05050a;
    }
  `;

  // --- MÀN HÌNH CHỌN TRẠM ---
  if (!activeStation) {
    return (
      <div className="sci-fi-bg" style={{ minHeight: '100vh', paddingBottom: 100 }}>
        <style dangerouslySetInnerHTML={{ __html: STYLES }} />
        
        {/* Header */}
        <div style={{ padding: '24px 20px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button style={{ background: 'none', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 12, padding: 8, color: '#fff' }}><Menu size={24} /></button>
          <div style={{ fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, color: '#10b981' }}><Activity size={16} /> 5G <span style={{ color: '#fff' }}>81%</span></div>
        </div>

        {/* Hero Title */}
        <div style={{ textAlign: 'center', marginBottom: 24, marginTop: 10 }}>
          <motion.div 
            animate={{ filter: ['drop-shadow(0 0 10px #a855f7)', 'drop-shadow(0 0 25px #a855f7)', 'drop-shadow(0 0 10px #a855f7)'] }}
            transition={{ repeat: Infinity, duration: 2 }}
            style={{ width: 64, height: 64, margin: '0 auto 16px', borderRadius: 20, background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a855f7' }}
          >
            <Factory size={32} />
          </motion.div>
          <h1 style={{ fontSize: 32, fontWeight: 900, margin: '0 0 6px 0', textShadow: '0 0 20px rgba(255,255,255,0.5)' }}>Trạm Làm Việc</h1>
        </div>

        {/* Player Profile */}
        <div style={{ padding: '0 20px', marginBottom: 30 }}>
          <div className="glass-panel" style={{ padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ position: 'relative' }}>
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Huy&backgroundColor=3b82f6" alt="Avatar" style={{ width: 50, height: 50, borderRadius: '50%', border: '2px solid #a855f7' }} />
                <div style={{ position: 'absolute', bottom: -5, left: '50%', transform: 'translateX(-50%)', background: '#a855f7', fontSize: 10, fontWeight: 900, padding: '2px 6px', borderRadius: 10 }}>Lv.12</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>Xin chào,</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>Anh Huy</div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#fbbf24', justifyContent: 'flex-end', marginBottom: 4 }}>
                <Trophy size={20} fill="currentColor" />
                <span style={{ fontSize: 22, fontWeight: 900 }}>{totalXp}</span>
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>Điểm thành tích</div>
            </div>
          </div>
        </div>

        {/* Machines */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '0 20px' }}>
          
          <motion.div whileTap={{ scale: 0.95 }} onClick={() => handleSelectStation('CNC')} style={{ background: 'linear-gradient(145deg, rgba(168,85,247,0.15), rgba(0,0,0,0.8))', border: '1px solid rgba(168,85,247,0.3)', borderRadius: 20, padding: 20, display: 'flex', alignItems: 'center', gap: 20, cursor: 'pointer' }}>
            <div style={{ width: 70, height: 70, borderRadius: '50%', border: '2px dashed rgba(168,85,247,0.5)', padding: 10 }}>
              <CncMachine isWorking={true} />
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: 22, fontWeight: 900, margin: '0 0 4px 0' }}>Tổ CNC</h2>
              <p style={{ fontSize: 13, color: '#cbd5e1', margin: 0 }}>Cắt ván, soi rãnh, đánh mòi</p>
            </div>
            <ArrowLeft size={20} style={{ transform: 'rotate(180deg)', color: '#a855f7' }} />
          </motion.div>

          <motion.div whileTap={{ scale: 0.95 }} onClick={() => handleSelectStation('DAN_CANH')} style={{ background: 'linear-gradient(145deg, rgba(16,185,129,0.15), rgba(0,0,0,0.8))', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 20, padding: 20, display: 'flex', alignItems: 'center', gap: 20, cursor: 'pointer' }}>
            <div style={{ width: 70, height: 70, borderRadius: '50%', border: '2px dashed rgba(16,185,129,0.5)', padding: 10 }}>
              <EdgeMachine isWorking={true} />
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: 22, fontWeight: 900, margin: '0 0 4px 0' }}>Tổ Dán Cạnh</h2>
              <p style={{ fontSize: 13, color: '#cbd5e1', margin: 0 }}>Dán nẹp thẳng, vát, acrylic</p>
            </div>
            <ArrowLeft size={20} style={{ transform: 'rotate(180deg)', color: '#10b981' }} />
          </motion.div>

          <motion.div whileTap={{ scale: 0.95 }} onClick={() => handleSelectStation('KHOAN_CAM')} style={{ background: 'linear-gradient(145deg, rgba(14,165,233,0.15), rgba(0,0,0,0.8))', border: '1px solid rgba(14,165,233,0.3)', borderRadius: 20, padding: 20, display: 'flex', alignItems: 'center', gap: 20, cursor: 'pointer' }}>
            <div style={{ width: 70, height: 70, borderRadius: '50%', border: '2px dashed rgba(14,165,233,0.5)', padding: 10 }}>
              <DrillMachine isWorking={true} />
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: 22, fontWeight: 900, margin: '0 0 4px 0' }}>Tổ Khoan Cam</h2>
              <p style={{ fontSize: 13, color: '#cbd5e1', margin: 0 }}>Khoan chốt, bản lề, ray trượt</p>
            </div>
            <ArrowLeft size={20} style={{ transform: 'rotate(180deg)', color: '#0ea5e9' }} />
          </motion.div>

        </div>

        {/* Quick Stats Grid */}
        <div style={{ padding: '0 20px', marginTop: 24 }}>
          <div className="glass-panel" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', padding: '16px 8px' }}>
            <div style={{ textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ color: '#94a3b8', marginBottom: 8 }}><Disc size={20} style={{ margin: '0 auto' }} /></div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>12</div>
            </div>
            <div style={{ textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ color: '#0ea5e9', marginBottom: 8 }}><Zap size={20} style={{ margin: '0 auto' }} /></div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{stats.inProgress}</div>
            </div>
            <div style={{ textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ color: '#10b981', marginBottom: 8 }}><CheckCircle2 size={20} style={{ margin: '0 auto' }} /></div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>36</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#fbbf24', marginBottom: 8 }}><Trophy size={20} style={{ margin: '0 auto' }} /></div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#fbbf24' }}>{totalXp}</div>
            </div>
          </div>
        </div>

        {/* Bottom Nav */}
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: 70, background: 'rgba(10, 10, 15, 0.9)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '0 10px', zIndex: 100 }}>
          <button className="nav-btn active"><Home size={24} /> Trạm</button>
          <button className="nav-btn"><BarChart2 size={24} /> Hạng</button>
          <motion.div animate={{ y: [-15, -20, -15] }} transition={{ repeat: Infinity, duration: 3 }} style={{ position: 'relative', width: 60, height: 60 }}>
            <button className="floating-center-btn"><Factory size={28} /></button>
          </motion.div>
          <button className="nav-btn"><Bell size={24} /> Báo cáo</button>
          <button className="nav-btn"><User size={24} /> Cá nhân</button>
        </div>
      </div>
    );
  }

  // --- MÀN HÌNH BÊN TRONG TRẠM (CHẠY MACHINE) ---
  const stationInfo = {
    CNC: { name: 'Tổ CNC', color: '#a855f7', bg: 'rgba(168,85,247,0.15)', shadow: 'rgba(168,85,247,0.4)', Component: CncMachine },
    DAN_CANH: { name: 'Tổ Dán Cạnh', color: '#10b981', bg: 'rgba(16,185,129,0.15)', shadow: 'rgba(16,185,129,0.4)', Component: EdgeMachine },
    KHOAN_CAM: { name: 'Tổ Khoan Cam', color: '#0ea5e9', bg: 'rgba(14,165,233,0.15)', shadow: 'rgba(14,165,233,0.4)', Component: DrillMachine }
  }[activeStation] || { name: '', color: '', bg: '', shadow: '', Component: CncMachine };

  const MachineCharacter = stationInfo.Component;
  const isAnyTaskWorking = tasks.some(t => t.status === 'IN_PROGRESS');

  return (
    <div className="sci-fi-bg" style={{ minHeight: '100vh' }}>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      
      {/* XP Popups */}
      {xpRewards.map(reward => (
        <motion.div key={reward.id}
          initial={{ opacity: 1, y: reward.y - 20, x: reward.x, scale: 0.5 }}
          animate={{ opacity: 0, y: reward.y - 100, scale: 1.5 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          style={{ position: 'fixed', zIndex: 9999, color: '#fbbf24', fontWeight: 900, fontSize: 24, textShadow: '0 0 10px #fbbf24', pointerEvents: 'none' }}
        >
          +{reward.xp} XP
        </motion.div>
      ))}

      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(10,10,15, 0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button onClick={() => setActiveStation(null)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f8fafc' }}><ArrowLeft size={22} /></button>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Trạm làm việc</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: stationInfo.color, textShadow: `0 0 10px ${stationInfo.shadow}` }}>{stationInfo.name}</div>
          </div>
        </div>
      </div>

      {/* Hero Machine Character Avatar */}
      <div style={{ padding: '30px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <motion.div 
          animate={isAnyTaskWorking ? { scale: [1, 1.02, 1], filter: [`drop-shadow(0 0 15px ${stationInfo.color})`, `drop-shadow(0 0 30px ${stationInfo.color})`, `drop-shadow(0 0 15px ${stationInfo.color})`] } : { scale: 1, filter: `drop-shadow(0 0 10px ${stationInfo.color})` }}
          transition={{ repeat: Infinity, duration: 2 }}
          style={{ width: 140, height: 140, borderRadius: '50%', border: `4px dashed ${stationInfo.color}`, padding: 20, background: 'rgba(0,0,0,0.5)', marginBottom: 20 }}
        >
          <MachineCharacter isWorking={isAnyTaskWorking} />
        </motion.div>
        <div style={{ fontSize: 18, fontWeight: 800, color: isAnyTaskWorking ? stationInfo.color : '#64748b', textTransform: 'uppercase', letterSpacing: 2 }}>
          {isAnyTaskWorking ? 'HỆ THỐNG ĐANG CHẠY' : 'TRẠM ĐANG NGHỈ'}
        </div>
      </div>

      {/* Task List */}
      <div style={{ padding: '0 20px', maxWidth: 600, margin: '0 auto', paddingBottom: 120 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {tasks.map(t => (
            <motion.div key={t.id} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              style={{ background: 'rgba(20,20,35,0.7)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: 20, boxShadow: '0 10px 30px rgba(0,0,0,0.5)', position: 'relative', overflow: 'hidden' }}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 6, background: t.priority === 'CRITICAL' ? '#ef4444' : '#3b82f6', boxShadow: `0 0 10px ${t.priority === 'CRITICAL' ? '#ef4444' : '#3b82f6'}` }} />
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, paddingLeft: 10 }}>
                <div style={{ background: 'rgba(0,0,0,0.4)', padding: '6px 14px', borderRadius: 10, fontSize: 14, fontWeight: 700, color: '#cbd5e1', border: '1px solid rgba(255,255,255,0.1)' }}>Mã Lệnh: <span style={{ color: stationInfo.color }}>{t.projectRef || 'SYS-000'}</span></div>
                {t.priority === 'CRITICAL' && <div style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', padding: '6px 12px', borderRadius: 10, fontSize: 13, fontWeight: 800, border: '1px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 0 10px rgba(239,68,68,0.3)' }}><ShieldAlert size={14}/> KHẨN CẤP</div>}
              </div>

              <h3 style={{ fontSize: 24, fontWeight: 900, margin: '0 0 12px 0', color: '#f8fafc', paddingLeft: 10 }}>{t.title}</h3>
              <div style={{ fontSize: 15, color: '#94a3b8', marginBottom: 24, paddingLeft: 10 }}>{t.description.split('\n')[1] || t.description}</div>

              <div style={{ paddingLeft: 10 }}>
                {t.status === 'TODO' ? (
                  <motion.button whileTap={{ scale: 0.95 }} onClick={() => updateTaskStatus(t.id, 'IN_PROGRESS')} style={{ width: '100%', padding: '20px', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', color: '#fff', border: '1px solid rgba(59,130,246,0.5)', borderRadius: 16, fontSize: 18, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, cursor: 'pointer', boxShadow: '0 0 20px rgba(59,130,246,0.4)' }}>
                    <Play size={24} fill="currentColor" /> KHỞI ĐỘNG MÁY
                  </motion.button>
                ) : (
                  <div style={{ display: 'flex', gap: 12 }}>
                    <motion.button whileTap={{ scale: 0.95 }} onClick={(e) => updateTaskStatus(t.id, 'DONE', e)} style={{ flex: 1, padding: '20px', background: 'linear-gradient(135deg, #10b981, #047857)', color: '#fff', border: '1px solid rgba(16,185,129,0.5)', borderRadius: 16, fontSize: 18, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer', boxShadow: '0 0 20px rgba(16,185,129,0.4)' }}>
                      <Check size={28} strokeWidth={3} /> HOÀN THÀNH
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.95 }} style={{ width: 72, padding: '20px 0', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.5)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: 'inset 0 0 10px rgba(239,68,68,0.2)' }}>
                      <AlertTriangle size={24} strokeWidth={2.5} />
                    </motion.button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
