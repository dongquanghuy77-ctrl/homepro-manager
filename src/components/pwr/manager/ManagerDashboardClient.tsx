'use client';
import React, { useEffect, useState } from 'react';
import { Users, Factory, Trophy, CheckCircle2, AlertTriangle, RefreshCw, Loader2 } from 'lucide-react';

const STATION_COLORS: Record<string, string> = {
  'CNC': '#3b82f6',
  'DAN_CANH': '#f59e0b',
  'KHOAN_CAM': '#10b981',
  'DONG_GOI': '#8b5cf6',
  'INBOX': '#9ca3af'
};

const STATION_NAMES: Record<string, string> = {
  'CNC': 'Máy CNC',
  'DAN_CANH': 'Dán Cạnh',
  'KHOAN_CAM': 'Khoan Cam',
  'DONG_GOI': 'Đóng Gói',
  'INBOX': 'Hàng đợi'
};

const c = {
  bg: '#0a0a0f', card: '#111118', border: 'rgba(255,255,255,0.08)',
  text: '#ffffff', muted: '#9ca3af',
  accent: '#c084fc', success: '#10b981', warning: '#f59e0b', danger: '#ef4444', blue: '#3b82f6', yellow: '#fbbf24'
};

export default function ManagerDashboardClient() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/pwr/manager');
      const d = await res.json();
      setData(d);
      setLastUpdated(new Date().toLocaleTimeString('vi-VN'));
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ padding: 24, background: c.bg, minHeight: '100vh', color: c.text }}>
      <style>{`@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 800, margin: '0 0 8px 0', color: c.accent }}>
            📊 Bảng Điều Hành Xưởng
          </h1>
          <p style={{ color: c.muted, margin: 0 }}>
            Tổng quan real-time — Cập nhật lúc: {lastUpdated || 'đang tải...'}
          </p>
        </div>
        <button onClick={fetchData} style={{ background: 'rgba(192,132,252,0.1)', color: c.accent, border: '1px solid rgba(192,132,252,0.3)', borderRadius: 10, padding: '10px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <RefreshCw size={16} /> Làm mới
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 80, color: c.muted }}>
          <Loader2 size={48} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 16px', display: 'block' }} />
          <p>Đang tải dữ liệu xưởng...</p>
        </div>
      ) : !data ? (
        <div style={{ textAlign: 'center', padding: 60, color: c.danger }}>
          Lỗi tải dữ liệu. Vui lòng thử lại.
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 32 }}>
            {[
              { label: 'Worker đang hoạt động', value: data.activeWorkerCount, icon: Users, color: c.blue, sub: 'hôm nay' },
              { label: 'Task hoàn thành', value: data.doneToday, icon: CheckCircle2, color: c.success, sub: 'hôm nay' },
              { label: 'Task đang chờ/làm', value: data.totalPending, icon: Factory, color: c.yellow, sub: 'toàn xưởng' },
              { label: 'Báo lỗi vật tư', value: data.defectsToday, icon: AlertTriangle, color: c.danger, sub: 'hôm nay' },
            ].map(({ label, value, icon: Icon, color, sub }) => (
              <div key={label} style={{ background: c.card, border: '1px solid ' + c.border, borderRadius: 16, padding: 20, borderTop: '4px solid ' + color }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <Icon size={24} color={color} />
                  <div style={{ fontSize: 11, color: c.muted, textTransform: 'uppercase' }}>{label}</div>
                </div>
                <div style={{ fontSize: 36, fontWeight: 800 }}>{value ?? 0}</div>
                <div style={{ fontSize: 12, color: c.muted }}>{sub}</div>
              </div>
            ))}
          </div>

          {/* Progress Bar */}
          <div style={{ background: c.card, border: '1px solid ' + c.border, borderRadius: 16, padding: 20, marginBottom: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontWeight: 600 }}>Tỷ lệ hoàn thành hôm nay</span>
              <span style={{ color: c.success, fontWeight: 800, fontSize: 20 }}>{data.completionRate}%</span>
            </div>
            <div style={{ height: 12, background: 'rgba(255,255,255,0.08)', borderRadius: 6, overflow: 'hidden' }}>
              <div style={{ width: data.completionRate + '%', height: '100%', background: 'linear-gradient(90deg,#10b981,#34d399)', borderRadius: 6, transition: 'width 1s ease' }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
            {/* Task by Station */}
            <div style={{ background: c.card, border: '1px solid ' + c.border, borderRadius: 16, padding: 24 }}>
              <h3 style={{ margin: '0 0 20px 0', fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Factory size={20} color={c.accent} /> Task theo Trạm
              </h3>
              {(data.stationStats?.length === 0) ? (
                <p style={{ color: c.muted, textAlign: 'center', padding: 20 }}>Chưa có task nào</p>
              ) : (data.stationStats || []).map((s: any) => {
                const done = parseInt(s.done || '0');
                const active = parseInt(s.active || '0');
                const inProgress = parseInt(s.in_progress || '0');
                const total = done + active;
                const pct = total === 0 ? 0 : Math.round((done / total) * 100);
                
                return (
                  <div key={s.station} style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ color: STATION_COLORS[s.station] || '#9ca3af', fontWeight: 600 }}>
                        {STATION_NAMES[s.station] || s.station}
                      </span>
                      <span style={{ color: c.muted, fontSize: 13 }}>
                        ✅ {done} • ⏳ {active - inProgress} • 🔄 {inProgress} ({pct}%)
                      </span>
                    </div>
                    <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: STATION_COLORS[s.station] || '#9ca3af', borderRadius: 3 }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Active Workers */}
            <div style={{ background: c.card, border: '1px solid ' + c.border, borderRadius: 16, padding: 24 }}>
              <h3 style={{ margin: '0 0 20px 0', fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Users size={20} color={c.blue} /> Worker Hoạt Động Hôm Nay
              </h3>
              {(data.activeWorkers?.length === 0) ? (
                <p style={{ color: c.muted, textAlign: 'center', padding: 20 }}>Chưa có thợ nào hoàn thành task hôm nay</p>
              ) : (data.activeWorkers || []).slice(0, 6).map((w: any) => (
                <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 10 }}>
                  <div style={{ fontWeight: 600 }}>{w.name}</div>
                  <div style={{ color: c.success, fontWeight: 700 }}>✅ {w.tasks_done_today} task</div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Workers Leaderboard */}
          <div style={{ background: c.card, border: '1px solid ' + c.border, borderRadius: 16, padding: 24 }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Trophy size={20} color={c.yellow} /> Top 5 Thợ Xuất Sắc
            </h3>
            {(data.topWorkers || []).map((w: any, i: number) => (
              <div key={w.userId} style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12, padding: '12px 16px', background: i === 0 ? 'rgba(251,191,36,0.05)' : 'rgba(255,255,255,0.02)', borderRadius: 12, border: i === 0 ? '1px solid rgba(251,191,36,0.2)' : '1px solid transparent' }}>
                <div style={{ fontSize: 20, fontWeight: 800, width: 32, textAlign: 'center', color: i === 0 ? c.yellow : i === 1 ? '#94a3b8' : i === 2 ? '#b45309' : c.muted }}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700 }}>{w.name}</div>
                  <div style={{ fontSize: 12, color: c.muted }}>Lv.{w.currentLevel} • {w.tasksCompleted} tasks done</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 800, color: c.yellow }}>{w.totalPoints.toLocaleString()} XP</div>
                </div>
              </div>
            ))}
            {(!data.topWorkers || data.topWorkers.length === 0) && (
              <p style={{ color: c.muted, textAlign: 'center', padding: 20 }}>Chưa có dữ liệu điểm</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}