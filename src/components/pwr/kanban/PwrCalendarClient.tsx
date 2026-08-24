'use client';
import { useState, useCallback, useEffect, useRef } from 'react';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import type { View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { vi } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, LayoutDashboard, Sunrise, CalendarX, ExternalLink, Clock, Check, X } from 'lucide-react';
import Link from 'next/link';
import type { PwrTask, PwrStatus, PwrPriority } from '@/db/schema';
import { PWR_STATUS, PWR_PRIORITY } from '@/lib/pwr/constants';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = { vi };
const localizer = dateFnsLocalizer({
  format, parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay, locales,
});

interface CalEvent { id:number; title:string; start:Date; end:Date; resource:PwrTask; }
interface Props { initialTasks: PwrTask[] }
const TERMINAL = ['DONE','CANCELLED'];

function taskToEvent(task: PwrTask, nowMs: number): CalEvent | null {
  if (!task.dueDate) return null;
  // Use startTime if available, otherwise default spread by id
  const sTime = task.startTime || (String(8 + (task.id % 9)).padStart(2,'0') + ':00');
  const eTime = task.endTime   || (String(9 + (task.id % 9)).padStart(2,'0') + ':00');
  const start = new Date(task.dueDate + 'T' + sTime + ':00+07:00');
  const end   = new Date(task.dueDate + 'T' + eTime + ':00+07:00');
  return { id: task.id, title: task.title, start, end, resource: task };
}

// Minutes until event starts (negative = already started)
function minutesUntil(eventStart: Date, nowMs: number): number {
  return (eventStart.getTime() - nowMs) / 60000;
}

