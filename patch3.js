const fs = require('fs');
let c = fs.readFileSync('src/components/pwr/capacity/PwrCapacityClient.tsx', 'utf-8');

c = c.replace(
  'const [showRollback, setShowRollback] = useState(false);',
  'const [showRollback, setShowRollback] = useState(false);\n  const [showAutoLevel, setShowAutoLevel] = useState(false);\n  const [isLeveling, setIsLeveling] = useState(false);'
);

c = c.replace(
  'onClick={() => { alert(\'Tính năng San Phẳng (Auto-Level) đang được hoàn thiện thuật toán. Vui lòng thử lại sau.\'); }}',
  'onClick={() => { setShowAutoLevel(!showAutoLevel); setShowRollback(false); if (!showAutoLevel) loadBatches(); }}'
);

c = c.replace(
  'onClick={() => { setShowRollback(!showRollback); if (!showRollback) loadBatches(); }}',
  'onClick={() => { setShowRollback(!showRollback); setShowAutoLevel(false); if (!showRollback) loadBatches(); }}'
);

c = c.replace(
  'const handleRollback = async (batchId: string) => {',
  'const handleAutoLevel = async (batchId: string) => {\n    if (!confirm(⚠️ XÁC NHẬN SAN PHẲNG LÔ \n\nHệ thống sẽ thu hồi toàn bộ khối lượng còn lại của Lô này và phân bổ lại dựa trên Lịch Máy (Machine Calendar) mới nhất.)) return;\n    setIsLeveling(true);\n    try {\n      const res = await fetch(\'/api/pwr/ingestion/auto-level\', {\n        method: \'POST\',\n        headers: { \'Content-Type\': \'application/json\' },\n        body: JSON.stringify({ batchId })\n      });\n      const result = await res.json();\n      if (!res.ok) throw new Error(result.error);\n      alert(✅ );\n      window.location.reload();\n    } catch (err: any) {\n      alert(\'Lỗi San Phẳng: \' + err.message);\n    } finally {\n      setIsLeveling(false);\n    }\n  };\n\n  const handleRollback = async (batchId: string) => {'
);

const autoLevelPanel = \{showAutoLevel && (
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
      )}\n\n      \;

c = c.replace('{showRollback && (', autoLevelPanel + '{showRollback && (');
fs.writeFileSync('src/components/pwr/capacity/PwrCapacityClient.tsx', c);
