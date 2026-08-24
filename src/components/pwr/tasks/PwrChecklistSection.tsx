'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, CheckSquare, Square } from 'lucide-react';
import type { PwrChecklist } from '@/db/schema';

interface Props { taskId: number; }

export default function PwrChecklistSection({ taskId }: Props) {
  const [items, setItems] = useState<PwrChecklist[]>([]);
  const [newText, setNewText] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/pwr/checklists?taskId=' + taskId)
      .then(r => r.json()).then(setItems).finally(() => setLoading(false));
  }, [taskId]);

  const done = items.filter(i => i.isDone).length;
  const pct = items.length > 0 ? Math.round((done / items.length) * 100) : 0;

  async function add() {
    if (!newText.trim()) return;
    const res = await fetch('/api/pwr/checklists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId, content: newText.trim(), position: items.length }),
    });
    const item = await res.json();
    setItems(prev => [...prev, item]);
    setNewText('');
  }

  async function toggle(item: PwrChecklist) {
    const res = await fetch('/api/pwr/checklists/' + item.id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isDone: !item.isDone }),
    });
    const updated = await res.json();
    setItems(prev => prev.map(i => i.id === item.id ? updated : i));
  }

  async function remove(id: number) {
    await fetch('/api/pwr/checklists/' + id, { method: 'DELETE' });
    setItems(prev => prev.filter(i => i.id !== id));
  }

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 12 }}>
        <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
          <CheckSquare size={16} color="#3b82f6"/>
          <span style={{ fontSize:14, fontWeight:600, color:'#e2e8f0' }}>Checklist</span>
          {items.length > 0 && (
            <span style={{ fontSize:11, fontWeight:700, color:'#3b82f6', background:'rgba(59,130,246,0.15)', padding:'2px 8px', borderRadius:999 }}>
              {done}/{items.length}
            </span>
          )}
        </div>
        <span style={{ fontSize:12, color: pct===100?'#10b981':'#64748b', fontWeight:600 }}>{pct}%</span>
      </div>

      {items.length > 0 && (
        <div style={{ marginBottom: 10, height: 4, background:'rgba(255,255,255,0.06)', borderRadius:999, overflow:'hidden' }}>
          <motion.div animate={{ width: pct + '%' }} transition={{ duration:0.4 }}
            style={{ height:'100%', background: pct===100 ? '#10b981' : '#3b82f6', borderRadius:999 }}/>
        </div>
      )}

      {loading ? <div style={{ color:'#64748b', fontSize:12 }}>Đang tải...</div> : (
        <AnimatePresence>
          {items.map(item => (
            <motion.div key={item.id} initial={{ opacity:0, x:-8 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0 }}
              style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 0', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
              <button onClick={() => toggle(item)} style={{ background:'none', border:'none', cursor:'pointer', padding:0, color: item.isDone ? '#10b981' : '#64748b', flexShrink:0 }}>
                {item.isDone ? <CheckSquare size={16}/> : <Square size={16}/>}
              </button>
              <span style={{ flex:1, fontSize:13, color: item.isDone ? '#475569' : '#cbd5e1', textDecoration: item.isDone ? 'line-through' : 'none' }}>
                {item.content}
              </span>
              <button onClick={() => remove(item.id)} style={{ background:'none', border:'none', cursor:'pointer', padding:0, color:'#374151', opacity:0 }}
                onMouseEnter={e=>(e.currentTarget.style.opacity='1')} onMouseLeave={e=>(e.currentTarget.style.opacity='0')}>
                <Trash2 size={13}/>
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      )}

      <div style={{ display:'flex', gap:8, marginTop:10 }}>
        <input value={newText} onChange={e=>setNewText(e.target.value)}
          onKeyDown={e=>e.key==='Enter'&&add()}
          placeholder="Thêm mục checklist..."
          style={{ flex:1, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:6, padding:'7px 10px', color:'#e2e8f0', fontSize:13, outline:'none' }}/>
        <button onClick={add} disabled={!newText.trim()}
          style={{ display:'flex', alignItems:'center', gap:4, background: newText.trim() ? 'rgba(59,130,246,0.2)' : 'transparent', border:'1px solid rgba(59,130,246,0.3)', borderRadius:6, padding:'7px 12px', color:'#3b82f6', cursor: newText.trim() ? 'pointer' : 'not-allowed', fontSize:13, opacity: newText.trim() ? 1 : 0.4 }}>
          <Plus size={14}/> Thêm
        </button>
      </div>
    </div>
  );
}
