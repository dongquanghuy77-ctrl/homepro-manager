'use client';
import { useEffect, useState } from 'react';
import { AlertCircle, Clock } from 'lucide-react';

interface Props { dueDate: string; status: string; }
const TERMINAL = ['DONE','CANCELLED'];

export default function PwrDeadlineCountdown({ dueDate, status }: Props) {
  const [label, setLabel] = useState('');
  const [level, setLevel] = useState<'ok'|'upcoming'|'urgent'|'critical'|'overdue'>('ok');

  useEffect(() => {
    function compute() {
      if (TERMINAL.includes(status)) { setLabel(''); return; }
      const deadline = new Date(dueDate + 'T23:59:00+07:00');
      const now = new Date();
      const diff = deadline.getTime() - now.getTime();
      const mins = Math.floor(diff / 60000);
      const hours = Math.floor(mins / 60);
      const days = Math.floor(hours / 24);
      if (diff < 0) {
        const ah = Math.abs(hours); const am = Math.abs(mins) % 60;
        setLabel(ah > 0 ? 'Quá hạn ' + ah + 'h' + (am>0?am+'m':'') : 'Quá hạn ' + Math.abs(mins) + 'm');
        setLevel('overdue');
      } else if (hours < 2) {
        setLabel('⏰ Còn ' + (hours>0?hours+'h':'') + (mins%60)+'m');
        setLevel(hours < 1 ? 'critical' : 'urgent');
      } else if (hours < 24) {
        setLabel('Còn ' + hours + 'h');
        setLevel('upcoming');
      } else {
        setLabel('Còn ' + days + ' ngày');
        setLevel('ok');
      }
    }
    compute();
    const t = setInterval(compute, 60000);
    return () => clearInterval(t);
  }, [dueDate, status]);

  if (!label) return null;
  const colors: Record<string,string> = { ok:'#10b981', upcoming:'#3b82f6', urgent:'#f59e0b', critical:'#ef4444', overdue:'#ef4444' };
  const c = colors[level];
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:3, fontSize:11, fontWeight:600, color:c, background:c+'18', padding:'2px 7px', borderRadius:4 }}>
      {level==='overdue' ? <AlertCircle size={10}/> : <Clock size={10}/>}
      {label}
    </span>
  );
}
