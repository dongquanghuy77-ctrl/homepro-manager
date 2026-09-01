'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePwrStore } from '@/lib/pwr/usePwrStore';
import { StationWorkflowUI } from './StationWorkflowUI';
import { HomeTabUI } from './HomeTabUI';
import { LeaderboardTabUI } from './LeaderboardTabUI';
import { ReportsTabUI } from './ReportsTabUI';
import { ProfileTabUI } from './ProfileTabUI';
import { Menu, Trophy, ChevronRight, Home, BarChart2, Bell, User, Factory, BatteryMedium, Signal, CheckCircle2, ClipboardList, ArrowLeft, Play, AlertTriangle, Check, ShieldAlert } from 'lucide-react';
import CountUp from 'react-countup';

export default function MobileStationClient() {
  const router = useRouter();
  const userStationRole: string = 'CNC'; // MOCK
  const { 
    currentTab: activeTab, 
    setTab: setActiveTab, 
    activeStation, 
    setActiveStation,
    userName,
    userAvatar,
    userPoints,
    userLevel
  } = usePwrStore();

  const STYLES = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    
    * { font-family: 'Inter', sans-serif; box-sizing: border-box; }
    
    .app-container {
      background-color: #03030a;
      background-image: url('/pwr-assets/factory-bg-clean.png');
      background-size: cover;
      background-position: center top;
      background-attachment: fixed;
      background-repeat: no-repeat;
      min-height: 100vh;
      color: #ffffff;
      padding-bottom: 90px;
      position: relative;
    }

    .app-overlay {
      position: absolute; inset: 0;
      background: linear-gradient(180deg, rgba(3,3,10,0.7) 0%, rgba(3,3,10,0.5) 40%, rgba(3,3,10,0.95) 100%);
      z-index: 0; pointer-events: none;
    }

    .content-wrapper { position: relative; z-index: 10; }

    .glass-card {
      background: rgba(15, 15, 20, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 24px;
      backdrop-filter: blur(16px);
    }

    .machine-card {
      display: flex; align-items: center; padding: 16px; margin-bottom: 16px;
      border-radius: 24px; position: relative; overflow: hidden;
      cursor: pointer; transition: transform 0.2s;
    }
    .machine-card:active { transform: scale(0.98); }

    .machine-card-cnc { background: linear-gradient(90deg, rgba(139, 92, 246, 0.15) 0%, rgba(0,0,0,0.5) 100%); border: 1px solid rgba(139, 92, 246, 0.2); }
    .machine-card-edge { background: linear-gradient(90deg, rgba(16, 185, 129, 0.15) 0%, rgba(0,0,0,0.5) 100%); border: 1px solid rgba(16, 185, 129, 0.2); }
    .machine-card-drill { background: linear-gradient(90deg, rgba(14, 165, 233, 0.15) 0%, rgba(0,0,0,0.5) 100%); border: 1px solid rgba(14, 165, 233, 0.2); }

    /* ========================================= */
    /* ANIMATIONS FOR ICONS                      */
    /* ========================================= */
    
    @keyframes spin-slow { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    @keyframes spin-reverse { 0% { transform: rotate(0deg); } 100% { transform: rotate(-360deg); } }
    
    /* Vòng xoay ánh sáng chung */
    .light-ring { position: absolute; border-radius: 50%; }
    
    /* --- CNC Animations (Tia lửa, dao xoay) --- */
    .cnc-ring-1 { inset: -2px; border: 2px solid rgba(168,85,247,0.6); border-top-color: transparent; animation: spin-slow 2s linear infinite; box-shadow: 0 0 10px rgba(168,85,247,0.4); }
    .cnc-ring-2 { inset: -6px; border: 1px dashed rgba(192,132,252,0.4); animation: spin-reverse 3s linear infinite; }
    
    .spark { position: absolute; width: 3px; height: 3px; border-radius: 50%; background: #fef08a; box-shadow: 0 0 5px #fef08a; }
    .spark-1 { animation: fly1 0.6s infinite ease-out; }
    .spark-2 { animation: fly2 0.8s infinite ease-out 0.2s; }
    .spark-3 { animation: fly3 0.7s infinite ease-out 0.4s; }
    .spark-4 { animation: fly4 0.9s infinite ease-out 0.1s; background: #c084fc; box-shadow: 0 0 5px #c084fc; }
    
    @keyframes fly1 { 0% { transform: translate(0,0) scale(1); opacity: 1; } 100% { transform: translate(-20px, -10px) scale(0); opacity: 0; } }
    @keyframes fly2 { 0% { transform: translate(0,0) scale(1); opacity: 1; } 100% { transform: translate(25px, -5px) scale(0); opacity: 0; } }
    @keyframes fly3 { 0% { transform: translate(0,0) scale(1); opacity: 1; } 100% { transform: translate(-15px, -25px) scale(0); opacity: 0; } }
    @keyframes fly4 { 0% { transform: translate(0,0) scale(1); opacity: 1; } 100% { transform: translate(20px, -20px) scale(0); opacity: 0; } }

    /* --- EDGE Animations (Nẹp dán di chuyển, sáng chạy) --- */
    .edge-ring-1 { inset: -4px; border: 2px solid rgba(16,185,129,0.6); border-right-color: transparent; animation: spin-slow 2.5s linear infinite; box-shadow: 0 0 10px rgba(16,185,129,0.4); }
    
    .edge-band-track {
      position: absolute; bottom: 12px; left: 10px; right: 10px; height: 4px;
      background: rgba(16,185,129,0.2); border-radius: 2px; overflow: hidden;
    }
    .edge-band-light {
      position: absolute; top: 0; left: 0; height: 100%; width: 20px;
      background: #34d399; box-shadow: 0 0 10px #34d399;
      animation: edge-sweep 1.5s infinite linear;
    }
    @keyframes edge-sweep { 0% { transform: translateX(-20px); } 100% { transform: translateX(60px); } }

    /* --- DRILL Animations (Khoan tịnh tiến, mạt gỗ) --- */
    .drill-ring-1 { inset: -4px; border: 2px solid rgba(14,165,233,0.6); border-bottom-color: transparent; animation: spin-reverse 2s linear infinite; box-shadow: 0 0 10px rgba(14,165,233,0.4); }
    
    .drill-bit-wrapper { animation: drill-plunge 1s infinite; }
    @keyframes drill-plunge { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(8px); } }
    
    .sawdust { position: absolute; width: 4px; height: 4px; border-radius: 1px; background: #b45309; }
    .sawdust-1 { animation: dust1 1s infinite ease-out; }
    .sawdust-2 { animation: dust2 1s infinite ease-out 0.1s; }
    .sawdust-3 { animation: dust3 1s infinite ease-out 0.2s; background: #d97706; }
    
    @keyframes dust1 { 0%, 50% { transform: translate(0,0) scale(0); opacity: 0; } 55% { transform: translate(0,0) scale(1); opacity: 1; } 100% { transform: translate(-15px, -15px) rotate(45deg) scale(0); opacity: 0; } }
    @keyframes dust2 { 0%, 50% { transform: translate(0,0) scale(0); opacity: 0; } 55% { transform: translate(0,0) scale(1); opacity: 1; } 100% { transform: translate(15px, -10px) rotate(90deg) scale(0); opacity: 0; } }
    @keyframes dust3 { 0%, 50% { transform: translate(0,0) scale(0); opacity: 0; } 55% { transform: translate(0,0) scale(1); opacity: 1; } 100% { transform: translate(-5px, -20px) rotate(135deg) scale(0); opacity: 0; } }

    /* Layout utilities */
    .nav-item {
      display: flex; flex-direction: column; align-items: center; gap: 4px;
      color: #6b7280; font-size: 10px; border: none; background: none; cursor: pointer;
      transition: color 0.2s;
    }
    .nav-item.active { color: #c084fc; }
    .floating-fab {
      width: 56px; height: 56px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
      background: #03030a; border: 2px solid #374151; color: #9ca3af;
      transform: translateY(-20px); transition: all 0.2s;
    }
    .floating-fab.active {
      border: 2px solid #a855f7; color: #c084fc;
      box-shadow: 0 0 15px rgba(139,92,246,0.4), inset 0 0 15px rgba(139,92,246,0.4);
    }
  `;

  if (activeStation) {
    return <StationWorkflowUI stationId={activeStation} onBack={() => setActiveStation(null)} />;
  }

  return (
    <div className="app-container" style={{ maxWidth: 480, margin: '0 auto' }}>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <div className="app-overlay" />

      <div className="content-wrapper">
        <div style={{ height: 44 }} />

        {activeTab === 'STATION' ? (
          <>
            {/* Header Layout (Menu + Logo) */}
            <div style={{ position: 'relative', textAlign: 'center', marginBottom: 32, padding: '0 24px' }}>
              <div style={{ position: 'absolute', left: 24, top: '50%', transform: 'translateY(-50%)', zIndex: 20 }}>
                <Menu size={32} color="#f3f4f6" />
              </div>

              <div style={{ 
                width: 72, height: 72, margin: '0 auto 16px', borderRadius: 22,
                border: '2px solid #c084fc', background: 'rgba(139,92,246,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 20px rgba(168,85,247,0.5), inset 0 0 15px rgba(168,85,247,0.3)'
              }}>
                <Factory size={36} color="#e879f9" strokeWidth={1.5} />
              </div>
              
              <h1 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 8px 0', letterSpacing: '-0.5px', color: '#ffffff' }}>Trạm Làm Việc</h1>
              <p style={{ fontSize: 15, color: '#d1d5db', margin: 0, fontWeight: 500 }}>Hệ thống điều khiển máy trạm</p>
            </div>

            <div style={{ padding: '0 20px' }}>
              {/* User Profile (Tích hợp State + QA Fallback) */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flex: 1, minWidth: 0, paddingRight: 16 }}>
                  <img 
                    src={userAvatar} 
                    alt="Avatar" 
                    onError={(e) => {
                      // QA Safegard: Lỗi CDN -> Tự sinh ảnh từ Tên
                      e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=3b82f6&color=fff&bold=true`;
                    }}
                    style={{ width: 48, height: 48, minWidth: 48, borderRadius: '50%', border: '2px solid #374151', objectFit: 'cover' }} 
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: '#9ca3af' }}>Xin chào,</div>
                    {/* QA Safeguard: Truncate tên quá dài để không vỡ UI */}
                    <div style={{ fontSize: 16, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {userName}
                    </div>
                    <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>Level {userLevel}</div>
                  </div>
                </div>
                
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end', marginBottom: 4 }}>
                    <Trophy size={20} color="#fbbf24" fill="#fbbf24" />
                    <span style={{ fontSize: 24, fontWeight: 800, color: '#fbbf24' }}>
                      <CountUp end={userPoints} duration={1.5} preserveValue={true} separator="," />
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: '#9ca3af' }}>Điểm thành tích</div>
                </div>
              </div>

              {/* --- CNC CARD --- */}
              <div className="machine-card machine-card-cnc" onClick={() => setActiveStation('CNC')} style={userStationRole === 'CNC' ? { border: '2px solid #a855f7', boxShadow: '0 0 20px rgba(168,85,247,0.5)' } : { opacity: 0.4, filter: 'grayscale(1)' }}>
                <div style={{ position: 'relative', width: 64, height: 64, minWidth: 64, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(76, 29, 149, 0.3)', flexShrink: 0, boxShadow: '0 0 15px rgba(139,92,246,0.5)' }}>
                  <div className="light-ring cnc-ring-1"></div>
                  <div className="light-ring cnc-ring-2"></div>
                  <div style={{ position: 'relative', zIndex: 10, width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden' }}>
                    <img src="/pwr-assets/cnc-icon-3d.png" alt="CNC 3D" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%', transform: 'scale(1.05)' }} />
                  </div>
                  <div style={{ position: 'absolute', bottom: 8, left: '50%', zIndex: 20 }}>
                     <div className="spark spark-1"></div><div className="spark spark-2"></div>
                     <div className="spark spark-3"></div><div className="spark spark-4"></div>
                  </div>
                </div>
                
                <div style={{ flex: 1, paddingLeft: 16 }}>
                  <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Tổ CNC {userStationRole === 'CNC' && <span style={{ fontSize: 10, background: '#a855f7', padding: '2px 6px', borderRadius: 4, marginLeft: 8 }}>TRẠM CỦA BẠN</span>}</div>
                  <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 12 }}>Cắt ván, soi rãnh, đánh mòi</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Trophy size={14} color="#fbbf24" fill="#fbbf24" />
                    <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
                      <div style={{ width: '85%', height: '100%', background: '#a855f7', borderRadius: 2, boxShadow: '0 0 8px #a855f7' }} />
                    </div>
                    <span style={{ fontSize: 12, color: '#a855f7', fontWeight: 600 }}>85%</span>
                  </div>
                </div>
                <div style={{ width: 32, height: 32, minWidth: 32, borderRadius: '50%', background: 'rgba(139,92,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 12 }}>
                  <ChevronRight size={18} color="#c084fc" />
                </div>
              </div>

              {/* --- EDGE CARD --- */}
              <div className="machine-card machine-card-edge" onClick={() => setActiveStation('DAN_CANH')} style={userStationRole === 'DAN_CANH' ? { border: '2px solid #10b981', boxShadow: '0 0 20px rgba(16,185,129,0.5)' } : { opacity: 0.4, filter: 'grayscale(1)' }}>
                <div style={{ position: 'relative', width: 64, height: 64, minWidth: 64, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(6, 78, 59, 0.3)', flexShrink: 0, boxShadow: 'inset 0 0 20px rgba(16,185,129,0.4)' }}>
                  <div className="light-ring edge-ring-1"></div>
                  <div style={{ position: 'relative', zIndex: 10, width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden' }}>
                    <img src="/pwr-assets/edge-icon-3d.png" alt="Edge 3D" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%', transform: 'scale(1.05)' }} />
                  </div>
                  <div className="edge-band-track" style={{ zIndex: 20 }}>
                    <div className="edge-band-light"></div>
                  </div>
                </div>
                <div style={{ flex: 1, paddingLeft: 16 }}>
                  <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Tổ Dán Cạnh {userStationRole === 'DAN_CANH' && <span style={{ fontSize: 10, background: '#10b981', padding: '2px 6px', borderRadius: 4, marginLeft: 8 }}>TRẠM CỦA BẠN</span>}</div>
                  <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 12 }}>Dán nẹp thẳng, vát, acrylic</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Trophy size={14} color="#fbbf24" fill="#fbbf24" />
                    <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
                      <div style={{ width: '70%', height: '100%', background: '#10b981', borderRadius: 2, boxShadow: '0 0 8px #10b981' }} />
                    </div>
                    <span style={{ fontSize: 12, color: '#10b981', fontWeight: 600 }}>70%</span>
                  </div>
                </div>
                <div style={{ width: 32, height: 32, minWidth: 32, borderRadius: '50%', background: 'rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 12 }}>
                  <ChevronRight size={18} color="#34d399" />
                </div>
              </div>

              {/* --- DRILL CARD --- */}
              <div className="machine-card machine-card-drill" onClick={() => setActiveStation('KHOAN_CAM')} style={userStationRole === 'KHOAN_CAM' ? { border: '2px solid #3b82f6', boxShadow: '0 0 20px rgba(59,130,246,0.5)' } : { opacity: 0.4, filter: 'grayscale(1)' }}>
                <div style={{ position: 'relative', width: 64, height: 64, minWidth: 64, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(30, 58, 138, 0.3)', flexShrink: 0, boxShadow: '0 0 15px rgba(59,130,246,0.5)' }}>
                  <div className="drill-bit"></div>
                  <div className="drill-particle p-1"></div>
                  <div className="drill-particle p-2"></div>
                  <div className="drill-particle p-3"></div>
                  <div style={{ position: 'relative', zIndex: 10, width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden' }}>
                    <img src="/pwr-assets/drill-icon-3d.png" alt="Drill 3D" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%', transform: 'scale(1.05)' }} />
                  </div>
                </div>
                <div style={{ flex: 1, paddingLeft: 16 }}>
                  <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Tổ Khoan Cam {userStationRole === 'KHOAN_CAM' && <span style={{ fontSize: 10, background: '#3b82f6', padding: '2px 6px', borderRadius: 4, marginLeft: 8 }}>TRẠM CỦA BẠN</span>}</div>
                  <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 12 }}>Khoan chốt, bản lề, ray trượt</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Trophy size={14} color="#fbbf24" fill="#fbbf24" />
                    <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
                      <div style={{ width: '60%', height: '100%', background: '#0ea5e9', borderRadius: 2, boxShadow: '0 0 8px #0ea5e9' }} />
                    </div>
                    <span style={{ fontSize: 12, color: '#0ea5e9', fontWeight: 600 }}>60%</span>
                  </div>
                </div>
                <div style={{ width: 32, height: 32, minWidth: 32, borderRadius: '50%', background: 'rgba(14,165,233,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 12 }}>
                  <ChevronRight size={18} color="#38bdf8" />
                </div>
              </div>

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
          </>
        ) : activeTab === 'HOME' ? (
          <HomeTabUI />
        ) : activeTab === 'LEADERBOARD' ? (
          <LeaderboardTabUI />
        ) : activeTab === 'REPORTS' ? (
          <ReportsTabUI />
        ) : activeTab === 'PROFILE' ? (
          <ProfileTabUI />
        ) : null}
      </div>

      {/* Floating Bottom Nav */}
      <div style={{ 
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', 
        width: '100%', maxWidth: 480, height: 70,
        background: 'rgba(10, 10, 15, 0.95)', borderTop: '1px solid rgba(255,255,255,0.05)',
        display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '0 16px',
        zIndex: 100, backdropFilter: 'blur(20px)'
      }}>
        <button className={`nav-item ${activeTab === 'HOME' ? 'active' : ''}`} onClick={() => setActiveTab('HOME')}><Home size={24} /> Trang chủ</button>
        <button className={`nav-item ${activeTab === 'LEADERBOARD' ? 'active' : ''}`} onClick={() => setActiveTab('LEADERBOARD')}><BarChart2 size={24} /> Hạng</button>
        <div style={{ position: 'relative', width: 56, height: 56 }}><button className={`floating-fab ${activeTab === 'STATION' ? 'active' : ''}`} onClick={() => setActiveTab('STATION')}><Factory size={24} /></button></div>
        <button className={`nav-item ${activeTab === 'REPORTS' ? 'active' : ''}`} onClick={() => setActiveTab('REPORTS')}><Bell size={24} /> Báo cáo</button>
        <button className={`nav-item ${activeTab === 'PROFILE' ? 'active' : ''}`} onClick={() => setActiveTab('PROFILE')}><User size={24} /> Cá nhân</button>
      </div>
    </div>
  );
}
