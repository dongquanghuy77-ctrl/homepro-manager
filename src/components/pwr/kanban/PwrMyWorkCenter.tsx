'use client';
import { useState, useRef, useEffect } from 'react';
import { LayoutDashboard, Calendar, List, Plus, FolderGit2, Bell, AlertCircle, Clock, CheckCircle, Timer, X } from 'lucide-react';
import type { PwrTask, PwrStatus } from '@/db/schema';
import { getTodayVN, TERMINAL_STATUSES } from '@/lib/pwr/constants';
import PwrKanbanClient from './PwrKanbanClient';
import PwrListView from './PwrListView';
import PwrWbsView from './PwrWbsView';
import PwrTaskForm from '../tasks/PwrTaskForm';

const FONT = '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif';

type ViewTab = 'KANBAN' | 'LIST' | 'WBS';
interface Props { initialTasks: PwrTask[] }

export default function PwrMyWorkCenter({ initialTasks }: Props) {
  const [tasks, setTasks] = useState<PwrTask[]>(initialTasks);
  const [activeTab, setActiveTab] = useState<ViewTab>('KANBAN');
  const [showForm, setShowForm] = useState(false);
  const [showBell, setShowBell] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const todayVN = getTodayVN();
  const nowStr  = new Date(Date.now() + 7*3600000).toISOString().split('T')[0];

  // Close bell dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setShowBell(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  async function refresh() {
    try {
      const res = await fetch('/api/pwr/tasks');
      if (res.ok) { const d = await res.json(); setTasks(d.tasks ?? []); }
    } catch {}
  }

  const overdue    = tasks.filter(t => t.dueDate && t.dueDate < nowStr && !TERMINAL_STATUSES.includes(t.status as PwrStatus));
  const todayTasks = tasks.filter(t => t.dueDate === todayVN && !TERMINAL_STATUSES.includes(t.status as PwrStatus));
  const upcoming   = tasks.filter(t => t.dueDate && t.dueDate > todayVN && !TERMINAL_STATUSES.includes(t.status as PwrStatus));
  const doneTasks  = tasks.filter(t => t.status === 'DONE');

  const STATS = [
    { label:'QUÁ HẠN',    count:overdue.length,    color:'#ef4444', bg:'rgba(239,68,68,0.1)',  icon:<AlertCircle size={20}/>, pulse:overdue.length>0 },
    { label:'HÔM NAY',    count:todayTasks.length,  color:'#f59e0b', bg:'rgba(245,158,11,0.1)', icon:<Clock size={20}/>,       pulse:false },
    { label:'SẮP TỚI',    count:upcoming.length,    color:'#3b82f6', bg:'rgba(59,130,246,0.1)', icon:<Timer size={20}/>,       pulse:false },
    { label:'HOÀN THÀNH', count:doneTasks.length,   color:'#10b981', bg:'rgba(16,185,129,0.1)', icon:<CheckCircle size={20}/>, pulse:false },
  ];

  const TABS = [
    { key:'KANBAN' as ViewTab, label:'KANBAN',    icon:<LayoutDashboard size={15}/> },
    { key:'LIST'   as ViewTab, label:'DANH SÁCH', icon:<List size={15}/> },
    { key:'WBS'    as ViewTab, label:'CẤU TRÚC DỰ ÁN (WBS)', icon:<FolderGit2 size={15}/> },
  ];

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(160deg,#0f172a 0%,#1a2440 50%,#0f172a 100%)', fontFamily:FONT }}>
      {/* Header */}
      <div style={{ padding:'24px 28px 0', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }} className="pwr-fadein">
          <div>
            <h1 style={{ margin:0, fontSize:22, fontWeight:800, color:'#f1f5f9', letterSpacing:'-0.3px', display:'flex', alignItems:'center', gap:10, fontFamily:FONT }}>
              <span style={{ fontSize:24 }}>⚙️</span>
              <span style={{ background:'linear-gradient(135deg,#e2e8f0,#94a3b8)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>MY WORK CENTER</span>
            </h1>
            <p style={{ margin:'4px 0 0', fontSize:12, color:'#475569' }}>Trung tâm điều hành công việc cá nhân</p>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <a href="/pwr/today" style={{ display:'flex', alignItems:'center', gap:6, color:'#64748b', fontSize:12, textDecoration:'none', padding:'7px 12px', border:'1px solid rgba(255,255,255,0.08)', borderRadius:8, fontFamily:FONT }}>
              🌅 Daily Focus
            </a>
            <a href="/pwr/calendar" style={{ display:'flex', alignItems:'center', gap:6, color:'#64748b', fontSize:12, textDecoration:'none', padding:'7px 12px', border:'1px solid rgba(255,255,255,0.08)', borderRadius:8, fontFamily:FONT }}>
              <Calendar size={14}/> Lịch
            </a>

            {/* Bell with dropdown */}
            <div ref={bellRef} style={{ position:'relative' }}>
              <button
                onClick={() => setShowBell(v => !v)}
                style={{ background:'none', border:'none', cursor:'pointer', padding:4, position:'relative', display:'flex', alignItems:'center' }}
                title="Công việc quá hạn"
              >
                <Bell size={18} color={overdue.length > 0 ? '#ef4444' : '#64748b'}/>
                {overdue.length > 0 && (
                  <span className="pwr-pulse" style={{ position:'absolute', top:-6, right:-6, background:'#ef4444', color:'#fff', fontSize:10, fontWeight:700, borderRadius:999, padding:'2px 5px', minWidth:16, textAlign:'center', display:'block' }}>
                    {overdue.length}
                  </span>
                )}
              </button>

              {/* Bell dropdown */}
              {showBell && (
                <div className="pwr-scalein" style={{ position:'absolute', right:0, top:'calc(100% + 10px)', width:320, background:'#1e293b', border:'1px solid rgba(255,255,255,0.1)', borderRadius:12, boxShadow:'0 16px 40px rgba(0,0,0,0.5)', zIndex:200, overflow:'hidden' }}>
                  <div style={{ padding:'12px 16px', borderBottom:'1px solid rgba(255,255,255,0.06)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontSize:12, fontWeight:700, color:'#ef4444', textTransform:'uppercase', letterSpacing:1 }}>
                      🚨 QUÁ HẠN ({overdue.length})
                    </span>
                    <button onClick={() => setShowBell(false)} style={{ background:'none', border:'none', color:'#475569', cursor:'pointer' }}>
                      <X size={14}/>
                    </button>
                  </div>
                  {overdue.length === 0 ? (
                    <div style={{ padding:'20px 16px', textAlign:'center', color:'#475569', fontSize:13 }}>
                      ✅ Không có công việc quá hạn!
                    </div>
                  ) : (
                    <div style={{ maxHeight:300, overflowY:'auto' }}>
                      {overdue.map(t => (
                        <a key={t.id} href={'/pwr/tasks/'+t.id}
                          style={{ display:'block', padding:'10px 16px', borderBottom:'1px solid rgba(255,255,255,0.04)', textDecoration:'none', transition:'background 0.15s' }}
                          onMouseEnter={e => (e.currentTarget.style.background='rgba(239,68,68,0.08)')}
                          onMouseLeave={e => (e.currentTarget.style.background='transparent')}>
                          <div style={{ fontSize:12, fontWeight:600, color:'#f1f5f9', marginBottom:3 }}>{t.title}</div>
                          <div style={{ fontSize:11, color:'#ef4444' }}>
                            Hạn: {t.dueDate} • <span style={{ color:'#64748b' }}>{t.status}</span>
                          </div>
                        </a>
                      ))}
                    </div>
                  )}
                  <div style={{ padding:'8px 16px', borderTop:'1px solid rgba(255,255,255,0.06)', textAlign:'center' }}>
                    <a href="/pwr/tasks" style={{ fontSize:11, color:'#3b82f6', textDecoration:'none', fontWeight:600 }}>Xem tất cả →</a>
                  </div>
                </div>
              )}
            </div>

            {/* Single "Tao viec" button - opens modal */}
            <button onClick={() => setShowForm(true)}
              style={{ display:'flex', alignItems:'center', gap:7, background:'linear-gradient(135deg,#3b82f6,#6366f1)', color:'#fff', border:'none', borderRadius:8, padding:'9px 18px', fontSize:13, fontWeight:600, cursor:'pointer', boxShadow:'0 4px 14px rgba(59,130,246,0.35)', fontFamily:FONT }}>
              <Plus size={15}/> Tạo việc
            </button>
          </div>
        </div>

        {/* Stat Cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
          {STATS.map((s,i) => (
            <div key={s.label} className={"pwr-card pwr-fadein-" + (i+1)}
              style={{ background:s.bg, border:'1px solid '+s.color+'25', borderRadius:12, padding:'16px 20px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <div>
                  <div style={{ fontSize:10, fontWeight:700, color:s.color, textTransform:'uppercase', letterSpacing:1.2, marginBottom:8, fontFamily:FONT }}>{s.label}</div>
                  <div style={{ fontSize:36, fontWeight:800, color:s.color, lineHeight:1 }}>{s.count}</div>
                </div>
                <div style={{ color:s.color, opacity:0.6 }} className={s.pulse && s.count>0 ? 'pwr-pulse' : ''}>{s.icon}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs — NO extra Tao viec button here */}
        <div style={{ display:'flex' }}>
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              style={{ display:'flex', alignItems:'center', gap:7, padding:'10px 20px', background:'transparent', border:'none', color:activeTab===tab.key?'#3b82f6':'#64748b', borderBottom:'2px solid '+(activeTab===tab.key?'#3b82f6':'transparent'), fontSize:12, fontWeight:700, cursor:'pointer', transition:'all 0.2s', letterSpacing:0.5, textTransform:'uppercase', fontFamily:FONT }}>
              {tab.icon} {tab.label}
            </button>
          ))}
          <a href="/pwr/calendar" style={{ display:'flex', alignItems:'center', gap:7, padding:'10px 20px', background:'transparent', borderBottom:'2px solid transparent', color:'#64748b', fontSize:12, fontWeight:700, textDecoration:'none', letterSpacing:0.5, textTransform:'uppercase', fontFamily:FONT }}>
            <Calendar size={15}/> CALENDAR
          </a>
        </div>
      </div>

      {/* Content */}
      <div key={activeTab} className="pwr-fadein">
        {activeTab === 'KANBAN' && <PwrKanbanClient initialTasks={tasks} />}
        {activeTab === 'LIST'   && <PwrListView tasks={tasks} />}
          {activeTab === 'WBS'    && <PwrWbsView tasks={tasks} onRefresh={refresh} />}
      </div>


      
      {/* Single Create Form Modal */}
      {showForm && (
        <PwrTaskForm task={null} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); refresh(); }}/>
      )}
    </div>
  );
}
