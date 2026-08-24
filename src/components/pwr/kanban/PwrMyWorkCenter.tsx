'use client';
import { useState } from 'react';
import { LayoutDashboard, Calendar, List, TrendingUp, Plus, Bell, AlertCircle, Clock, CheckCircle, Timer } from 'lucide-react';
import type { PwrTask, PwrStatus } from '@/db/schema';
import { getTodayVN, TERMINAL_STATUSES } from '@/lib/pwr/constants';
import PwrKanbanClient from './PwrKanbanClient';
import PwrListView from './PwrListView';
import PwrTaskForm from '../tasks/PwrTaskForm';

type ViewTab = 'KANBAN' | 'LIST';
interface Props { initialTasks: PwrTask[] }

export default function PwrMyWorkCenter({ initialTasks }: Props) {
  const [tasks, setTasks] = useState<PwrTask[]>(initialTasks);
  const [activeTab, setActiveTab] = useState<ViewTab>('KANBAN');
  const [showForm, setShowForm] = useState(false);
  const todayVN = getTodayVN();
  const nowStr  = new Date(Date.now() + 7*3600000).toISOString().split('T')[0];

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
  ];

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(160deg,#0f172a 0%,#1a2440 50%,#0f172a 100%)' }}>
      {/* Header */}
      <div style={{ padding:'24px 28px 0', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }} className="pwr-fadein">
          <div>
            <h1 style={{ margin:0, fontSize:22, fontWeight:800, color:'#f1f5f9', letterSpacing:'-0.3px', display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontSize:24 }}>⚙️</span>
              <span style={{ background:'linear-gradient(135deg,#e2e8f0,#94a3b8)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>MY WORK CENTER</span>
            </h1>
            <p style={{ margin:'4px 0 0', fontSize:12, color:'#475569' }}>Trung tâm điều hành công việc cá nhân</p>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <a href="/pwr/today" style={{ display:'flex', alignItems:'center', gap:6, color:'#64748b', fontSize:12, textDecoration:'none', padding:'7px 12px', border:'1px solid rgba(255,255,255,0.08)', borderRadius:8 }}>
              🌅 Daily Focus
            </a>
            <a href="/pwr/calendar" style={{ display:'flex', alignItems:'center', gap:6, color:'#64748b', fontSize:12, textDecoration:'none', padding:'7px 12px', border:'1px solid rgba(255,255,255,0.08)', borderRadius:8 }}>
              <Calendar size={14}/> Lịch
            </a>
            <div style={{ position:'relative' }}>
              <Bell size={18} color="#64748b"/>
              {overdue.length > 0 && (
                <span className="pwr-pulse" style={{ position:'absolute', top:-7, right:-7, background:'#ef4444', color:'#fff', fontSize:10, fontWeight:700, borderRadius:999, padding:'2px 5px', minWidth:16, textAlign:'center', display:'block' }}>
                  {overdue.length}
                </span>
              )}
            </div>
            <button onClick={()=>setShowForm(true)}
              style={{ display:'flex', alignItems:'center', gap:7, background:'linear-gradient(135deg,#3b82f6,#6366f1)', color:'#fff', border:'none', borderRadius:8, padding:'9px 18px', fontSize:13, fontWeight:600, cursor:'pointer', boxShadow:'0 4px 14px rgba(59,130,246,0.35)' }}>
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
                  <div style={{ fontSize:10, fontWeight:700, color:s.color, textTransform:'uppercase', letterSpacing:1.2, marginBottom:8 }}>{s.label}</div>
                  <div style={{ fontSize:36, fontWeight:800, color:s.color, lineHeight:1 }}>{s.count}</div>
                </div>
                <div style={{ color:s.color, opacity:0.6 }} className={s.pulse && s.count>0 ? 'pwr-pulse' : ''}>{s.icon}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display:'flex' }}>
          {TABS.map(tab => (
            <button key={tab.key} onClick={()=>setActiveTab(tab.key)}
              style={{ display:'flex', alignItems:'center', gap:7, padding:'10px 20px', background:'transparent', border:'none', color:activeTab===tab.key?'#3b82f6':'#64748b', borderBottom:'2px solid '+(activeTab===tab.key?'#3b82f6':'transparent'), fontSize:12, fontWeight:700, cursor:'pointer', transition:'all 0.2s', letterSpacing:0.5, textTransform:'uppercase' }}>
              {tab.icon} {tab.label}
            </button>
          ))}
          <a href="/pwr/calendar" style={{ display:'flex', alignItems:'center', gap:7, padding:'10px 20px', background:'transparent', borderBottom:'2px solid transparent', color:'#64748b', fontSize:12, fontWeight:700, textDecoration:'none', letterSpacing:0.5, textTransform:'uppercase' }}>
            <Calendar size={15}/> CALENDAR
          </a>
        </div>
      </div>

      {/* Content */}
      <div key={activeTab} className="pwr-fadein">
        {activeTab === 'KANBAN' && <PwrKanbanClient initialTasks={tasks} />}
        {activeTab === 'LIST'   && <PwrListView tasks={tasks} />}
      </div>

      {/* Create Form Modal */}
      {showForm && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
          <div className="pwr-scalein" style={{ background:'#1e293b', borderRadius:16, padding:32, width:'100%', maxWidth:640, maxHeight:'90vh', overflowY:'auto', border:'1px solid rgba(255,255,255,0.08)' }}>
            <PwrTaskForm task={null} onClose={()=>setShowForm(false)} onSaved={()=>{ setShowForm(false); refresh(); }}/>
          </div>
        </div>
      )}
    </div>
  );
}
