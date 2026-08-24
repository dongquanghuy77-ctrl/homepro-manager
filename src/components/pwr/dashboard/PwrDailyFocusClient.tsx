'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Clock, CalendarCheck, Play, Sun, Moon, Sunrise } from 'lucide-react';
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
    <div style={{ minHeight:'100vh', background:'radial-gradient(ellipse at 20% 20%,#1e3a5f 0%,#0f172a 45%,#0a0f1e 100%)', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      {/* Particles */}
      <div style={{ position:'fixed', inset:0, pointerEvents:'none', overflow:'hidden' }}>
        {Array.from({length:50}).map((_,i) => (
          <motion.div key={i}
            animate={{ opacity:[0.05,0.5,0.05], scale:[1,1.3,1] }}
            transition={{ duration:2+Math.random()*4, repeat:Infinity, delay:Math.random()*5 }}
            style={{ position:'absolute', borderRadius:'50%', background:'#fff',
              width:Math.random()*2+1, height:Math.random()*2+1,
              left:Math.random()*100+'%', top:Math.random()*100+'%' }}/>
        ))}
      </div>

      <motion.div initial={{ opacity:0, y:30 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.7 }}
        style={{ width:'100%', maxWidth:540, position:'relative', zIndex:1 }}>

        {/* Clock */}
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.2 }}
          style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ fontSize:13, color:'#475569' }}>🕐 {time} • {dateStr}</div>
        </motion.div>

        {/* Greeting */}
        <motion.div initial={{ scale:0.85, opacity:0 }} animate={{ scale:1, opacity:1 }} transition={{ delay:0.3, type:'spring' }}
          style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ fontSize:44 }}>{greetIcon}</div>
          <h1 style={{ margin:'12px 0 8px', fontSize:30, fontWeight:800, color:'#f1f5f9', lineHeight:1.2 }}>
            {greetText},&nbsp;
            <span style={{ background:'linear-gradient(135deg,#60a5fa,#a78bfa)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
              {userName}!
            </span>
          </h1>
          <p style={{ margin:0, color:'#64748b', fontSize:14 }}>
            Hôm nay bạn có <strong style={{ color:'#94a3b8' }}>{(todayTasks.length+overdue.length)}</strong> công việc cần xử lý
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.4 }}
          style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:28 }}>
          {[
            { label:'QUÁ HẠN',  count:overdue.length,    color:'#ef4444', icon:<AlertCircle size={18}/>, desc:'Cần xử lý ngay' },
            { label:'HÔM NAY',  count:todayTasks.length,  color:'#f59e0b', icon:<Clock size={18}/>,       desc:'Phải hoàn thành' },
            { label:'SẮP TỚI',  count:upcoming.length,    color:'#3b82f6', icon:<CalendarCheck size={18}/>, desc:'Trong 3 ngày' },
          ].map((c,i) => (
            <motion.div key={c.label} initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.4+i*0.08 }}
              style={{ background:c.color+'12', border:'1px solid '+c.color+'28', borderRadius:12, padding:'16px 12px', textAlign:'center' }}>
              <div style={{ color:c.color, display:'flex', justifyContent:'center', marginBottom:6 }}>{c.icon}</div>
              <div style={{ fontSize:10, color:c.color, fontWeight:700, textTransform:'uppercase', letterSpacing:1.2 }}>{c.label}</div>
              <div style={{ fontSize:34, fontWeight:800, color:c.color, lineHeight:1, margin:'6px 0' }}>{c.count}</div>
              <div style={{ fontSize:11, color:'#475569' }}>{c.desc}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* Top 3 */}
        {top3.length > 0 && (
          <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.55 }}
            style={{ marginBottom:28 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'#f59e0b', textTransform:'uppercase', letterSpacing:1.5, marginBottom:12 }}>
              ⭐ TOP 3 CÔNG VIỆC QUAN TRỌNG HÔM NAY
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {top3.map((task,i) => {
                const pr = PWR_PRIORITY[task.priority as PwrPriority];
                const nums = ['①','②','③'];
                return (
                  <Link key={task.id} href={"/pwr/tasks/"+task.id} style={{ textDecoration:'none' }}>
                    <motion.div whileHover={{ x:6, background:'rgba(59,130,246,0.1)' }}
                      style={{ display:'flex', alignItems:'center', gap:12, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:10, padding:'12px 16px', cursor:'pointer', transition:'background 0.2s' }}>
                      <span style={{ width:26, height:26, borderRadius:'50%', background:'rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0 }}>{nums[i]}</span>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:600, color:'#e2e8f0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{task.title}</div>
                        <div style={{ fontSize:11, color:'#475569', marginTop:2 }}>
                          {task.dueDate&&'Deadline '+task.dueDate} {task.projectRef&&'• '+task.projectRef}
                        </div>
                      </div>
                      <span style={{ background:pr?.color+'20', color:pr?.color, fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:4, flexShrink:0, textTransform:'uppercase' }}>{pr?.label}</span>
                    </motion.div>
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* CTA */}
        <motion.div initial={{ opacity:0, scale:0.9 }} animate={{ opacity:1, scale:1 }} transition={{ delay:0.7 }}>
          {!started ? (
            <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:0.98 }}
              onClick={()=>{ setStarted(true); setTimeout(()=>{ window.location.href='/pwr/kanban'; },600); }}
              style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:12, background:'linear-gradient(135deg,#3b82f6 0%,#6366f1 100%)', color:'#fff', border:'none', borderRadius:12, padding:'17px', fontSize:16, fontWeight:700, cursor:'pointer', boxShadow:'0 8px 32px rgba(59,130,246,0.4)', letterSpacing:0.5 }}>
              <Play size={18} fill="white"/> BẮT ĐẦU NGÀY LÀM VIỆC
            </motion.button>
          ) : (
            <motion.div animate={{ opacity:[1,0.4,1] }} transition={{ duration:0.8, repeat:Infinity }}
              style={{ textAlign:'center', color:'#3b82f6', fontWeight:600, fontSize:15, padding:17 }}>
              Đang chuyển đến My Work Center...
            </motion.div>
          )}
          <p style={{ textAlign:'center', fontSize:11, color:'#334155', marginTop:10 }}>
            Hệ thống sẽ bắt đầu theo dõi thời gian làm việc của bạn
          </p>
        </motion.div>

      </motion.div>
    </div>
  );
}
