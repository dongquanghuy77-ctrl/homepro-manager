'use client';
import { useState, useEffect } from 'react';
import { Activity, CalendarDays, AlertTriangle, Battery, BatteryFull, BatteryMedium, BatteryWarning, ChevronLeft, ChevronRight } from 'lucide-react';
import { addDays, format } from 'date-fns';

// Mapping máy → đơn vị sản xuất (tỷ lệ đã dùng trong Explode/AutoLevel)
function getResourceMeta(name: string): { rate: number; unit: string; emoji: string } {
  if (name.includes('CNC'))   return { rate: 1 / 0.15,   unit: 'tấm',  emoji: '🪵' };
  if (name.includes('Dán'))   return { rate: 1 / 0.01,   unit: 'mét',  emoji: '📏' };
  if (name.includes('Khoan')) return { rate: 1 / 0.0133, unit: 'lỗ',   emoji: '🔩' };
  return { rate: 0, unit: 'h', emoji: '⚙️' };
}

// Số người tối thiểu cần đồng thời khi máy đó chạy
function getWorkersPerMachine(name: string): number {
  if (name.includes('CNC')) return 2;   // 1 điều khiển + 1 khiêng ván
  if (name.includes('Dán')) return 1;   // 1 vận hành (B hỗ trợ vận chuyển từ CNC)
  if (name.includes('Khoan')) return 1; // 1 vận hành + tự phân loại
  return 1;
}

// Effective capacity của 1 người trong N giờ (có yếu tố mệt mỏi)
function effectiveHours(hours: number): number {
  if (hours <= 8) return hours;
  if (hours <= 12) return 8 + (hours - 8) * 0.85;
  return 8 + 4 * 0.85 + (hours - 12) * 0.70; // sau 12h hiệu suất giảm 30%
}

// Thuật toán Dynamic Staffing — trả về phân tích nhân công cho 1 ngày
function calcWorkforce(
  matrix: any[],
  dateStr: string,
  teamSize: number
): { personHours: number; workersNeeded: number; ratio: number; maxMachineHours: number; hasMachines: boolean; label: string; color: string; suggestion: string } {
  const activeMachines = matrix.filter((row: any) => {
    const cell = row.schedule.find((c: any) => c.dateStr === dateStr);
    return cell && cell.totalHours > 0;
  });

  if (activeMachines.length === 0) {
    return { personHours: 0, workersNeeded: 0, ratio: 0, maxMachineHours: 0, hasMachines: false, label: '', color: '', suggestion: '' };
  }

  // Person-hours thực tế cần thiết
  const personHours = activeMachines.reduce((sum: number, row: any) => {
    const cell = row.schedule.find((c: any) => c.dateStr === dateStr);
    const h = cell?.totalHours || 0;
    return sum + h * getWorkersPerMachine(row.resource.name);
  }, 0);

  // Giờ máy dài nhất trong ngày (xác định ca làm việc)
  const maxMachineHours = activeMachines.reduce((max: number, row: any) => {
    const cell = row.schedule.find((c: any) => c.dateStr === dateStr);
    return Math.max(max, cell?.totalHours || 0);
  }, 0);

  // Effective capacity của 1 người (có fatigue)
  const capPerPerson = effectiveHours(maxMachineHours);

  // Concurrent peak — không thể xuống dưới số người tối thiểu khi máy cùng chạy
  const concurrentPeak = activeMachines.reduce((sum: number, row: any) => sum + getWorkersPerMachine(row.resource.name), 0);

  // Workers needed = max(concurrent_peak, ceil(personHours / capPerPerson))
  const workersNeeded = Math.max(concurrentPeak, Math.ceil(personHours / capPerPerson));

  // Ratio so với đội hiện tại
  const teamCapacity = teamSize * capPerPerson;
  const ratio = personHours / teamCapacity;

  // Traffic light — ngưỡng màu + nhãn + gợi ý
  let label: string, color: string, suggestion: string;
  const idle = teamSize - workersNeeded;
  if (ratio < 0.20) {
    label = `✅ ${workersNeeded}/${teamSize} người`; color = '#10b981';
    suggestion = idle > 0 ? `💡 ${idle} người rảnh — có thể giao việc khác` : '';
  } else if (ratio < 0.60) {
    label = `✅ ${workersNeeded}/${teamSize} người`; color = '#10b981';
    suggestion = idle > 0 ? `💡 ${idle} người rảnh nửa ngày` : '';
  } else if (ratio < 0.85) {
    label = `⚠️ ${workersNeeded}/${teamSize} người`; color = '#f59e0b';
    suggestion = 'Vận hành bình thường';
  } else if (ratio <= 1.0) {
    label = `⚠️ Căng! ${workersNeeded}/${teamSize}`; color = '#f97316';
    suggestion = 'Không có buffer — theo dõi sát';
  } else if (ratio <= 1.25) {
    label = `🚨 Thiếu! Cần +${workersNeeded - teamSize} người`; color = '#ef4444';
    suggestion = `Huy động bổ sung ${workersNeeded - teamSize} người ngay`;
  } else {
    const extra = workersNeeded - teamSize;
    label = `🚨 Khủng hoảng! +${extra} người`; color = '#dc2626';
    suggestion = `Cần thêm ${extra} người hoặc dời tiến độ`;
  }

  return { personHours, workersNeeded, ratio, maxMachineHours, hasMachines: true, label, color, suggestion };
}



