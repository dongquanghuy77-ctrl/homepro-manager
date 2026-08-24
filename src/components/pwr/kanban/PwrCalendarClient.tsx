'use client';
import { useState, useCallback } from 'react';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import type { View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { vi } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, LayoutDashboard, Sunrise } from 'lucide-react';
import Link from 'next/link';
import type { PwrTask, PwrStatus } from '@/db/schema';
import { PWR_STATUS } from '@/lib/pwr/constants';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = { vi };
const localizer = dateFnsLocalizer({
  format, parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay, locales,
});

interface CalEvent { id:number; title:string; start:Date; end:Date; resource:PwrTask; }
interface Props { initialTasks: PwrTask[] }

function taskToEvent(task: PwrTask): CalEvent | null {
  if (!task.dueDate) return null;
  const start = new Date(task.dueDate + 'T09:00:00+07:00');
  const end   = new Date(task.dueDate + 'T10:00:00+07:00');
  return { id:task.id, title:task.title, start, end, resource:task };
}

export default function PwrCalendarClient({ initialTasks }: Props) {
  const [view, setView] = useState<View>(Views.WEEK);
  const [date, setDate] = useState(new Date());

  const events: CalEvent[] = initialTasks.map(taskToEvent).filter(Boolean) as CalEvent[];

  const eventStyleGetter = useCallback((event: CalEvent) => {
    const st = PWR_STATUS[event.resource.status as PwrStatus];
    return {
      style: {
        background: (st?.color||'#3b82f6') + '22',
        borderLeft: '3px solid ' + (st?.color||'#3b82f6'),
        color: st?.color||'#3b82f6',
        border: '1px solid ' + (st?.color||'#3b82f6') + '35',
        borderRadius: '6px',
        padding: '2px 6px',
        fontSize: '12px',
        fontWeight: 600,
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
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }} className="pwr-fadein">
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          <Link href="/pwr/kanban" style={{ display:'flex', alignItems:'center', gap:6, color:'#64748b', fontSize:12, textDecoration:'none', padding:'6px 12px', border:'1px solid rgba(255,255,255,0.08)', borderRadius:7 }}>
            <LayoutDashboard size={14}/> Kanban
          </Link>
          <Link href="/pwr/today" style={{ display:'flex', alignItems:'center', gap:6, color:'#64748b', fontSize:12, textDecoration:'none', padding:'6px 12px', border:'1px solid rgba(255,255,255,0.08)', borderRadius:7 }}>
            <Sunrise size={14}/> Daily Focus
          </Link>
          <h2 style={{ margin:0, fontSize:18, fontWeight:700, color:'#f1f5f9' }}>📅 Lịch công việc</h2>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <button onClick={()=>nav('PREV')} style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:6, padding:'6px 10px', color:'#94a3b8', cursor:'pointer' }}><ChevronLeft size={15}/></button>
          <button onClick={()=>nav('TODAY')} style={{ background:'rgba(59,130,246,0.12)', border:'1px solid rgba(59,130,246,0.3)', borderRadius:6, padding:'6px 14px', color:'#3b82f6', cursor:'pointer', fontSize:12, fontWeight:600 }}>Hôm nay</button>
          <button onClick={()=>nav('NEXT')} style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:6, padding:'6px 10px', color:'#94a3b8', cursor:'pointer' }}><ChevronRight size={15}/></button>
          <div style={{ display:'flex', gap:4, marginLeft:8 }}>
            {[{v:Views.WEEK,l:'Tuần'},{v:Views.DAY,l:'Ngày'}].map(({v,l})=>(
              <button key={v} onClick={()=>setView(v)}
                style={{ background:view===v?'rgba(59,130,246,0.18)':'transparent', border:'1px solid '+(view===v?'rgba(59,130,246,0.35)':'rgba(255,255,255,0.08)'), borderRadius:6, padding:'6px 12px', color:view===v?'#3b82f6':'#64748b', cursor:'pointer', fontSize:12, fontWeight:600 }}>
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="pwr-fadein-1" style={{ background:'#1e293b', borderRadius:12, border:'1px solid rgba(255,255,255,0.07)', overflow:'hidden', padding:2 }}>
        <Calendar
          localizer={localizer}
          events={events}
          view={view}
          date={date}
          onNavigate={()=>{}}
          onView={()=>{}}
          eventPropGetter={eventStyleGetter}
          style={{ height:'calc(100vh - 160px)', minHeight:500 }}
          formats={{
            timeGutterFormat:'HH:mm',
            dayHeaderFormat:(d:Date)=>format(d,'EEE dd/MM',{locale:vi}),
            dayRangeHeaderFormat:({start,end}:{start:Date;end:Date})=>
              format(start,'dd/MM',{locale:vi})+' — '+format(end,'dd/MM/yyyy',{locale:vi}),
          }}
          messages={{ noEventsInRange:'Không có công việc trong khoảng thời gian này' }}
          onSelectEvent={(event:CalEvent)=>{ window.location.href='/pwr/tasks/'+event.id; }}
        />
      </div>
    </div>
  );
}
