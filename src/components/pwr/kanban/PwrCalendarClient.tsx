'use client';
import { useState, useCallback } from 'react';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import type { View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { vi } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, LayoutDashboard, Sunrise, CalendarX, ExternalLink } from 'lucide-react';
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

function taskToEvent(task: PwrTask): CalEvent | null {
  if (!task.dueDate) return null;
  const hour = 8 + (task.id % 9);
  const hStr = String(hour).padStart(2,'0');
  const h2   = String(hour+1).padStart(2,'0');
  const start = new Date(task.dueDate + 'T' + hStr + ':00:00+07:00');
  const end   = new Date(task.dueDate + 'T' + h2  + ':00:00+07:00');
  return { id:task.id, title:task.title, start, end, resource:task };
}

export default function PwrCalendarClient({ initialTasks }: Props) {
  const [view, setView] = useState<View>(Views.WEEK);
  const [date, setDate] = useState(new Date());
  const [showUnscheduled, setShowUnscheduled] = useState(true);

  const events: CalEvent[] = initialTasks
    .filter(t => !TERMINAL.includes(t.status))
    .map(taskToEvent).filter(Boolean) as CalEvent[];

  const unscheduled = initialTasks.filter(t => !t.dueDate && !TERMINAL.includes(t.status));

  const eventStyleGetter = useCallback((event: CalEvent) => {
    const pr = PWR_PRIORITY[event.resource.priority as PwrPriority];
    const st = PWR_STATUS[event.resource.status as PwrStatus];
    const color = pr?.color || st?.color || '#3b82f6';
    return {
      style: {
        background: color + '28',
        borderLeft: '3px solid ' + color,
        color: color,
        border: '1px solid ' + color + '40',
        borderRadius: '6px',
        padding: '3px 7px',
        fontSize: '12px',
        fontWeight: 600,
        cursor: 'pointer',
      }
    };
  }, []);

  const nav = (action: 'PREV'|'NEXT'|'TODAY') => {
    if (action==='TODAY') { setDate(new Date()); return; }
    const d = new Date(date);
    const delta = view===Views.WEEK ? 7 : 1;
    d.setDate(d.getDate() + (action==='NEXT' ? delta : -delta));
    setDate(d);
  };

  return (
    <div style={{ minHeight:'100vh', background:'#0f172a', padding:'20px 24px' }}>
      {/* Topbar */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }} className="pwr-fadein">
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          <Link href="/pwr/kanban" style={{ display:'flex', alignItems:'center', gap:6, color:'#64748b', fontSize:12, textDecoration:'none', padding:'6px 12px', border:'1px solid rgba(255,255,255,0.08)', borderRadius:7 }}>
            <LayoutDashboard size={14}/> Kanban
          </Link>
          <Link href="/pwr/today" style={{ display:'flex', alignItems:'center', gap:6, color:'#64748b', fontSize:12, textDecoration:'none', padding:'6px 12px', border:'1px solid rgba(255,255,255,0.08)', borderRadius:7 }}>
            <Sunrise size={14}/> Daily Focus
          </Link>
          <h2 style={{ margin:0, fontSize:18, fontWeight:700, color:'#f1f5f9' }}>&#128197; L&#7883;ch c&#244;ng vi&#7879;c</h2>
          <span style={{ fontSize:11, color:'#64748b', background:'rgba(255,255,255,0.05)', padding:'3px 8px', borderRadius:5 }}>
            {events.length} s&#7921; ki&#7879;n &bull; {unscheduled.length} ch&#432;a l&#234;n l&#7883;ch
          </span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {unscheduled.length > 0 && (
            <button onClick={()=>setShowUnscheduled(v=>!v)}
              style={{ display:'flex', alignItems:'center', gap:6, background:showUnscheduled?'rgba(245,158,11,0.15)':'rgba(255,255,255,0.05)', border:'1px solid '+(showUnscheduled?'rgba(245,158,11,0.4)':'rgba(255,255,255,0.1)'), borderRadius:6, padding:'6px 12px', color:showUnscheduled?'#f59e0b':'#64748b', cursor:'pointer', fontSize:12, fontWeight:600 }}>
              <CalendarX size={13}/> Ch&#432;a l&#234;n l&#7883;ch ({unscheduled.length})
            </button>
          )}
          <button onClick={()=>nav('PREV')} style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:6, padding:'6px 10px', color:'#94a3b8', cursor:'pointer' }}><ChevronLeft size={15}/></button>
          <button onClick={()=>nav('TODAY')} style={{ background:'rgba(59,130,246,0.12)', border:'1px solid rgba(59,130,246,0.3)', borderRadius:6, padding:'6px 14px', color:'#3b82f6', cursor:'pointer', fontSize:12, fontWeight:600 }}>H&#244;m nay</button>
          <button onClick={()=>nav('NEXT')} style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:6, padding:'6px 10px', color:'#94a3b8', cursor:'pointer' }}><ChevronRight size={15}/></button>
          <div style={{ display:'flex', gap:4, marginLeft:4 }}>
            {([{v:Views.WEEK,l:'Tu&#7847;n'},{v:Views.DAY,l:'Ng&#224;y'}] as {v:View,l:string}[]).map(({v,l})=>(
              <button key={v} onClick={()=>setView(v)}
                style={{ background:view===v?'rgba(59,130,246,0.18)':'transparent', border:'1px solid '+(view===v?'rgba(59,130,246,0.35)':'rgba(255,255,255,0.08)'), borderRadius:6, padding:'6px 12px', color:view===v?'#3b82f6':'#64748b', cursor:'pointer', fontSize:12, fontWeight:600 }}
                dangerouslySetInnerHTML={{__html:l}}/>
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
            style={{ height:'calc(100vh - 150px)', minHeight:500 }}
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
          <div className="pwr-fadein-2" style={{ width:260, background:'#1e293b', borderRadius:12, border:'1px solid rgba(245,158,11,0.25)', padding:'16px', overflowY:'auto', maxHeight:'calc(100vh - 150px)' }}>
            <div style={{ fontSize:11, fontWeight:700, color:'#f59e0b', textTransform:'uppercase', letterSpacing:1.2, marginBottom:12, display:'flex', alignItems:'center', gap:6 }}>
              <CalendarX size={13}/> CHƯA LÊN LỊCH ({unscheduled.length})
            </div>
            <p style={{ fontSize:11, color:'#475569', marginBottom:12, lineHeight:1.5 }}>
              Chưa có deadline. Hãy thêm ngày để hiện trên lịch.
            </p>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {unscheduled.map(task => {
                const pr = PWR_PRIORITY[task.priority as PwrPriority];
                return (
                  <a key={task.id} href={'/pwr/tasks/'+task.id}
                    style={{ display:'block', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:8, padding:'10px 12px', textDecoration:'none', transition:'background 0.15s' }}
                    onMouseEnter={e=>(e.currentTarget.style.background='rgba(59,130,246,0.08)')}
                    onMouseLeave={e=>(e.currentTarget.style.background='rgba(255,255,255,0.03)')}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:6 }}>
                      <span style={{ fontSize:12, fontWeight:600, color:'#e2e8f0', lineHeight:1.4, flex:1 }}>{task.title}</span>
                      <ExternalLink size={11} color="#475569" style={{ flexShrink:0, marginTop:2 }}/>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:6 }}>
                      <span style={{ fontSize:10, fontWeight:700, color:pr?.color, background:(pr?.color||'#3b82f6')+'20', padding:'2px 6px', borderRadius:3, textTransform:'uppercase' }}>{pr?.label}</span>
                      {task.projectRef && <span style={{ fontSize:10, color:'#475569', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{task.projectRef}</span>}
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
