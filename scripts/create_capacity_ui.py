ui_code = """'use client';

import { useState, useEffect } from 'react';
import { Activity, CalendarDays, AlertTriangle, Battery, BatteryFull, BatteryMedium, BatteryWarning } from 'lucide-react';

export default function PwrCapacityClient() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/pwr/capacity')
      .then(res => res.json())
      .then(d => {
        setData(d);
        setIsLoading(false);
      });
  }, []);

  if (isLoading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>Đang tính toán Tải Trọng Máy Móc...</div>;

  return (
    <div style={{ padding: '8px 24px 60px', color: 'var(--color-text)', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Activity size={28} color="#8b5cf6" />
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: -0.5 }}>Bảng Tải Trọng Máy Móc (Capacity)</h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--color-text-muted)' }}>Mô phỏng thời gian thực lượng giờ máy đang bị chiếm dụng</p>
          </div>
        </div>
      </div>

      {/* Heatmap Matrix */}
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
        
        {/* Header Row (Dates) */}
        <div style={{ display: 'flex', background: 'var(--color-surface-2)', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ width: 200, padding: 16, fontWeight: 700, borderRight: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <CalendarDays size={18} /> Máy móc / Tổ đội
          </div>
          {data.dates.map((d: string) => {
            const dateObj = new Date(d);
            const isToday = dateObj.toDateString() === new Date().toDateString();
            return (
              <div key={d} style={{ flex: 1, padding: 16, textAlign: 'center', borderRight: '1px solid var(--color-border)', background: isToday ? 'rgba(139, 92, 246, 0.1)' : 'transparent' }}>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 600 }}>{dateObj.toLocaleDateString('vi-VN', { weekday: 'short' })}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: isToday ? '#8b5cf6' : 'var(--color-text)' }}>{dateObj.getDate()}/{dateObj.getMonth() + 1}</div>
              </div>
            );
          })}
        </div>

        {/* Machine Rows */}
        {data.matrix.map((row: any, idx: number) => (
          <div key={row.resource.id} style={{ display: 'flex', borderBottom: idx === data.matrix.length - 1 ? 'none' : '1px solid var(--color-border)' }}>
            
            <div style={{ width: 200, padding: 16, borderRight: '1px solid var(--color-border)', background: 'var(--color-bg)' }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{row.resource.name}</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Battery size={14} /> Công suất: {row.resource.capacityHoursPerDay}h/ngày
              </div>
            </div>

            {row.schedule.map((cell: any) => {
              let bg = 'transparent';
              let color = 'var(--color-text)';
              let icon = null;
              let highlight = 'var(--color-border)';

              if (cell.status === 'OVERLOAD') {
                bg = '#fef2f2'; color = '#ef4444'; icon = <AlertTriangle size={14} />; highlight = '#ef4444';
              } else if (cell.status === 'WARNING') {
                bg = '#fffbeb'; color = '#f59e0b'; icon = <BatteryWarning size={14} />; highlight = '#f59e0b';
              } else if (cell.status === 'SAFE') {
                bg = '#f0fdf4'; color = '#10b981'; icon = <BatteryMedium size={14} />; highlight = '#10b981';
              }

              return (
                <div key={cell.dateStr} style={{ flex: 1, padding: 12, borderRight: '1px solid var(--color-border)', background: bg, position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                  
                  {/* Load Bar */}
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, background: 'rgba(0,0,0,0.05)' }}>
                    <div style={{ height: '100%', width: `${Math.min(cell.loadPercentage, 100)}%`, background: highlight, transition: 'width 0.5s ease-out' }}></div>
                  </div>

                  {cell.totalHours > 0 ? (
                    <>
                      <div style={{ fontSize: 18, fontWeight: 900, color: color, display: 'flex', alignItems: 'center', gap: 4 }}>
                        {cell.totalHours.toFixed(1)} <span style={{ fontSize: 12, fontWeight: 700 }}>h</span>
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                        {icon} {Math.round(cell.loadPercentage)}%
                      </div>
                    </>
                  ) : (
                    <div style={{ color: 'var(--color-border)', fontWeight: 600, fontSize: 14 }}>-</div>
                  )}

                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div style={{ marginTop: 24, padding: 16, background: 'rgba(139, 92, 246, 0.1)', borderRadius: 12, color: '#7c3aed', fontSize: 13, fontWeight: 600, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <AlertTriangle size={24} style={{ flexShrink: 0 }} />
        <div>
          <strong style={{ display: 'block', fontSize: 14, marginBottom: 4 }}>GHI CHÚ TỪ TƯ DUY NGƯỢC:</strong>
          Khi nổ Task từ file OneClick, hệ thống đã ngầm quy đổi số Tấm/Mét Nẹp thành Giờ Chạy Máy. Nếu cột [Hôm nay] báo Đỏ (Vượt 100%), anh Huy tuyệt đối không được nổ thêm Task. Bắt buộc phải Kéo/Thả (Dời lịch) các Task sang ngày hôm sau để không làm thợ kiệt sức và cháy máy!
        </div>
      </div>
      
    </div>
  );
}
"""

page_code = """import PwrCapacityClient from '@/components/pwr/capacity/PwrCapacityClient';

export default function CapacityPage() {
  return <PwrCapacityClient />;
}
"""

import os
os.makedirs("src/components/pwr/capacity", exist_ok=True)
with open("src/components/pwr/capacity/PwrCapacityClient.tsx", "w", encoding="utf-8") as f:
    f.write(ui_code)

os.makedirs("src/app/pwr/capacity", exist_ok=True)
with open("src/app/pwr/capacity/page.tsx", "w", encoding="utf-8") as f:
    f.write(page_code)

print("Created Capacity Dashboard")