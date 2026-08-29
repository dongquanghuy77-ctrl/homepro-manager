"use client";

import React, { useState } from 'react';
import { PwrTask } from '@/lib/pwr/types';
import { X } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { vi } from 'date-fns/locale';

interface PwrDispatchModalProps {
  task: PwrTask;
  onClose: () => void;
  onRefresh: () => void;
}

export default function PwrDispatchModal({ task, onClose, onRefresh }: PwrDispatchModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'RESCHEDULE' | 'OVERTIME_SPILL' | 'OUTSOURCE'>('OVERTIME_SPILL');
  
  const [nextDate, setNextDate] = useState(format(addDays(new Date(), 1), 'yyyy-MM-dd'));
  const [otHours, setOtHours] = useState('10');

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`/api/pwr/tasks/${task.id}/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: mode, nextDate, otHours })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi hệ thống');
      
      onRefresh();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'var(--color-surface)', width: '100%', maxWidth: 480, borderRadius: 12, border: '1px solid var(--color-border)', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid var(--color-border)' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            ⚡ Điều Phối Tải Trọng
          </h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {error && <div style={{ padding: 12, background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderRadius: 8, fontSize: 14 }}>{error}</div>}
          
          <div style={{ padding: 12, background: 'var(--color-surface-2)', borderRadius: 8, fontSize: 14 }}>
            <strong>Task:</strong> {task.title}<br/>
            <strong>Tải trọng dự kiến (Nếu có):</strong> {task.estimatedMinutes ? (task.estimatedMinutes / 60).toFixed(2) + 'h' : 'Theo cấu hình nổ file'}
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={() => setMode('RESCHEDULE')} style={{ flex: 1, padding: 10, background: mode === 'RESCHEDULE' ? 'var(--color-primary)' : 'var(--color-surface-2)', color: mode === 'RESCHEDULE' ? '#fff' : 'var(--color-text)', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Dời lịch</button>
            <button onClick={() => setMode('OVERTIME_SPILL')} style={{ flex: 1, padding: 10, background: mode === 'OVERTIME_SPILL' ? 'var(--color-primary)' : 'var(--color-surface-2)', color: mode === 'OVERTIME_SPILL' ? '#fff' : 'var(--color-text)', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Tăng ca / Tràn số</button>
            <button onClick={() => setMode('OUTSOURCE')} style={{ flex: 1, padding: 10, background: mode === 'OUTSOURCE' ? 'var(--color-primary)' : 'var(--color-surface-2)', color: mode === 'OUTSOURCE' ? '#fff' : 'var(--color-text)', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Thuê ngoài</button>
          </div>

          {mode === 'RESCHEDULE' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)' }}>Chuyển sang ngày:</label>
              <input type="date" value={nextDate} onChange={e => setNextDate(e.target.value)} style={{ padding: '10px 12px', borderRadius: 6, border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }} />
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: 0 }}>Toàn bộ tải trọng sẽ được chuyển sang ngày mới.</p>
            </div>
          )}

          {mode === 'OVERTIME_SPILL' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)' }}>Cho phép chạy máy hôm nay (Giờ):</label>
                <input type="number" step="0.5" value={otHours} onChange={e => setOtHours(e.target.value)} style={{ padding: '10px 12px', borderRadius: 6, border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)' }}>Phần thừa sẽ tràn sang ngày:</label>
                <input type="date" value={nextDate} onChange={e => setNextDate(e.target.value)} style={{ padding: '10px 12px', borderRadius: 6, border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }} />
              </div>
              <p style={{ fontSize: 12, color: '#f59e0b', margin: 0 }}>Hệ thống sẽ ép giới hạn {otHours}h cho ngày hiện tại, và lấy (Tổng giờ - {otHours}h) ném sang ngày tiếp theo.</p>
            </div>
          )}

          {mode === 'OUTSOURCE' && (
            <div style={{ padding: 12, background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderRadius: 8, fontSize: 14 }}>
              Hệ thống sẽ trừ tải trọng của máy về 0, chuyển trạng thái Task thành "Hoàn Thành" (với lý do Thuê Ngoài). Bảng công suất sẽ xanh trở lại.
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
            <button onClick={onClose} disabled={loading} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: 'var(--color-surface-2)', color: 'var(--color-text)', fontWeight: 600, cursor: 'pointer' }}>Hủy</button>
            <button onClick={handleSubmit} disabled={loading} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: 'var(--color-primary)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
              {loading ? 'Đang xử lý...' : 'Xác nhận'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
