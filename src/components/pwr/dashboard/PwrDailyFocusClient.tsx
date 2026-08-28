'use client';
import { useState, useEffect } from 'react';
import { AlertCircle, Clock, CalendarCheck, Play } from 'lucide-react';
import Link from 'next/link';
import type { PwrTask, PwrStatus, PwrPriority } from '@/db/schema';
import { getTodayVN, TERMINAL_STATUSES, PWR_PRIORITY } from '@/lib/pwr/constants';

interface Props { tasks: PwrTask[]; userName: string; }

export default function PwrDailyFocusClient({ tasks, userName }: Props) {
  const [time, setTime] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [started, setStarted] = useState(false);
  const [hour, setHour] = useState(8);

  // Fix timezone issue by fetching time strictly from client side
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }));
      setDateStr(now.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }));
      setHour(now.getHours());
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  const todayVN = getTodayVN();
  const nowStr  = new Date(Date.now() + 7*3600000).toISOString().split('T')[0];

  const overdue    = tasks.filter(t => t.dueDate && t.dueDate < nowStr && !TERMINAL_STATUSES.includes(t.status as PwrStatus));
  const todayTasks = tasks.filter(t => t.dueDate === todayVN && !TERMINAL_STATUSES.includes(t.status as PwrStatus));
  const upcoming   = tasks.filter(t => t.dueDate && t.dueDate > todayVN && !TERMINAL_STATUSES.includes(t.status as PwrStatus));

  const pOrder: Record<string,number> = { CRITICAL:0, HIGH:1, MEDIUM:2, LOW:3 };
  const top3 = [...tasks]
    .filter(t => !TERMINAL_STATUSES.includes(t.status as PwrStatus))
    .sort((a,b) => {
      if (a.dueDate===todayVN && b.dueDate!==todayVN) return -1;
      if (b.dueDate===todayVN && a.dueDate!==todayVN) return  1;
      return (pOrder[a.priority]??9)-(pOrder[b.priority]??9);
    }).slice(0,3);

  const greetIcon = hour < 12 ? '🌅' : hour < 18 ? '☀️' : '👋';
  const greetText = hour < 12 ? 'Chào buổi sáng' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';

  return (
    <div style={{ 
      minHeight: '100vh', 
      // Mesh gradient background replacing the starry night
      background: 'radial-gradient(circle at 15% 50%, rgba(245, 158, 11, 0.12), transparent 40%), radial-gradient(circle at 85% 30%, rgba(16, 185, 129, 0.12), transparent 40%), radial-gradient(circle at 50% 100%, rgba(56, 189, 248, 0.08), transparent 50%), #0f172a',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, position: 'relative', overflow: 'hidden', 
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' 
    }}>
      
      <div className="pwr-fadein" style={{ width: '100%', maxWidth: 580, position: 'relative', zIndex: 1 }}>
        
        {/* Clock */}
        <div className="pwr-fadein-1" style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.05)', padding: '6px 16px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.1)', fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>
             <Clock size={14} /> 
             {time ? `${time} • ${dateStr}` : 'Đang đồng bộ thời gian...'}
          </div>
        </div>

        {/* Elegant Greeting */}
        <div className="pwr-scalein" style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 8 }}>
            <span style={{ fontSize: 32 }}>{greetIcon}</span>
            <h1 style={{ fontSize: 32, fontWeight: 500, color: '#f8fafc', margin: 0, letterSpacing: '-0.02em' }}>
              {greetText}, <span style={{ fontWeight: 800 }}>{userName.toUpperCase()}</span>
            </h1>
          </div>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: 15 }}>
            Hôm nay bạn có <strong style={{ color: '#f8fafc' }}>{todayTasks.length + overdue.length}</strong> công việc cần xử lý
          </p>
        </div>

        {/* ── Sprint C: Daily Productivity Score ── */}
        {(() => {
          const doneToday   = tasks.filter(t => t.status === 'DONE' && t.completedAt && new Date(t.completedAt).toISOString().split('T')[0].localeCompare(todayVN) === 0).length;
          const activeToday = tasks.filter(t => !TERMINAL_STATUSES.includes(t.status as PwrStatus) || (t.status === 'DONE' && t.completedAt && new Date(t.completedAt).toISOString().split('T')[0].localeCompare(todayVN) === 0)).filter(t => t.dueDate && t.dueDate <= todayVN).length;
          const totalDue    = Math.max(activeToday, 1); // avoid 0/0
          const pctScore    = activeToday > 0 ? Math.round((doneToday / totalDue) * 100) : 0;
          const scoreColor  = pctScore >= 80 ? '#10b981' : pctScore >= 50 ? '#f59e0b' : '#ef4444';
          const scoreEmoji  = pctScore >= 80 ? '🔥' : pctScore >= 50 ? '📈' : pctScore > 0 ? '⚡' : '🎯';
          const scoreLabel  = pctScore >= 80 ? 'Xuất sắc!' : pctScore >= 50 ? 'Đang tốt' : pctScore > 0 ? 'Cần cố lên' : 'Bắt đầu nào!';
          return (
            <div className="pwr-fadein-2" style={{ marginBottom: 28, background: 'rgba(255,255,255,0.03)', border: `1px solid ${scoreColor}30`, borderRadius: 16, padding: '20px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: scoreColor, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 }}>
                    {scoreEmoji} NĂNG SUẤT HÔM NAY
                  </div>
                  <div style={{ fontSize: 13, color: '#94a3b8' }}>
                    Đã hoàn thành <strong style={{ color: '#f1f5f9' }}>{doneToday}</strong>{' '}
                    trong số <strong style={{ color: '#f1f5f9' }}>{activeToday}</strong> việc đến hạn hôm nay
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 42, fontWeight: 900, color: scoreColor, lineHeight: 1 }}>{pctScore}<span style={{ fontSize: 20 }}>%</span></div>
                  <div style={{ fontSize: 12, color: scoreColor, fontWeight: 600, marginTop: 2 }}>{scoreLabel}</div>
                </div>
              </div>
              {/* Progress bar */}
              <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pctScore}%`, background: scoreColor, borderRadius: 99, transition: 'width 0.6s ease' }} />
              </div>
            </div>
          );
        })()}

        {/* Stats Glassmorphism Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 36 }}>
          {[
            { label: 'QUÁ HẠN',  count: overdue.length,    color: '#ef4444', icon: <AlertCircle size={18}/>, desc: 'Cần xử lý ngay',  cls: 'pwr-fadein-2' },
            { label: 'HÔM NAY',  count: todayTasks.length,  color: '#f59e0b', icon: <Clock size={18}/>,       desc: 'Phải hoàn thành', cls: 'pwr-fadein-3' },
            { label: 'SẮP TỚI',  count: upcoming.length,    color: '#38bdf8', icon: <CalendarCheck size={18}/>, desc: 'Trong 3 ngày', cls: 'pwr-fadein-4' },
          ].map(c => (
            <div key={c.label} className={"pwr-card " + c.cls}
              style={{ 
                background: 'rgba(255,255,255,0.03)', 
                backdropFilter: 'blur(12px)',
                border: `1px solid ${c.color}30`, 
                borderRadius: 16, padding: '20px 16px', textAlign: 'center',
                boxShadow: '0 4px 24px rgba(0,0,0,0.1)'
              }}>
              <div style={{ color: c.color, display: 'flex', justifyContent: 'center', marginBottom: 8 }}>{c.icon}</div>
              <div style={{ fontSize: 11, color: c.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5 }}>{c.label}</div>
              <div style={{ fontSize: 38, fontWeight: 800, color: '#f8fafc', lineHeight: 1, margin: '10px 0' }}>{c.count}</div>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>{c.desc}</div>
            </div>
          ))}
        </div>

        {/* Top 3 */}
        {top3.length > 0 && (
          <div className="pwr-fadein-5" style={{ marginBottom: 36 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 16 }}>
              ⭐ TOP 3 CÔNG VIỆC QUAN TRỌNG HÔM NAY
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {top3.map((task, i) => {
                const pr = PWR_PRIORITY[task.priority as PwrPriority];
                const nums = ['①', '②', '③'];
                return (
                  <Link key={task.id} href={"/pwr/tasks/" + task.id + "?from=focus"}
                    style={{ 
                      display: 'flex', alignItems: 'center', gap: 16, 
                      background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, 
                      padding: '16px 20px', textDecoration: 'none', transition: 'all 0.2s' 
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}>
                    <span style={{ fontSize: 24, color: '#94a3b8', flexShrink: 0, fontWeight: 300 }}>{nums[i]}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{task.title}</div>
                      <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                        Deadline: {task.dueDate}
                        {task.projectRef && <span style={{ marginLeft: 6 }}>• {task.projectRef}</span>}
                      </div>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: pr?.color, background: (pr?.color||'#3b82f6')+'20', padding: '4px 10px', borderRadius: 6, flexShrink: 0, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      {pr?.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="pwr-fadein-5" style={{ textAlign: 'center' }}>
          {!started ? (
            <button onClick={() => setStarted(true)}
              style={{ 
                display: 'inline-flex', alignItems: 'center', gap: 10, 
                background: '#f8fafc', color: '#0f172a', border: 'none', borderRadius: 14, 
                padding: '16px 48px', fontSize: 15, fontWeight: 700, cursor: 'pointer', 
                boxShadow: '0 8px 32px rgba(255,255,255,0.1)', letterSpacing: 0.5,
                transition: 'transform 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              <Play size={18} fill="#0f172a"/> BẮT ĐẦU NGÀY LÀM VIỆC
            </button>
          ) : (
            <div style={{ color: '#10b981', fontSize: 14, fontWeight: 600, background: 'rgba(16,185,129,0.1)', padding: '16px', borderRadius: 12, border: '1px solid rgba(16,185,129,0.2)' }}>
              ✅ Ngày làm việc đã bắt đầu! Hệ thống đã ghi lại thời gian.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
