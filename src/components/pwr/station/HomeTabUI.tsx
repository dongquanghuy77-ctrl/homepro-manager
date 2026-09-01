import React from 'react';
import { AlertCircle, Calendar, CheckCircle2, Clock, Factory } from 'lucide-react';
import { usePwrStore } from '@/lib/pwr/usePwrStore';

export function HomeTabUI() {
  const { userName } = usePwrStore();
  
  return (
    <div style={{ padding: '20px 20px 100px 20px' }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 4px 0' }}>Chào buổi chiều,</h2>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#c084fc', margin: 0 }}>{userName}!</h1>
        <p style={{ color: '#9ca3af', fontSize: 14, marginTop: 8 }}>Hôm nay xưởng khá bận rộn, cố lên nhé.</p>
      </div>

      {/* KPI Hôm nay */}
      <div className="glass-card" style={{ padding: 20, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: 16, fontWeight: 600 }}>Tiến độ hôm nay</span>
          <span style={{ color: '#34d399', fontWeight: 700 }}>68%</span>
        </div>
        <div style={{ height: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ width: '68%', height: '100%', background: 'linear-gradient(90deg, #10b981 0%, #34d399 100%)', borderRadius: 4 }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 20 }}>
          <div>
            <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>Đã hoàn thành</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>42 SP</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>Còn lại</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>18 SP</div>
          </div>
        </div>
      </div>

      {/* Thông báo khẩn */}
      <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <AlertCircle size={20} color="#fbbf24" /> Việc khẩn cấp (Ưu tiên cao)
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="glass-card" style={{ padding: 16, borderLeft: '4px solid #ef4444' }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Bổ sung ván cắt hỏng - Đơn tủ áo A12</div>
          <div style={{ fontSize: 12, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Clock size={12} /> Hạn: 15:30 chiều nay
          </div>
        </div>
        <div className="glass-card" style={{ padding: 16, borderLeft: '4px solid #fbbf24' }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Kiểm tra bảo dưỡng máy Dán cạnh</div>
          <div style={{ fontSize: 12, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Calendar size={12} /> Hôm nay
          </div>
        </div>
      </div>
    </div>
  );
}
