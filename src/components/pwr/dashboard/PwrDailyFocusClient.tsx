'use client';
import { useState, useEffect } from 'react';
import { AlertCircle, Clock, CalendarCheck, Play } from 'lucide-react';
import Link from 'next/link';
import type { PwrTask, PwrStatus, PwrPriority } from '@/db/schema';
import { getTodayVN, TERMINAL_STATUSES, PWR_PRIORITY } from '@/lib/pwr/constants';

interface Props { tasks: PwrTask[]; userName: string; }

export default function PwrDailyFocusClient({ tasks, userName }: Props) {
  const [time, setTime] = useState('');
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const tick = () => {
      const vn = new Date(Date.now() + 7*3600000);
      setTime(vn.toTimeString().slice(0,5));
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  const todayVN = getTodayVN();
  const nowStr  = new Date(Date.now() + 7*3600000).toISOString().split('T')[0];
  const hour    = parseInt(time.split(':')[0]||'8');

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

  const greetIcon = hour < 12 ? '🌅' : hour < 18 ? '☀️' : '🌙';
  const greetText = hour < 12 ? 'Chào buổi sáng' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';
  const dateStr   = new Date(Date.now()+7*3600000).toLocaleDateString('vi-VN', { weekday:'long', day:'2-digit', month:'2-digit', year:'numeric' });

  return (
    <div style={{ minHeight:'100vh', background:'radial-gradient(ellipse at 20% 20%,#1e3a5f 0%,#0f172a 45%,#0a0f1e 100%)', display:'flex', alignItems:'center', justifyContent:'center', padding:24, position:'relative', overflow:'hidden' }}>
      {/* Particles via CSS */}
      <div style={{ position:'absolute', inset:0, pointerEvents:'none' }}>
        {Array.from({length:30}).map((_,i) => (
          <span key={i} className="pwr-particle" style={{
            position:'absolute', borderRadius:'50%', background:'#fff',
            width: (Math.random()*2+1)+'px', height:(Math.random()*2+1)+'px',
            left:Math.random()*100+'%', top:Math.random()*100+'%',
            ['--dur' as string]: (2+Math.random()*4)+'s',
            ['--delay' as string]: (Math.random()*5)+'s',
          } as React.CSSProperties}/>
        ))}
      </div>

      <div className="pwr-fadein" style={{ width:'100%', maxWidth:540, position:'relative', zIndex:1 }}>
        {/* Clock */}
        <div className="pwr-fadein-1" style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ fontSize:13, color:'#475569' }}>🕐 {time} • {dateStr}</div>
        </div>

        {/* Greeting */}
        <div className="pwr-scalein" style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ fontSize:44 }}>{greetIcon}</div>
          <h1 style={{ margin:'12px 0 8px', fontSize:30, fontWeight:800, color:'#f1f5f9', lineHeight:1.2 }}>
            {greetText},&nbsp;
            <span style={{ background:'linear-gradient(135deg,#60a5fa,#a78bfa)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
              {userName}!
            </span>
          </h1>
          <p style={{ margin:0, color:'#64748b', fontSize:14 }}>
            Hôm nay bạn có <strong style={{ color:'#94a3b8' }}>{todayTasks.length+overdue.length}</strong> công việc cần xử lý
          </p>
        </div>

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:28 }}>
          {[
            { label:'QUÁ HẠN',  count:overdue.length,    color:'#ef4444', icon:<AlertCircle size={18}/>, desc:'Cần xử lý ngay',  cls:'pwr-fadein-2' },
            { label:'HÔM NAY',  count:todayTasks.length,  color:'#f59e0b', icon:<Clock size={18}/>,       desc:'Phải hoàn thành', cls:'pwr-fadein-3' },
            { label:'SẮP TỚI',  count:upcoming.length,    color:'#3b82f6', icon:<CalendarCheck size={18}/>, desc:'Trong 3 ngày', cls:'pwr-fadein-4' },
          ].map(c => (
            <div key={c.label} className={"pwr-card " + c.cls}
              style={{ background:c.color+'12', border:'1px solid '+c.color+'28', borderRadius:12, padding:'16px 12px', textAlign:'center' }}>
              <div style={{ color:c.color, display:'flex', justifyContent:'center', marginBottom:6 }}>{c.icon}</div>
              <div style={{ fontSize:10, color:c.color, fontWeight:700, textTransform:'uppercase', letterSpacing:1.2 }}>{c.label}</div>
              <div style={{ fontSize:34, fontWeight:800, color:c.color, lineHeight:1, margin:'6px 0' }}>{c.count}</div>
              <div style={{ fontSize:11, color:'#475569' }}>{c.desc}</div>
            </div>
          ))}
        </div>

        {/* Top 3 */}
        {top3.length > 0 && (
          <div className="pwr-fadein-5" style={{ marginBottom:28 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'#f59e0b', textTransform:'uppercase', letterSpacing:1.5, marginBottom:12 }}>
              ⭐ TOP 3 CÔNG VIỆC QUAN TRỌNG HÔM NAY
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {top3.map((task,i) => {
                const pr = PWR_PRIORITY[task.priority as PwrPriority];
                const nums = ['①','②','③'];
                return (
                  <Link key={task.id} href={"/pwr/tasks/"+task.id}
                    style={{ display:'flex', alignItems:'center', gap:12, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:10, padding:'12px 16px', textDecoration:'none', transition:'background 0.2s' }}
                    onMouseEnter={e=>(e.currentTarget.style.background='rgba(59,130,246,0.1)')}
                    onMouseLeave={e=>(e.currentTarget.style.background='rgba(255,255,255,0.04)')}>
                    <span style={{ width:26, height:26, borderRadius:'50%', background:'rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0 }}>{nums[i]}</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:'#e2e8f0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{task.title}</div>
                      <div style={{ fontSize:11, color:'#475569', marginTop:2 }}>
                        {task.dueDate&&'Deadline '+task.dueDate} {task.projectRef&&'• '+task.projectRef}
                      </div>
                    </div>
                    <span style={{ background:pr?.color+'20', color:pr?.color, fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:4, flexShrink:0, textTransform:'uppercase' }}>{pr?.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="pwr-fadein-6">
          {!started ? (
            <button className="pwr-btn-glow"
              onClick={()=>{ setStarted(true); setTimeout(()=>window.location.href='/pwr/kanban',600); }}
              style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:12, background:'linear-gradient(135deg,#3b82f6 0%,#6366f1 100%)', color:'#fff', border:'none', borderRadius:12, padding:'17px', fontSize:16, fontWeight:700, cursor:'pointer', letterSpacing:0.5, transition:'transform 0.15s' }}
              onMouseEnter={e=>(e.currentTarget.style.transform='scale(1.02)')}
              onMouseLeave={e=>(e.currentTarget.style.transform='scale(1)')}>
              <Play size={18} fill="white"/> BẮT ĐẦU NGÀY LÀM VIỆC
            </button>
          ) : (
            <div style={{ textAlign:'center', color:'#3b82f6', fontWeight:600, fontSize:15, padding:17 }}>
              Đang chuyển đến My Work Center...
            </div>
          )}
          <p style={{ textAlign:'center', fontSize:11, color:'#334155', marginTop:10 }}>
            Hệ thống sẽ bắt đầu theo dõi thời gian làm việc của bạn
          </p>
        </div>
      </div>
    </div>
  );
}