export default function PwrCalendarClient({ initialTasks }: Props) {
  const [tasks, setTasks] = useState<PwrTask[]>(initialTasks);
  const [view,  setView]  = useState<View>(Views.WEEK);
  const [date,  setDate]  = useState(new Date());
  const [nowMs, setNowMs] = useState(Date.now() + 7*3600000);
  const [showUnscheduled, setShowUnscheduled] = useState(true);

  // Schedule popover state
  const [scheduling, setScheduling] = useState<PwrTask|null>(null);
  const [schedDate,  setSchedDate]  = useState('');
  const [schedStart, setSchedStart] = useState('');
  const [schedEnd,   setSchedEnd]   = useState('');
  const [saving,     setSaving]     = useState(false);

  // Update clock every 30s for red-alert
  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now() + 7*3600000), 30000);
    return () => clearInterval(t);
  }, []);

  const events: CalEvent[] = tasks
    .filter(t => !TERMINAL.includes(t.status) && t.dueDate)
    .map(t => taskToEvent(t, nowMs)!).filter(Boolean);

  const unscheduled = tasks.filter(t => !t.dueDate && !TERMINAL.includes(t.status));

  const eventStyleGetter = useCallback((event: CalEvent) => {
    const pr = PWR_PRIORITY[event.resource.priority as PwrPriority];
    const st = PWR_STATUS[event.resource.status as PwrStatus];
    const color = pr?.color || st?.color || '#3b82f6';
    const mins  = minutesUntil(event.start, nowMs);
    const isUrgent = mins >= 0 && mins <= 30;
    const isNow    = mins < 0 && mins > -60;

    let bg = color + '28', border = '1px solid ' + color + '40', textColor = color;
    if (isUrgent) { bg = '#ef444430'; border = '2px solid #ef4444'; textColor = '#ef4444'; }
    if (isNow)    { bg = '#f59e0b28'; border = '2px solid #f59e0b'; textColor = '#f59e0b'; }

    return {
      style: {
        background: bg, borderLeft: '3px solid ' + (isUrgent?'#ef4444':isNow?'#f59e0b':color),
        color: textColor, border, borderRadius: '6px',
        padding: '3px 7px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
        animation: isUrgent ? 'pwr-pulse-dot 1s ease-in-out infinite' : 'none',
      }
    };
  }, [nowMs]);

  const nav = (action: 'PREV'|'NEXT'|'TODAY') => {
    if (action==='TODAY') { setDate(new Date()); return; }
    const d = new Date(date);
    const delta = view===Views.WEEK ? 7 : 1;
    d.setDate(d.getDate() + (action==='NEXT' ? delta : -delta));
    setDate(d);
  };

  function openSchedule(task: PwrTask) {
    const today = new Date(Date.now()+7*3600000).toISOString().split('T')[0];
    setScheduling(task);
    setSchedDate(task.dueDate || today);
    setSchedStart(task.startTime || '08:00');
    setSchedEnd(task.endTime || '09:00');
  }

  async function saveSchedule() {
    if (!scheduling) return;
    setSaving(true);
    try {
      const res = await fetch('/api/pwr/tasks/' + scheduling.id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dueDate: schedDate, startTime: schedStart, endTime: schedEnd }),
      });
      if (res.ok) {
        const updated = await res.json();
        setTasks(prev => prev.map(t => t.id === scheduling.id ? { ...t, dueDate: schedDate, startTime: schedStart, endTime: schedEnd } : t));
        setScheduling(null);
      }
    } finally { setSaving(false); }
  }

  // Auto-set endTime = startTime + 1h when startTime changes
  function onStartChange(v: string) {
    setSchedStart(v);
    if (v) {
      const [h,m] = v.split(':').map(Number);
      const endH = Math.min(h+1, 23);
      setSchedEnd(String(endH).padStart(2,'0') + ':' + String(m).padStart(2,'0'));
    }
  }

  // Count urgent events (within 30 min)
  const urgentCount = events.filter(e => { const m = minutesUntil(e.start, nowMs); return m>=0 && m<=30; }).length;

  return (
    <div style={{ minHeight:'100vh', background:'#0f172a', padding:'20px 24px' }}>
      {/* Urgent banner */}
      {urgentCount > 0 && (
        <div className="pwr-fadein" style={{ background:'rgba(239,68,68,0.12)', border:'1px solid #ef4444', borderRadius:8, padding:'10px 16px', marginBottom:12, display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:18 }}>🚨</span>
          <strong style={{ color:'#ef4444', fontSize:13 }}>Có {urgentCount} công việc sắp bắt đầu trong 30 phút!</strong>
          <span style={{ color:'#94a3b8', fontSize:12 }}>Hãy chuẩn bị ngay.</span>
        </div>
      )}

      {/* Topbar */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }} className="pwr-fadein">
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <Link href="/pwr/kanban" style={{ display:'flex', alignItems:'center', gap:6, color:'#64748b', fontSize:12, textDecoration:'none', padding:'6px 12px', border:'1px solid rgba(255,255,255,0.08)', borderRadius:7 }}>
            <LayoutDashboard size={14}/> Kanban
          </Link>
          <Link href="/pwr/today" style={{ display:'flex', alignItems:'center', gap:6, color:'#64748b', fontSize:12, textDecoration:'none', padding:'6px 12px', border:'1px solid rgba(255,255,255,0.08)', borderRadius:7 }}>
            <Sunrise size={14}/> Daily Focus
          </Link>
          <h2 style={{ margin:0, fontSize:18, fontWeight:700, color:'#f1f5f9' }}>📅 Lịch công việc</h2>
          <span style={{ fontSize:11, color:'#64748b', background:'rgba(255,255,255,0.05)', padding:'3px 8px', borderRadius:5 }}>
            {events.length} sự kiện • {unscheduled.length} chưa lên lịch
          </span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {unscheduled.length > 0 && (
            <button onClick={()=>setShowUnscheduled(v=>!v)}
              style={{ display:'flex', alignItems:'center', gap:6, background:showUnscheduled?'rgba(245,158,11,0.15)':'rgba(255,255,255,0.05)', border:'1px solid '+(showUnscheduled?'rgba(245,158,11,0.4)':'rgba(255,255,255,0.1)'), borderRadius:6, padding:'6px 12px', color:showUnscheduled?'#f59e0b':'#64748b', cursor:'pointer', fontSize:12, fontWeight:600 }}>
              <CalendarX size={13}/> Chưa lên lịch ({unscheduled.length})
            </button>
          )}
          <button onClick={()=>nav('PREV')} style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:6, padding:'6px 10px', color:'#94a3b8', cursor:'pointer' }}><ChevronLeft size={15}/></button>
          <button onClick={()=>nav('TODAY')} style={{ background:'rgba(59,130,246,0.12)', border:'1px solid rgba(59,130,246,0.3)', borderRadius:6, padding:'6px 14px', color:'#3b82f6', cursor:'pointer', fontSize:12, fontWeight:600 }}>Hôm nay</button>
          <button onClick={()=>nav('NEXT')} style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:6, padding:'6px 10px', color:'#94a3b8', cursor:'pointer' }}><ChevronRight size={15}/></button>
          <div style={{ display:'flex', gap:4, marginLeft:4 }}>
            {([{v:Views.WEEK,l:'Tuần'},{v:Views.DAY,l:'Ngày'}] as {v:View,l:string}[]).map(({v,l})=>(
              <button key={v} onClick={()=>setView(v)}
                style={{ background:view===v?'rgba(59,130,246,0.18)':'transparent', border:'1px solid '+(view===v?'rgba(59,130,246,0.35)':'rgba(255,255,255,0.08)'), borderRadius:6, padding:'6px 12px', color:view===v?'#3b82f6':'#64748b', cursor:'pointer', fontSize:12, fontWeight:600 }}>
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display:'flex', gap:16 }}>
        {/* Calendar */}
        <div className="pwr-fadein-1" style={{ flex:1, background:'#1e293b', borderRadius:12, border:'1px solid rgba(255,255,255,0.07)', overflow:'hidden', padding:2 }}>
          <Calendar
            localizer={localizer}
            events={events}
            view={view}
            date={date}
            onNavigate={()=>{}}
            onView={()=>{}}
            eventPropGetter={eventStyleGetter}
            style={{ height:'calc(100vh - 180px)', minHeight:500 }}
            formats={{
              timeGutterFormat:'HH:mm',
              dayHeaderFormat:(d:Date)=>format(d,'EEE dd/MM',{locale:vi}),
              dayRangeHeaderFormat:({start,end}:{start:Date;end:Date})=>
                format(start,'dd/MM',{locale:vi})+' — '+format(end,'dd/MM/yyyy',{locale:vi}),
            }}
            messages={{ noEventsInRange:'Không có công việc nào trong tuần này' }}
            onSelectEvent={(event:CalEvent)=>{ window.location.href='/pwr/tasks/'+event.id; }}
          />
        </div>

        {/* Unscheduled Panel */}
        {showUnscheduled && unscheduled.length > 0 && (
          <div className="pwr-fadein-2" style={{ width:270, background:'#1e293b', borderRadius:12, border:'1px solid rgba(245,158,11,0.25)', padding:'16px', overflowY:'auto', maxHeight:'calc(100vh - 180px)' }}>
            <div style={{ fontSize:11, fontWeight:700, color:'#f59e0b', textTransform:'uppercase', letterSpacing:1.2, marginBottom:8, display:'flex', alignItems:'center', gap:6 }}>
              <CalendarX size={13}/> CHƯA LÊN LỊCH ({unscheduled.length})
            </div>
            <p style={{ fontSize:11, color:'#475569', marginBottom:12, lineHeight:1.5 }}>
              Bấm “Lên lịch” để xếp giờ vào lịch.
            </p>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {unscheduled.map(task => {
                const pr = PWR_PRIORITY[task.priority as PwrPriority];
                return (
                  <div key={task.id}
                    style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:8, padding:'10px 12px' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:6, marginBottom:8 }}>
                      <span style={{ fontSize:12, fontWeight:600, color:'#e2e8f0', lineHeight:1.4, flex:1 }}>{task.title}</span>
                      <a href={'/pwr/tasks/'+task.id}><ExternalLink size={11} color="#475569" style={{ marginTop:2 }}/></a>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                      <span style={{ fontSize:10, fontWeight:700, color:pr?.color, background:(pr?.color||'#3b82f6')+'20', padding:'2px 6px', borderRadius:3, textTransform:'uppercase' }}>{pr?.label}</span>
                      <button onClick={()=>openSchedule(task)}
                        style={{ display:'flex', alignItems:'center', gap:4, background:'rgba(59,130,246,0.15)', border:'1px solid rgba(59,130,246,0.3)', borderRadius:5, padding:'4px 8px', color:'#3b82f6', cursor:'pointer', fontSize:11, fontWeight:600 }}>
                        <Clock size={11}/> Lên lịch
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Schedule Modal */}
      {scheduling && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div className="pwr-scalein" style={{ background:'#1e293b', border:'1px solid rgba(255,255,255,0.1)', borderRadius:16, padding:28, width:400, boxShadow:'0 24px 48px rgba(0,0,0,0.5)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <h3 style={{ margin:0, fontSize:15, fontWeight:700, color:'#f1f5f9' }}>
                📅 Xếp lịch công việc
              </h3>
              <button onClick={()=>setScheduling(null)} style={{ background:'none', border:'none', color:'#64748b', cursor:'pointer' }}><X size={18}/></button>
            </div>
            <div style={{ fontSize:13, color:'#94a3b8', marginBottom:20, background:'rgba(255,255,255,0.03)', borderRadius:8, padding:'10px 12px', borderLeft:'3px solid #3b82f6' }}>
              {scheduling.title}
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div>
                <label style={{ display:'block', fontSize:11, fontWeight:600, color:'#64748b', marginBottom:6, textTransform:'uppercase', letterSpacing:.5 }}>Ngày</label>
                <input type="date" value={schedDate} onChange={e=>setSchedDate(e.target.value)}
                  style={{ width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:8, padding:'10px 12px', color:'#f1f5f9', fontSize:14, outline:'none', boxSizing:'border-box' }}/>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div>
                  <label style={{ display:'block', fontSize:11, fontWeight:600, color:'#64748b', marginBottom:6, textTransform:'uppercase', letterSpacing:.5 }}>Bắt đầu</label>
                  <input type="time" value={schedStart} onChange={e=>onStartChange(e.target.value)}
                    style={{ width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:8, padding:'10px 12px', color:'#f1f5f9', fontSize:14, outline:'none', boxSizing:'border-box' }}/>
                </div>
                <div>
                  <label style={{ display:'block', fontSize:11, fontWeight:600, color:'#64748b', marginBottom:6, textTransform:'uppercase', letterSpacing:.5 }}>Kết thúc</label>
                  <input type="time" value={schedEnd} onChange={e=>setSchedEnd(e.target.value)}
                    style={{ width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:8, padding:'10px 12px', color:'#f1f5f9', fontSize:14, outline:'none', boxSizing:'border-box' }}/>
                </div>
              </div>
              <div style={{ background:'rgba(59,130,246,0.08)', borderRadius:8, padding:'10px 12px', fontSize:12, color:'#64748b' }}>
                ⏰ Hiển lên lịch: <strong style={{ color:'#3b82f6' }}>{schedDate} từ {schedStart} — {schedEnd}</strong>
              </div>
            </div>
            <div style={{ display:'flex', gap:10, marginTop:20 }}>
              <button onClick={()=>setScheduling(null)}
                style={{ flex:1, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, padding:'11px', color:'#94a3b8', cursor:'pointer', fontSize:13, fontWeight:600 }}>
                Hủy
              </button>
              <button onClick={saveSchedule} disabled={saving||!schedDate}
                style={{ flex:2, background:'linear-gradient(135deg,#3b82f6,#6366f1)', border:'none', borderRadius:8, padding:'11px', color:'#fff', cursor:saving?'not-allowed':'pointer', fontSize:13, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', gap:6, opacity:saving?0.7:1 }}>
                <Check size={14}/> {saving ? 'Đang lưu...' : 'Xác nhận lên lịch'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
