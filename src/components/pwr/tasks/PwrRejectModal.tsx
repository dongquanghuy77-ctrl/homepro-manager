'use client';

import { useState, useEffect } from 'react';
import { ShieldAlert, CornerUpLeft, MessageSquareWarning, X, AlertTriangle } from 'lucide-react';

export default function PwrRejectModal({ taskId, onClose }: { taskId: number, onClose: () => void }) {
  const [predecessors, setPredecessors] = useState<any[]>([]);
  const [selectedPredecessorId, setSelectedPredecessorId] = useState<number>(0);
  const [rejectQuantity, setRejectQuantity] = useState<number>(1);
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/pwr/tasks/${taskId}/predecessors`)
      .then(res => res.json())
      .then(data => {
        setPredecessors(data);
        if (data.length > 0) setSelectedPredecessorId(data[0].id);
        setIsLoading(false);
      });
  }, [taskId]);

  const handleSubmit = async () => {
    if (!reason.trim()) return alert("Bắt buộc phải nhập lý do từ chối để làm bằng chứng!");
    if (!selectedPredecessorId) return alert("Không tìm thấy công đoạn trước để trả về.");
    
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/pwr/tasks/${taskId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          predecessorId: selectedPredecessorId,
          rejectQuantity,
          reason
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      alert(data.message);
      onClose(); // Reload page if necessary in parent component
      window.location.reload();
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ background: 'var(--color-surface)', width: '100%', maxWidth: 500, borderRadius: 16, overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', border: '1px solid #334155', animation: 'slideUp 0.3s ease-out' }}>
        
        {/* Header - Rework Theme */}
        <div style={{ background: '#f59e0b', padding: '20px 24px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <CornerUpLeft size={28} style={{ strokeWidth: 3 }} />
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, letterSpacing: -0.5 }}>TỪ CHỐI NHẬN - ĐÁ BÓNG NGƯỢC</h2>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}><X size={24} /></button>
        </div>

        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>Đang tìm vết công đoạn trước...</div>
        ) : predecessors.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#ef4444', fontWeight: 600 }}>
            <AlertTriangle size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
            Công đoạn này là công đoạn đầu tiên, không có ai trước đó để trả hàng!
          </div>
        ) : (
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
            
            <div style={{ background: 'rgba(245,158,11,0.1)', color: '#d97706', padding: 12, borderRadius: 8, fontSize: 13, fontWeight: 600, display: 'flex', gap: 8 }}>
              <ShieldAlert size={18} style={{ flexShrink: 0 }} />
              Việc từ chối sẽ nổ một Lệnh Rework (Làm Lại Khẩn Cấp) cho Tổ trước, và trừ điểm KPI của họ!
            </div>

            {/* Chọn Đích đến */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 8, color: 'var(--color-text-muted)' }}>Mục tiêu trả hàng (Tổ làm sai)</label>
              <select 
                value={selectedPredecessorId} 
                onChange={e => setSelectedPredecessorId(Number(e.target.value))}
                style={{ width: '100%', padding: '12px', borderRadius: 8, border: '2px solid #fcd34d', background: 'var(--color-bg)', color: 'var(--color-text)', fontWeight: 700 }}
              >
                {predecessors.map(p => (
                  <option key={p.id} value={p.id}>[Task #{p.id}] {p.title}</option>
                ))}
              </select>
            </div>

            {/* Số lượng */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 8, color: 'var(--color-text-muted)' }}>Số lượng sản phẩm lỗi trả về</label>
              <input 
                type="number" min="1" 
                value={rejectQuantity} onChange={e => setRejectQuantity(Number(e.target.value))}
                style={{ width: '100%', padding: '12px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', fontWeight: 800, fontSize: 16 }} 
              />
            </div>

            {/* Lý do */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, marginBottom: 8, color: 'var(--color-text-muted)' }}>
                <MessageSquareWarning size={16} /> Bằng chứng / Lý do lỗi (Bắt buộc)
              </label>
              <textarea 
                value={reason} onChange={e => setReason(e.target.value)}
                placeholder="Ví dụ: Ván bị mẻ góc do dao cùn, không dán nẹp được..."
                style={{ width: '100%', height: 80, padding: '12px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', resize: 'none', fontSize: 14 }}
              />
            </div>

          </div>
        )}

        {/* Footer Actions */}
        {predecessors.length > 0 && (
          <div style={{ padding: '16px 24px', background: 'var(--color-surface-2)', borderTop: '1px solid var(--color-border)', display: 'flex', gap: 12 }}>
            <button onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)', fontWeight: 700, cursor: 'pointer' }}>
              Hủy
            </button>
            <button onClick={handleSubmit} disabled={isSubmitting} style={{ flex: 2, padding: '12px', borderRadius: 8, border: 'none', background: '#f59e0b', color: '#fff', fontWeight: 800, cursor: isSubmitting ? 'not-allowed' : 'pointer' }}>
              {isSubmitting ? 'ĐANG LẬP BIÊN BẢN...' : 'PHÁT LỆNH BẮT ĐỀN'}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