export default function PwrCapacityClient() {
  const [showRollback, setShowRollback] = useState(false);
  const [batches, setBatches] = useState<any[]>([]);
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);
  const [showAutoLevel, setShowAutoLevel] = useState(false);
  const [isLeveling, setIsLeveling] = useState(false);
  const [overrideModal, setOverrideModal] = useState<any>(null);
  const [overrideValue, setOverrideValue] = useState('8.0');
  const [overrideReason, setOverrideReason] = useState('');
  // Cấu hình đội — lưu localStorage để nhớ qua các lần mở
  const [teamSize, setTeamSize] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pwr_team_size');
      return saved ? parseInt(saved) : 4;
    }
    return 4;
  });
  const changeTeamSize = (delta: number) => {
    setTeamSize(prev => {
      const next = Math.max(1, Math.min(20, prev + delta));
      if (typeof window !== 'undefined') localStorage.setItem('pwr_team_size', String(next));
      return next;
    });
  };

  // Override số người từng ngày (linh hoạt) — lưu localStorage
  const [dailyTeam, setDailyTeam] = useState<Record<string, number>>(() => {
    try { return JSON.parse(localStorage.getItem('pwr_daily_team') || '{}'); } catch { return {}; }
  });
  const [editingDay, setEditingDay] = useState<string | null>(null);
  const [editVal, setEditVal] = useState(4);

  const getDayTeam = (dateStr: string) => dailyTeam[dateStr] ?? teamSize;

  const applyDayTeam = (dateStr: string, val: number) => {
    setDailyTeam(prev => {
      const next = { ...prev, [dateStr]: Math.max(0, Math.min(20, val)) };
      localStorage.setItem('pwr_daily_team', JSON.stringify(next));
      return next;
    });
    setEditingDay(null);
  };
  const resetDayTeam = (dateStr: string) => {
    setDailyTeam(prev => {
      const next = { ...prev }; delete next[dateStr];
      localStorage.setItem('pwr_daily_team', JSON.stringify(next));
      return next;
    });
    setEditingDay(null);
  };


  useEffect(() => {
    setIsLoading(true);
    const today = new Date();
    const startDate = format(addDays(today, weekOffset * 7), 'yyyy-MM-dd');
    const endDate = format(addDays(today, weekOffset * 7 + 6), 'yyyy-MM-dd');
    fetch(`/api/pwr/capacity?start=${startDate}&end=${endDate}`)
      .then(res => res.json())
      .then(d => {
        setData(d);
        setIsLoading(false);
      });
  }, [weekOffset]);


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

  const handleSaveOverride = async () => {
    try {
      const res = await fetch('/api/pwr/capacity/override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resourceId: overrideModal.resource.id,
          dateStr: overrideModal.dateStr,
          capacityHours: overrideValue === '' ? null : Number(overrideValue),
          reason: overrideReason
        })
      });
      if(res.ok) {
        setOverrideModal(null);
        setWeekOffset(w => w + 0.0001); // force effect re-run
      } else {
        alert('Failed to save override');
      }
    } catch(e) { console.error(e) }
  };

  const handleAutoLevel = async (batchId: string) => {
    if (!confirm(`⚠️ XÁC NHẬN SAN PHẲNG LÔ ${batchId}\n\nHệ thống sẽ thu hồi toàn bộ khối lượng còn lại của Lô này và phân bổ lại dựa trên Lịch Máy (Machine Calendar) mới nhất.`)) return;
    setIsLeveling(true);
    try {
      const res = await fetch('/api/pwr/ingestion/auto-level', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      alert(`✅ ${result.message}`);
      window.location.reload();
    } catch (err: any) {
      alert('Lỗi San Phẳng: ' + err.message);
    } finally {
      setIsLeveling(false);
    }
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

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Week Navigation */}
          <div style={{ display: 'flex', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, overflow: 'hidden' }}>
            <button onClick={() => setWeekOffset(w => w - 1)} style={{ padding: '6px 10px', background: 'transparent', border: 'none', borderRight: '1px solid var(--color-border)', cursor: 'pointer', color: 'var(--color-text)', display: 'flex', alignItems: 'center' }}><ChevronLeft size={18} /></button>
            <div style={{ padding: '6px 16px', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', minWidth: 100, justifyContent: 'center' }}>
              {weekOffset === 0 ? 'Tuần này' : weekOffset === 1 ? 'Tuần sau' : weekOffset === -1 ? 'Tuần trước' : `Tuần ${weekOffset > 0 ? '+' : ''}${weekOffset}`}
            </div>
            <button onClick={() => setWeekOffset(w => w + 1)} style={{ padding: '6px 10px', background: 'transparent', border: 'none', borderLeft: '1px solid var(--color-border)', cursor: 'pointer', color: 'var(--color-text)', display: 'flex', alignItems: 'center' }}><ChevronRight size={18} /></button>
          </div>
          
          <button
            onClick={() => { setShowAutoLevel(!showAutoLevel); setShowRollback(false); if (!showAutoLevel) loadBatches(); }}
            style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            🌊 San Phẳng
          </button>

          <button
            onClick={() => { setShowRollback(!showRollback); setShowAutoLevel(false); if (!showRollback) loadBatches(); }}
            style={{ background: showRollback ? '#ef4444' : 'rgba(239,68,68,0.1)', color: showRollback ? '#fff' : '#ef4444', border: '1px solid #ef4444', padding: '8px 16px', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 }}
          >
            {showRollback ? '✕ Đóng' : '🔄 Hủy Nổ / Sửa Sai'}
          </button>
        </div>
      </div>

      {showAutoLevel && (
        <div style={{ background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 12, padding: 20, marginBottom: 24 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700, color: '#3b82f6' }}>🌊 Chọn Lô Hàng Cần San Phẳng</h3>
          <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--color-text-muted)' }}>
            Tính năng này sẽ xóa bỏ các khung thời gian cũ và Rót lại toàn bộ khối lượng còn lại của lô hàng vào Lịch máy hiện tại của xưởng.
          </p>
          {batches.length === 0 ? (
            <div style={{ padding: 16, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>Không có Lô nào ở trạng thái TODO để San Phẳng.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {batches.map((b: any) => (
                <div key={b.batchId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--color-surface)', padding: '12px 16px', borderRadius: 8, border: '1px solid var(--color-border)' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>Lô: {b.batchId}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{b.tasks.length} Task — {b.title || 'Chưa xác định'}</div>
                  </div>
                  <button
                    onClick={() => handleAutoLevel(b.batchId)}
                    disabled={isLeveling}
                    style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: 6, fontWeight: 700, cursor: isLeveling ? 'not-allowed' : 'pointer', fontSize: 12, opacity: isLeveling ? 0.5 : 1 }}
                  >
                    {isLeveling ? 'Đang rót nước...' : '🌊 San Phẳng'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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
                <Battery size={14} /> Gốc: {row.resource.capacityHoursPerDay}h/ngày
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
                <div key={cell.dateStr} 
                  onClick={() => { setOverrideModal({ resource: row.resource, dateStr: cell.dateStr, current: cell.maxCapacity, isOverride: cell.isOverride, reason: cell.reason }); setOverrideValue(cell.isOverride ? cell.maxCapacity.toString() : ''); setOverrideReason(cell.reason || ''); }} 
                  style={{ flex: 1, padding: 12, borderRight: '1px solid var(--color-border)', background: bg, position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', cursor: 'pointer' }}
                  title="Click để Nắn Cốc (Sửa công suất)">
                  
                  {/* Load Bar */}
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, background: 'rgba(0,0,0,0.05)' }}>
                    <div style={{ height: '100%', width: `${Math.min(cell.loadPercentage, 100)}%`, background: highlight, transition: 'width 0.5s ease-out' }}></div>
                  </div>

                  {cell.totalHours > 0 ? (
                    <>
                      <div style={{ fontSize: 18, fontWeight: 900, color: color, display: 'flex', alignItems: 'center', gap: 4 }}>
                        {cell.totalHours.toFixed(1)} <span style={{ fontSize: 12, fontWeight: 700 }}>h</span>
                      </div>
                      {/* Đơn vị sản xuất — ngôn ngữ của tổ trưởng */}
                      {(() => {
                        const meta = getResourceMeta(row.resource.name);
                        if (meta.rate > 0) {
                          const qty = Math.round(cell.totalHours * meta.rate);
                          return (
                            <div style={{ fontSize: 11, fontWeight: 600, color: '#8b5cf6', marginTop: 2, letterSpacing: 0.3 }}>
                              {meta.emoji} ≈ {qty.toLocaleString('vi-VN')} {meta.unit}
                            </div>
                          );
                        }
                        return null;
                      })()}
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                        {icon} {Math.round(cell.loadPercentage)}%
                        {cell.isOverride && <span style={{fontSize: 10, background: '#8b5cf6', color: '#fff', padding: '1px 4px', borderRadius: 4, marginLeft: 4}} title={cell.reason || 'Đã điều chỉnh lịch'}>⚡ {cell.maxCapacity}h</span>}
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ color: 'var(--color-border)', fontWeight: 600, fontSize: 14 }}>-</div>
                      {cell.isOverride && <div style={{fontSize: 10, background: '#8b5cf6', color: '#fff', padding: '1px 4px', borderRadius: 4, marginTop: 4}} title={cell.reason || 'Đã điều chỉnh lịch'}>⚡ {cell.maxCapacity}h</div>}
                    </>
                  )}

                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* ─── BẢNG NHÂN CÔNG ĐỘNG — Dynamic Staffing ─────────────────────── */}
      <div style={{ marginTop: 16, border: '1px solid var(--color-border)', borderRadius: 12, overflow: 'hidden', background: 'var(--color-surface)' }}>
        {/* Header row với nút +/- cấu hình đội */}
        <div style={{ display: 'flex', background: 'rgba(139,92,246,0.08)', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ width: 200, padding: '12px 16px', borderRight: '1px solid var(--color-border)' }}>
            <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 6 }}>👥 Đội Sản Xuất</div>
            {/* Cấu hình team size */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button onClick={() => changeTeamSize(-1)}
                style={{ width: 24, height: 24, borderRadius: 6, border: '1px solid var(--color-border)', background: 'var(--color-bg)', cursor: 'pointer', fontWeight: 900, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
              <span style={{ fontWeight: 900, fontSize: 20, minWidth: 20, textAlign: 'center' }}>{teamSize}</span>
              <button onClick={() => changeTeamSize(1)}
                style={{ width: 24, height: 24, borderRadius: 6, border: '1px solid var(--color-border)', background: 'var(--color-bg)', cursor: 'pointer', fontWeight: 900, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
              <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>người</span>
            </div>
            <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 4 }}>Luân chuyển CNC→Dán→Khoan</div>
          </div>

          {data.dates.map((dateStr: string) => {
            const dayTeam = getDayTeam(dateStr);
            const isCustom = dailyTeam[dateStr] !== undefined;
            const wf = calcWorkforce(data.matrix, dateStr, dayTeam);
            const isEditing = editingDay === dateStr;

            // Ngày không có máy chạy — vẫn cho phép cài số người (để biết ai đang standby)
            return (
              <div key={dateStr} style={{ flex: 1, borderRight: '1px solid var(--color-border)', position: 'relative' }}>
                {isEditing ? (
                  /* ── INLINE EDIT MODE ── */
                  <div style={{ padding: '8px 4px', textAlign: 'center', background: 'rgba(139,92,246,0.1)' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, marginBottom: 6, color: '#8b5cf6' }}>Số người ngày này</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                      <button onClick={() => setEditVal(v => Math.max(0, v - 1))}
                        style={{ width: 22, height: 22, borderRadius: 4, border: '1px solid #8b5cf6', background: 'transparent', cursor: 'pointer', color: '#8b5cf6', fontWeight: 900, fontSize: 14 }}>−</button>
                      <span style={{ fontWeight: 900, fontSize: 20, minWidth: 24, textAlign: 'center', color: '#8b5cf6' }}>{editVal}</span>
                      <button onClick={() => setEditVal(v => Math.min(20, v + 1))}
                        style={{ width: 22, height: 22, borderRadius: 4, border: '1px solid #8b5cf6', background: 'transparent', cursor: 'pointer', color: '#8b5cf6', fontWeight: 900, fontSize: 14 }}>+</button>
                    </div>
                    <div style={{ display: 'flex', gap: 4, marginTop: 6, justifyContent: 'center' }}>
                      <button onClick={() => applyDayTeam(dateStr, editVal)}
                        style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: '#8b5cf6', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700 }}>✓ Lưu</button>
                      {isCustom && <button onClick={() => resetDayTeam(dateStr)}
                        style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', cursor: 'pointer' }}>Reset</button>}
                      <button onClick={() => setEditingDay(null)}
                        style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'transparent', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)', cursor: 'pointer' }}>✕</button>
                    </div>
                  </div>
                ) : (
                  /* ── DISPLAY MODE — click để chỉnh ── */
                  <div onClick={() => { setEditingDay(dateStr); setEditVal(dayTeam); }}
                    style={{ padding: '10px 6px', textAlign: 'center', cursor: 'pointer', minHeight: 70 }}
                    title={`Click để thay đổi số người ngày ${dateStr}`}>
                    {/* Badge riêng ngày */}
                    {isCustom && (
                      <div style={{ position: 'absolute', top: 4, right: 4, fontSize: 9, background: '#8b5cf6', color: '#fff', borderRadius: 3, padding: '1px 4px' }}>✏️ {dayTeam}ng</div>
                    )}
                    {wf.hasMachines ? (
                      <>
                        <div style={{ fontSize: 20, fontWeight: 900, color: wf.color, lineHeight: 1 }}>
                          {wf.workersNeeded}
                          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)' }}>/{dayTeam}</span>
                        </div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: wf.color, marginTop: 3 }}>{wf.label}</div>
                        {wf.maxMachineHours > 8 && (
                          <div style={{ fontSize: 9, background: '#7c3aed', color: '#fff', padding: '2px 5px', borderRadius: 4, marginTop: 3, display: 'inline-block' }}>
                            ⏰ OT {wf.maxMachineHours.toFixed(0)}h
                          </div>
                        )}
                        <div style={{ fontSize: 9, color: 'var(--color-text-muted)', marginTop: 3 }}>{wf.personHours.toFixed(1)} ng-giờ</div>
                      </>
                    ) : (
                      <div style={{ color: 'var(--color-text-muted)', fontSize: 11, marginTop: 8 }}>
                        <div style={{ fontSize: 16, color: 'var(--color-border)' }}>—</div>
                        <div style={{ fontSize: 9, marginTop: 2 }}>standby: {dayTeam}ng</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Hàng gợi ý hành động */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ width: 200, padding: '8px 16px', fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', borderRight: '1px solid var(--color-border)' }}>
            💡 Gợi ý hành động
          </div>
          {data.dates.map((dateStr: string) => {
            const wf = calcWorkforce(data.matrix, dateStr, getDayTeam(dateStr));
            return (
              <div key={dateStr} style={{ flex: 1, padding: '6px 8px', borderRight: '1px solid var(--color-border)', fontSize: 9, color: wf.color || 'var(--color-text-muted)', textAlign: 'center', fontWeight: 600 }}>
                {wf.suggestion || (getDayTeam(dateStr) > 0 ? `Standby ${getDayTeam(dateStr)} người` : '—')}
              </div>
            );
          })}
        </div>


        {/* Chú thích */}
        <div style={{ padding: '8px 16px', fontSize: 10, color: 'var(--color-text-muted)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <span>🪵 CNC: <strong>2 người</strong></span>
          <span>📏 Dán Cạnh: <strong>1 người</strong></span>
          <span>🔩 Khoan Cam: <strong>1 người</strong></span>
          <span style={{ color: '#10b981' }}>🟢 &lt;60%</span>
          <span style={{ color: '#f59e0b' }}>🟡 60-85%</span>
          <span style={{ color: '#f97316' }}>🟠 85-100%</span>
          <span style={{ color: '#ef4444' }}>🔴 &gt;100%</span>
          <span style={{ marginLeft: 'auto', fontSize: 9 }}>Fatigue: 8h=100% · 12h=85% · 16h=70%</span>
        </div>
      </div>


      {overrideModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}
             onClick={() => setOverrideModal(null)}>
          <div style={{ background: 'var(--color-surface)', borderRadius: 16, padding: 32, width: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
               onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800 }}>⚡ Điều chỉnh Công Suất</h3>
            <p style={{ margin: '0 0 24px', fontSize: 13, color: 'var(--color-text-muted)' }}>
              <strong>{overrideModal.resource.name}</strong> — Ngày <strong>{overrideModal.dateStr}</strong>
              <br/>Mặc định gốc: <strong>{overrideModal.resource.capacityHoursPerDay}h/ngày</strong>
            </p>

            <label style={{ display: 'block', marginBottom: 8, fontWeight: 700, fontSize: 13 }}>Công suất mới (giờ/ngày)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <input type="range" min="0" max="16" step="0.5"
                value={overrideValue === '' ? overrideModal.resource.capacityHoursPerDay : Number(overrideValue)}
                onChange={(e) => setOverrideValue(e.target.value)}
                style={{ flex: 1 }} />
              <span style={{ fontWeight: 800, fontSize: 20, minWidth: 50, textAlign: 'right', color: Number(overrideValue) === 0 ? '#ef4444' : Number(overrideValue) > 8 ? '#f59e0b' : '#10b981' }}>
                {overrideValue === '' ? overrideModal.resource.capacityHoursPerDay : overrideValue}h
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 20 }}>
              <span>0h (Nghỉ)</span><span>8h (Bình thường)</span><span>16h (Tăng ca)</span>
            </div>

            <label style={{ display: 'block', marginBottom: 8, fontWeight: 700, fontSize: 13 }}>Lý do (tuỳ chọn)</label>
            <input type="text" value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="Vd: Nghỉ lễ, Tăng ca bù, Sửa máy..."
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: 14, boxSizing: 'border-box', marginBottom: 24 }} />

            <div style={{ display: 'flex', gap: 12 }}>
              {overrideModal.isOverride && (
                <button onClick={async () => {
                  await fetch('/api/pwr/capacity/override', { method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ resourceId: overrideModal.resource.id, dateStr: overrideModal.dateStr, capacityHours: null }) });
                  setOverrideModal(null); setWeekOffset(w => w);
                  const today = new Date(); const start = format(addDays(today, weekOffset * 7), 'yyyy-MM-dd'); const end = format(addDays(today, weekOffset * 7 + 6), 'yyyy-MM-dd');
                  fetch(`/api/pwr/capacity?start=${start}&end=${end}`).then(r => r.json()).then(d => setData(d));
                }} style={{ flex: 1, padding: '10px 16px', background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text)', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
                  🗑 Xóa điều chỉnh
                </button>
              )}
              <button onClick={() => setOverrideModal(null)}
                style={{ flex: 1, padding: '10px 16px', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text)', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
                Huỷ
              </button>
              <button onClick={async () => {
                await fetch('/api/pwr/capacity/override', { method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ resourceId: overrideModal.resource.id, dateStr: overrideModal.dateStr, capacityHours: Number(overrideValue), reason: overrideReason }) });
                setOverrideModal(null);
                const today = new Date(); const start = format(addDays(today, weekOffset * 7), 'yyyy-MM-dd'); const end = format(addDays(today, weekOffset * 7 + 6), 'yyyy-MM-dd');
                fetch(`/api/pwr/capacity?start=${start}&end=${end}`).then(r => r.json()).then(d => setData(d));
              }} style={{ flex: 1, padding: '10px 16px', background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>
                💾 Lưu
              </button>
            </div>
          </div>
        </div>
      )}
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
