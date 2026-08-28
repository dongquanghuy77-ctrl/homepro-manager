'use client';

import { useState } from 'react';
import { AlertOctagon, Wrench, PackageX, UserX, AlertTriangle, Calculator, X } from 'lucide-react';

export default function PwrScrapModal({ taskId, materials, onClose }: { taskId: number, materials: any[], onClose: () => void }) {
  const [materialId, setMaterialId] = useState<number>(materials[0]?.id || 0);
  const [quantity, setQuantity] = useState<number>(1);
  const [faultCategory, setFaultCategory] = useState<string>('LỖI THAO TÁC (Thợ)');
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Giả lập giá vật tư trung bình để quy ra tiền
  const selectedMaterial = materials.find(m => m.id === materialId);
  const costEstimate = (selectedMaterial?.price || 450000) * quantity; 

  const handleSubmit = async () => {
    if (!reason.trim()) return alert("Bắt buộc phải nhập chi tiết nguyên nhân hỏng hóc!");
    
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/pwr/tasks/${taskId}/scrap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          materialId,
          quantity,
          faultCategory,
          reason,
          costEstimate
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      alert('Đã báo cáo hao hụt. Kho đã tự động trừ để cấp bù!');
      onClose();
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ background: 'var(--color-surface)', width: '100%', maxWidth: 500, borderRadius: 16, overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', animation: 'slideUp 0.3s ease-out' }}>
        
        {/* Header - Danger Theme */}
        <div style={{ background: '#ef4444', padding: '20px 24px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <AlertOctagon size={28} />
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>BÁO CÁO HỎNG HÓC & XIN CẤP BÙ</h2>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}><X size={24} /></button>
        </div>

        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Vật tư & Số lượng */}
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ flex: 2 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 8, color: 'var(--color-text-muted)' }}>Vật tư bị hỏng</label>
              <select 
                value={materialId} 
                onChange={e => setMaterialId(Number(e.target.value))}
                style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', fontWeight: 600 }}
              >
                {materials.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 8, color: 'var(--color-text-muted)' }}>Số lượng bù</label>
              <input 
                type="number" min="1" 
                value={quantity} onChange={e => setQuantity(Number(e.target.value))}
                style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', fontWeight: 800, textAlign: 'center' }} 
              />
            </div>
          </div>

          {/* Quy trách nhiệm (Accountability) */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 8, color: 'var(--color-text-muted)' }}>Phân loại trách nhiệm (Ai đền?)</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { label: 'LỖI THAO TÁC (Thợ)', icon: <UserX size={16}/>, color: '#ef4444' },
                { label: 'LỖI BẢN VẼ (Thiết kế)', icon: <Wrench size={16}/>, color: '#f97316' },
                { label: 'LỖI MÁY MÓC (Bảo trì)', icon: <AlertTriangle size={16}/>, color: '#eab308' },
                { label: 'LỖI VẬT TƯ (Nhà Cung Cấp)', icon: <PackageX size={16}/>, color: '#3b82f6' }
              ].map(cat => (
                <button 
                  key={cat.label}
                  onClick={() => setFaultCategory(cat.label)}
                  style={{ 
                    display: 'flex', alignItems: 'center', gap: 8, padding: '10px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    background: faultCategory === cat.label ? `${cat.color}15` : 'var(--color-bg)',
                    border: `1px solid ${faultCategory === cat.label ? cat.color : 'var(--color-border)'}`,
                    color: faultCategory === cat.label ? cat.color : 'var(--color-text-muted)'
                  }}
                >
                  {cat.icon} {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Chi tiết nguyên nhân */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 8, color: 'var(--color-text-muted)' }}>Mô tả chi tiết nguyên nhân</label>
            <textarea 
              value={reason} onChange={e => setReason(e.target.value)}
              placeholder="Ví dụ: Gãy mũi dao số 2 làm cày xước mặt ván..."
              style={{ width: '100%', height: 80, padding: '12px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', resize: 'none', fontSize: 13 }}
            />
          </div>

          {/* Hiển thị thiệt hại tài chính */}
          <div style={{ background: '#fef2f2', border: '1px dashed #f87171', padding: 16, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#dc2626' }}>
              <Calculator size={20} />
              <span style={{ fontSize: 13, fontWeight: 700 }}>Ước tính thiệt hại tài chính:</span>
            </div>
            <span style={{ fontSize: 18, fontWeight: 900, color: '#dc2626' }}>
              {costEstimate.toLocaleString('vi-VN')} VNĐ
            </span>
          </div>

        </div>

        {/* Footer Actions */}
        <div style={{ padding: '16px 24px', background: 'var(--color-surface-2)', borderTop: '1px solid var(--color-border)', display: 'flex', gap: 12 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)', fontWeight: 700, cursor: 'pointer' }}>
            Hủy Bỏ
          </button>
          <button onClick={handleSubmit} disabled={isSubmitting} style={{ flex: 2, padding: '12px', borderRadius: 8, border: 'none', background: '#ef4444', color: '#fff', fontWeight: 800, cursor: isSubmitting ? 'not-allowed' : 'pointer' }}>
            {isSubmitting ? 'ĐANG LƯU LOG...' : 'XÁC NHẬN BÁO HỎNG & TRỪ KHO'}
          </button>
        </div>

      </div>
    </div>
  );
}
