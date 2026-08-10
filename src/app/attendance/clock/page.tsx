// src/app/attendance/clock/page.tsx
// ══════════════════════════════════════════════════════════════════════════════
// Trang chấm công trên điện thoại dành cho nhân viên
// URL: /attendance/clock
//
// Smart action detection:
//   → Gọi API lấy trạng thái hôm nay
//   → Nếu chưa clock-in: hiển thị "Chấm công vào"
//   → Nếu đã clock-in nhưng chưa clock-out: hiển thị "Chấm công ra"
//   → Nếu đã clock-out: hiển thị trạng thái hoàn thành
// ══════════════════════════════════════════════════════════════════════════════
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, CheckCircle } from 'lucide-react';
import AttendanceClockForm from '@/components/hr/AttendanceClockForm';

type TodayStatus = {
  hasClockIn:   boolean;
  hasClockOut:  boolean;
  clockInTime?: string;
  clockOutTime?: string;
  employeeName?: string;
};

export default function ClockPage() {
  const router = useRouter();
  const [status,    setStatus]    = useState<TodayStatus | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [completed, setCompleted] = useState(false);

  // Lấy trạng thái chấm công hôm nay
  useEffect(() => {
    fetch('/api/hr/attendance/today')
      .then(r => r.json())
      .then((data) => {
        setStatus({
          hasClockIn:   !!data.checkIn,
          hasClockOut:  !!data.checkOut,
          clockInTime:  data.checkIn
            ? new Date(data.checkIn).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
            : undefined,
          clockOutTime: data.checkOut
            ? new Date(data.checkOut).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
            : undefined,
        });
      })
      .catch(() => setStatus({ hasClockIn: false, hasClockOut: false }))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Đã hoàn thành cả 2 lượt → hiển thị hoàn thành
  if (completed || (status?.hasClockIn && status?.hasClockOut)) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 24px', maxWidth: 400, margin: '0 auto' }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: '#10B98120', border: '3px solid #10B981',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
        }}>
          <CheckCircle size={40} style={{ color: '#10B981' }} />
        </div>
        <h2 style={{ fontWeight: 800, fontSize: 22, marginBottom: 8 }}>Đã hoàn thành hôm nay</h2>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginBottom: 24 }}>
          Vào: <strong>{status?.clockInTime}</strong> &nbsp;·&nbsp;
          Ra: <strong>{status?.clockOutTime ?? (completed ? 'Vừa xong' : '—')}</strong>
        </p>
        <button className="btn btn-secondary" onClick={() => router.push('/attendance')}>
          Xem chi tiết chấm công
        </button>
      </div>
    );
  }

  const action = (status?.hasClockIn && !status?.hasClockOut)
    ? 'CLOCK_OUT'
    : 'CLOCK_IN';

  return (
    <div>
      {/* Thông tin trạng thái hiện tại */}
      {status?.hasClockIn && !status?.hasClockOut && (
        <div style={{
          margin: '12px 16px 0',
          background: '#F59E0B10', border: '1px solid #F59E0B30',
          borderRadius: 10, padding: '10px 14px',
          fontSize: 13, color: '#F59E0B',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span>✅</span>
          <span>Đã vào lúc <strong>{status.clockInTime}</strong> — Bây giờ chấm công ra</span>
        </div>
      )}

      <AttendanceClockForm
        action={action}
        onSuccess={() => {
          // Nếu vừa clock-out → hoàn thành
          if (action === 'CLOCK_OUT') {
            setCompleted(true);
          } else {
            // Vừa clock-in → cập nhật state để hiển thị nút clock-out
            setStatus(prev => prev ? { ...prev, hasClockIn: true } : null);
          }
        }}
      />
    </div>
  );
}
