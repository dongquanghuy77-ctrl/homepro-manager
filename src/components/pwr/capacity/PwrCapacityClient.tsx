'use client';

import { useState, useEffect } from 'react';
import { Activity, CalendarDays, AlertTriangle, Battery, BatteryFull, BatteryMedium, BatteryWarning } from 'lucide-react';

export default function PwrCapacityClient() {
  const [showRollback, setShowRollback] = useState(false);
  const [batches, setBatches] = useState<any[]>([]);
  const [isRollingBack, setIsRollingBack] = useState(false);
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


  const loadBatches = async () => {
    try {
      const res = await fetch('/api/pwr/tasks');
      const result = await res.json();
      const allTasks = result.tasks || result || [];
      // Group by BATCH_xxx tag - tasks from Explosion have BATCH_ in tags
      const batchMap: Record<string, any> = {};
      allTasks.forEach((t: any) => {
        const batchTag = (t.tags || []).find((tag: string) => tag.startsWith('BATCH_'));
        if (batchTag && t.source === 'SYSTEM_EXPLOSION' && t.status !== 'CANCELLED' && !t.deletedAt) {
          if (!batchMap[batchTag]) {
            batchMap[batchTag] = { batchId: batchTag.replace('BATCH_', ''), tasks: [], title: '', project: t.projectRef || '' };
          }
          batchMap[batchTag].tasks.push(t);
          if (t.title && t.title.includes('CNC')) batchMap[batchTag].title = t.title;
        }
      });
      setBatches(Object.values(batchMap));
    } catch (e) { console.error(e); }
  };

  const handleRollback = async (batchId: string) => {
    if (!confirm(`⚠️ XÁC NHẬN HỦY NỔ\n\nBạn có chắc muốn hủy toàn bộ Lô ${batchId}?\n- Tất cả Task CNC/Dán Cạnh sẽ bị XÓA\n- Vật tư đã giam lỏng sẽ được HOÀN TRẢ\n- Tải trọng máy sẽ được GIẢI PHÓNG`)) return;
    setIsRollingBack(true);
    try {
      const res = await fetch('/api/pwr/ingestion/rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      alert(`✅ ${result.message}`);
      window.location.reload(); // Reload to refresh capacity data
    } catch (err: any) {
      alert('Lỗi Rollback: ' + err.message);
    } finally {
      setIsRollingBack(false);
    }
  };

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
        <button
          onClick={() => { setShowRollback(!showRollback); if (!showRollback) loadBatches(); }}
          style={{ background: showRollback ? '#ef4444' : 'rgba(239,68,68,0.1)', color: showRollback ? '#fff' : '#ef4444', border: '1px solid #ef4444', padding: '8px 16px', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 }}
        >
          {showRollback ? '✕ Đóng' : '🔄 Hủy Nổ / Sửa Sai'}
        </button>
      </div>

      {/* Rollback Panel */}
      {showRollback && (
        <div style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, padding: 20, marginBottom: 24 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700, color: '#ef4444' }}>🔄 Hủy Nổ Khẩn Cấp — Chọn Lô cần xóa</h3>
          <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--color-text-muted)' }}>
            Nếu anh nhập sai file Excel hoặc số lượng sai, bấm &quot;Hủy Nổ&quot; bên cạnh Lô tương ứng. Hệ thống sẽ tự động: Xóa Task + Hoàn trả vật tư + Giải phóng tải trọng máy.
          </p>
          {batches.length === 0 ? (
            <div style={{ padding: 16, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>Không có Lô nào đang hoạt động (hoặc tất cả đã được xử lý)</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {batches.map((b: any) => (
                <div key={b.batchId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--color-surface)', padding: '12px 16px', borderRadius: 8, border: '1px solid var(--color-border)' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>Lô: {b.batchId}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{b.tasks.length} Task — {b.title || 'Chưa xác định'}</div>
                  </div>
                  <button
                    onClick={() => handleRollback(b.batchId)}
                    disabled={isRollingBack}
                    style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: 6, fontWeight: 700, cursor: isRollingBack ? 'not-allowed' : 'pointer', fontSize: 12, opacity: isRollingBack ? 0.5 : 1 }}
                  >
                    {isRollingBack ? 'Đang hủy...' : '💥 Hủy Nổ'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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
