'use client';
import Link from 'next/link';
import type { PwrTask, PwrStatus, PwrPriority } from '@/db/schema';
import { PWR_STATUS, PWR_PRIORITY, getTodayVN, TERMINAL_STATUSES } from '@/lib/pwr/constants';
import { ExternalLink } from 'lucide-react';
import PwrDeadlineCountdown from '../tasks/PwrDeadlineCountdown';

interface Props { tasks: PwrTask[]; }

export default function PwrListView({ tasks }: Props) {
  const pOrder: Record<string,number> = { CRITICAL:0, HIGH:1, MEDIUM:2, LOW:3 };
  const sorted = [...tasks].sort((a,b) => (pOrder[a.priority]??9) - (pOrder[b.priority]??9));

  return (
    <div style={{ padding:'20px 24px', overflowX:'auto' }}>
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
        <thead>
          <tr style={{ borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
            {['#','Tiêu đề','Dự án','Người LH','Deadline','Ưu tiên','Trạng thái',''].map(h=>(
              <th key={h} style={{ padding:'10px 12px', textAlign:'left', color:'#64748b', fontWeight:600, textTransform:'uppercase', fontSize:11, letterSpacing:0.5, whiteSpace:'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map(task => {
            const st = PWR_STATUS[task.status as PwrStatus];
            const pr = PWR_PRIORITY[task.priority as PwrPriority];
            return (
              <tr key={task.id} style={{ borderBottom:'1px solid rgba(255,255,255,0.04)', transition:'background 0.15s' }}
                onMouseEnter={e=>(e.currentTarget.style.background='rgba(255,255,255,0.03)')}
                onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                <td style={{ padding:'12px', color:'#475569', fontSize:11 }}>#{task.id}</td>
                <td style={{ padding:'12px', color:'#e2e8f0', fontWeight:500, maxWidth:280 }}>
                  <div style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{task.title}</div>
                </td>
                <td style={{ padding:'12px', color:'#64748b', whiteSpace:'nowrap' }}>{task.projectRef||'—'}</td>
                <td style={{ padding:'12px', color:'#64748b', whiteSpace:'nowrap' }}>{task.assignedTo||'—'}</td>
                <td style={{ padding:'12px', whiteSpace:'nowrap' }}>
                  {task.dueDate ? <PwrDeadlineCountdown dueDate={task.dueDate} status={task.status}/> : '—'}
                </td>
                <td style={{ padding:'12px' }}>
                  <span style={{ background:pr?.color+'20', color:pr?.color, padding:'3px 8px', borderRadius:4, fontSize:11, fontWeight:600 }}>{pr?.label}</span>
                </td>
                <td style={{ padding:'12px' }}>
                  <span style={{ background:st?.bg, color:st?.color, padding:'3px 8px', borderRadius:4, fontSize:11, fontWeight:600 }}>{st?.label}</span>
                </td>
                <td style={{ padding:'12px' }}>
                  <Link href={"/pwr/tasks/"+task.id} style={{ color:'#3b82f6', display:'flex', alignItems:'center' }}><ExternalLink size={14}/></Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {sorted.length === 0 && (
        <div style={{ textAlign:'center', padding:60, color:'#475569' }}>Không có công việc nào</div>
      )}
    </div>
  );
}
