const fs = require('fs');
let c = fs.readFileSync('src/components/pwr/capacity/PwrCapacityClient.tsx', 'utf-8');

// Add states for Override Modal
c = c.replace(
  const [weekOffset, setWeekOffset] = useState(0);,
  const [weekOffset, setWeekOffset] = useState(0);\n  const [overrideModal, setOverrideModal] = useState<any>(null);\n  const [overrideValue, setOverrideValue] = useState('8.0');\n  const [overrideReason, setOverrideReason] = useState('');
);

// Function to save override
c = c.replace(
  const handleRollback = async (batchId: string) => {,
  const handleSaveOverride = async () => {\n    try {\n      const res = await fetch('/api/pwr/capacity/override', {\n        method: 'POST',\n        headers: { 'Content-Type': 'application/json' },\n        body: JSON.stringify({\n          resourceId: overrideModal.resource.id,\n          dateStr: overrideModal.dateStr,\n          capacityHours: overrideValue === '' ? null : Number(overrideValue),\n          reason: overrideReason\n        })\n      });\n      if(res.ok) {\n        setOverrideModal(null);\n        // trigger re-fetch\n        setWeekOffset(w => w + 0.0001); // force effect re-run\n      } else {\n        alert('Failed to save override');\n      }\n    } catch(e) { console.error(e) }\n  };\n\n  const handleRollback = async (batchId: string) => {
);

// Click handler on the cell
c = c.replace(
  <div key={cell.dateStr} style={{ flex: 1, padding: 12, borderRight: '1px solid var(--color-border)', background: bg, position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>,
  <div key={cell.dateStr} onClick={() => { setOverrideModal({ resource: row.resource, dateStr: cell.dateStr, current: cell.maxCapacity, isOverride: cell.isOverride, reason: cell.reason }); setOverrideValue(cell.maxCapacity.toString()); setOverrideReason(cell.reason || ''); }} style={{ flex: 1, padding: 12, borderRight: '1px solid var(--color-border)', background: bg, position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', cursor: 'pointer' }}>
);

// Render the override icon and custom capacity text instead of standard capacity
c = c.replace(
  <div style={{ fontSize: 11, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>\n                <Battery size={14} /> Công suất: {row.resource.capacityHoursPerDay}h/ngày\n              </div>,
  <div style={{ fontSize: 11, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>\n                <Battery size={14} /> Gốc: {row.resource.capacityHoursPerDay}h/ngày\n              </div>
);

c = c.replace(
  {icon} {Math.round(cell.loadPercentage)}%,
  {icon} {Math.round(cell.loadPercentage)}%\n                      {cell.isOverride && <span style={{fontSize: 10, background: '#8b5cf6', color: '#fff', padding: '1px 4px', borderRadius: 4, marginLeft: 4}} title={cell.reason || 'Đã điều chỉnh lịch'}>⚡ {cell.maxCapacity}h</span>}
);

c = c.replace(
  <div style={{ color: 'var(--color-border)', fontWeight: 600, fontSize: 14 }}>-</div>,
  <div style={{ color: 'var(--color-border)', fontWeight: 600, fontSize: 14 }}>-</div>\n                    {cell.isOverride && <div style={{fontSize: 10, background: '#8b5cf6', color: '#fff', padding: '1px 4px', borderRadius: 4, marginTop: 4}} title={cell.reason || 'Đã điều chỉnh lịch'}>⚡ {cell.maxCapacity}h</div>}
);

// Add modal JSX at the bottom before final </div>
c = c.replace(
  </div>\n    </div>\n  );\n},
  </div>\n      \n      {overrideModal && (\n        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>\n          <div style={{ background: 'var(--color-surface)', padding: 24, borderRadius: 12, width: 400, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>\n            <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>Nắn Cốc / Điều Chỉnh Lịch Máy</h3>\n            <div style={{ fontSize: 14, marginBottom: 16 }}>\n              <strong>Máy:</strong> {overrideModal.resource.name} <br/>\n              <strong>Ngày:</strong> {overrideModal.dateStr}\n            </div>\n            <div style={{ marginBottom: 16 }}>\n              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Công suất ngày này (Giờ): (Xóa trống để về mặc định)</label>\n              <input type="number" step="0.5" value={overrideValue} onChange={e => setOverrideValue(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }} />\n            </div>\n            <div style={{ marginBottom: 24 }}>\n              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Lý do (Tăng ca, Cúp điện...):</label>\n              <input type="text" value={overrideReason} onChange={e => setOverrideReason(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }} />\n            </div>\n            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>\n              <button onClick={() => setOverrideModal(null)} style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text)', cursor: 'pointer' }}>Hủy</button>\n              <button onClick={handleSaveOverride} style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: '#8b5cf6', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Lưu thay đổi</button>\n            </div>\n          </div>\n        </div>\n      )}\n    </div>\n  );\n}
);

fs.writeFileSync('src/components/pwr/capacity/PwrCapacityClient.tsx', c);
