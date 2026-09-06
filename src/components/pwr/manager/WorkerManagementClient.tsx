'use client';
import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit3, X, Check, Loader2, Trash2 } from 'lucide-react';

interface Worker {
  id: number; name: string; phone: string | null; username: string | null; role: string;
  avatarUrl: string | null; createdAt: string | null;
  totalPoints: number | null; currentLevel: number | null; tasksCompleted: number | null;
}

export default function WorkerManagementClient() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editWorker, setEditWorker] = useState<Worker | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({ name: '', phone: '', password: '' });
  const [editForm, setEditForm] = useState({ name: '', phone: '', newPassword: '' });

  const c = {
    bg: '#0a0a0f', card: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.08)',
    accent: '#c084fc', muted: '#9ca3af', success: '#10b981', danger: '#ef4444', blue: '#3b82f6',
  };

  const fetchWorkers = async () => {
    try {
      const r = await fetch('/api/pwr/workers');
      const d = await r.json();
      setWorkers(d.workers || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchWorkers();
    // Auto-refresh moi 30s de dong bo khi co nhieu Manager cung xem
    const iv = setInterval(fetchWorkers, 30000);
    return () => clearInterval(iv);
  }, []);

  const handleCreate = async () => {
    if (!form.name || !form.phone || !form.password) { setError('Vui lòng nhập đầy đủ: Tên, SĐT, Mật khẩu'); return; }
    if (form.password.length < 6) { setError('Mật khẩu tối thiểu 6 ký tự'); return; }
    setSaving(true); setError('');
    const r = await fetch('/api/pwr/workers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const d = await r.json();
    if (!r.ok) { setError(d.error || 'Lỗi tạo tài khoản'); setSaving(false); return; }
    setSuccess('Đã tạo tài khoản: ' + form.name);
    setForm({ name: '', phone: '', password: '' }); setShowCreate(false); setSaving(false); fetchWorkers();
  };

  const handleEdit = async () => {
    if (!editWorker) return;
    setSaving(true); setError('');
    const r = await fetch('/api/pwr/workers/' + editWorker.id, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editForm) });
    const d = await r.json();
    if (!r.ok) { setError(d.error || 'Lỗi cập nhật'); setSaving(false); return; }
    setSuccess('Đã cập nhật: ' + (editForm.name || editWorker.name));
    setEditWorker(null); setSaving(false); fetchWorkers();
  };

  const handleDelete = async (w: Worker) => {
    if (!confirm('Vô hiệu hóa tài khoản "' + w.name + '"? Lịch sử task vẫn được giữ lại.')) return;
    const r = await fetch('/api/pwr/workers/' + w.id, { method: 'DELETE' });
    const d = await r.json();
    if (!r.ok) { alert(d.error || 'Loi xoa'); return; }
    setSuccess('Đã vô hiệu hóa: ' + w.name);
    fetchWorkers();
  };

  const Input = ({ label, k, type = 'text', ph = '' }: { label: string; k: string; type?: string; ph?: string }) => (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 13, color: c.muted, marginBottom: 6 }}>{label}</label>
      <input type={type} placeholder={ph}
        value={editWorker ? (editForm as any)[k] : (form as any)[k]}
        onChange={e => editWorker ? setEditForm(f => ({ ...f, [k]: e.target.value })) : setForm(f => ({ ...f, [k]: e.target.value }))}
        style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid ' + c.border, borderRadius: 8, padding: '12px 14px', color: '#fff', fontSize: 15, boxSizing: 'border-box' as any }} />
    </div>
  );

  const Modal = ({ title, onSave, btnColor }: { title: string; onSave: () => void; btnColor: string }) => (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
      <div style={{ background: '#111118', borderRadius: 20, padding: 32, width: '100%', maxWidth: 480, border: '1px solid ' + c.border }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>{title}</h2>
          <button onClick={() => { setShowCreate(false); setEditWorker(null); setError(''); }} style={{ background: 'none', border: 'none', color: c.muted, cursor: 'pointer' }}><X size={20} /></button>
        </div>
        {error && <div style={{ background: 'rgba(239,68,68,0.1)', color: c.danger, padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{error}</div>}
        <Input label="Họ và tên *" k="name" ph="Nguyen Van A" />
        <Input label="Số điện thoại *" k="phone" type="tel" ph="0901234567" />
        <Input label={editWorker ? "Mật khẩu mới (để trống = không đổi)" : "Mật khẩu *"} k={editWorker ? "newPassword" : "password"} type="password" ph="Ít nhất 6 ký tự" />
        <button onClick={onSave} disabled={saving}
          style={{ width: '100%', background: btnColor, color: '#fff', border: 'none', borderRadius: 12, padding: '14px 0', fontWeight: 700, fontSize: 16, cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {saving ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={18} />}
          {saving ? 'Đang xử lý...' : 'Xác nhận'}
        </button>
      </div>
    </div>
  );

  // Stats: so nguoi co task vs tong task
  const totalTasksDone = workers.reduce((s, w) => s + (w.tasksCompleted || 0), 0);
  const totalXP = workers.reduce((s, w) => s + (w.totalPoints || 0), 0);

  return (
    <div style={{ minHeight: '100vh', background: c.bg, color: '#fff', padding: 32 }}>
      <style>{'@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}'}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 800, margin: '0 0 8px 0', color: c.accent }}>Quản Lý Thợ Xưởng</h1>
          <p style={{ color: c.muted, margin: 0 }}>Tạo tài khoản, theo dõi điểm XP và hiệu suất thợ</p>
        </div>
        <button onClick={() => { setShowCreate(true); setError(''); }}
          style={{ background: c.accent, color: '#fff', border: 'none', borderRadius: 12, padding: '12px 24px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 15 }}>
          <Plus size={20} /> Thêm Thợ Mới
        </button>
      </div>

      {success && (
        <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: c.success, padding: '12px 16px', borderRadius: 12, marginBottom: 24, display: 'flex', justifyContent: 'space-between' }}>
          {success}
          <button onClick={() => setSuccess('')} style={{ background: 'none', border: 'none', color: c.success, cursor: 'pointer' }}><X size={16} /></button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 32 }}>
        {[
          { label: 'Tổng số thợ', value: workers.length, color: c.blue },
          { label: 'Tổng task hoàn thành', value: totalTasksDone, color: c.success },
          { label: 'Tổng XP toàn xưởng', value: totalXP.toLocaleString(), color: '#fbbf24' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: c.card, border: '1px solid ' + c.border, borderRadius: 16, padding: 20 }}>
            <div style={{ fontSize: 12, color: c.muted, marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color }}>{value}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: c.muted }}>
          <Loader2 size={40} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 16px', display: 'block' }} />
          Đang tải...
        </div>
      ) : workers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: c.muted, background: c.card, borderRadius: 16, border: '1px solid ' + c.border }}>
          <Users size={48} color={c.accent} style={{ margin: '0 auto 16px', display: 'block' }} />
          <p style={{ fontSize: 18, fontWeight: 600, color: '#fff' }}>Chưa có thợ nào</p>
          <p>Nhan "Thêm Thợ Mới" de bat dau</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {workers.map(w => (
            <div key={w.id} style={{ background: c.card, border: '1px solid ' + c.border, borderRadius: 16, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: c.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, flexShrink: 0, overflow: 'hidden' }}>
                {w.avatarUrl ? <img src={w.avatarUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : w.name?.[0]?.toUpperCase() || '?'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{w.name}</div>
                <div style={{ color: c.muted, fontSize: 13 }}>
                  {w.phone
                    ? <span>📞 {w.phone}</span>
                    : w.username
                      ? <span title="ID đăng nhập trạm">🔑 {w.username}</span>
                      : <span style={{ color: '#ef4444' }}>Chưa có SĐT</span>
                  }
                </div>
              </div>
              <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: c.muted }}>Level</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: c.accent }}>Lv.{w.currentLevel || 1}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: c.muted }}>XP</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#fbbf24' }}>{(w.totalPoints || 0).toLocaleString()}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: c.muted }}>Tasks</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: c.success }}>{w.tasksCompleted || 0}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { setEditWorker(w); setEditForm({ name: w.name, phone: w.phone || '', newPassword: '' }); setError(''); }}
                  style={{ background: 'rgba(59,130,246,0.1)', color: c.blue, border: '1px solid rgba(59,130,246,0.3)', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                  <Edit3 size={16} /> Sua
                </button>
                <button onClick={() => handleDelete(w)}
                  style={{ background: 'rgba(239,68,68,0.1)', color: c.danger, border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && <Modal title="Thêm Thợ Mới" onSave={handleCreate} btnColor={c.accent} />}
      {editWorker && <Modal title={'Sửa: ' + editWorker.name} onSave={handleEdit} btnColor={c.blue} />}
    </div>
  );
}
