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
    <div style={{ minHeight:'100vh', background:'radial-gradient(ellipse at 20% 20%,#1e3a5f 0%,#0f172a 45%,#0a0f1e 100%)', display:'flex', alignItems:'center', justifyContent:'center', padding:24, position:'relative', overflow:'hidden', fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif' }}>
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

        {/* Greeting with SEP */}
        <div className="pwr-scalein" style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ fontSize:44 }}>{greetIcon}</div>
          <p style={{ margin:'10px 0 4px', fontSize:14, color:'#94a3b8', fontWeight:500, letterSpacing:1 }}>
            {greetText},
          </p>
          <div style={{ display:'flex', alignItems:'baseline', justifyContent:'center', gap:14, flexWrap:'wrap', marginBottom:10 }}>
            <span style={{
              fontSize:54, fontWeight:900, letterSpacing:8,
              color:'#f59e0b',
              textShadow:'0 0 30px rgba(245,158,11,0.8), 0 0 60px rgba(245,158,11,0.4)',
              lineHeight:1, fontFamily:'inherit',
            }}>
              SẶP
            </span>
            <span style={{
              fontSize:28, fontWeight:800, lineHeight:1,
              background:'linear-gradient(135deg,#60a5fa,#a78bfa)',
              WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
            }}>
              {userName}!
            </span>
          </div>
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
              ⭐ TOP 3 CÔNG VIỆC QUAN TRỌỎNG HÔM NAY
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
                    <span style={{ fontSize:20, flexShrink:0 }}>{nums[i]}</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:'#f1f5f9', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{task.title}</div>
                      <div style={{ fontSize:11, color:'#475569', marginTop:2 }}>
                        Deadline {task.dueDate}
                        {task.projectRef && <span style={{ marginLeft:6 }}>• {task.projectRef}</span>}
                      </div>
                    </div>
                    <span style={{ fontSize:10, fontWeight:700, color:pr?.color, background:(pr?.color||'#3b82f6')+'20', padding:'3px 8px', borderRadius:4, flexShrink:0, textTransform:'uppercase' }}>
                      {pr?.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="pwr-fadein-5" style={{ textAlign:'center' }}>
          {!started ? (
            <button onClick={()=>setStarted(true)}
              style={{ display:'inline-flex', alignItems:'center', gap:10, background:'linear-gradient(135deg,#3b82f6,#6366f1)', color:'#fff', border:'none', borderRadius:12, padding:'16px 40px', fontSize:15, fontWeight:700, cursor:'pointer', boxShadow:'0 8px 24px rgba(59,130,246,0.4)', letterSpacing:0.5 }}>
              <Play size={18} fill="#fff"/> BẮt ĐẦU NGÀY LÀM VIỆC
            </button>
          ) : (
            <div style={{ color:'#10b981', fontSize:14, fontWeight:600 }}>
              ✅ Ngày làm việc đã bắt đầu! Hệ thống đã ghi lại thời gian bắt đầu làm việc của bạn.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
