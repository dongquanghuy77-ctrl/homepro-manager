const fs = require('fs');
let c = fs.readFileSync('src/components/pwr/manager/ManagerDashboardClient.tsx', 'utf8');

const replaceStr = `          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>`;
const newStr = `          {data.scrapRequests && data.scrapRequests.length > 0 && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 16, padding: 24, marginBottom: 32 }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 700, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={20} /> Yêu cầu cấp bù vật tư (Rework)
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {data.scrapRequests.map((req: any) => (
                  <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.5)', padding: 16, borderRadius: 12 }}>
                    <div>
                      <div style={{ fontWeight: 700, marginBottom: 4 }}>Task #{req.taskId}: {req.reason}</div>
                      <div style={{ fontSize: 13, color: c.muted }}>
                        {req.itemsRequested?.map((i: any) => \`\${i.material} (SL: \${i.qty})\`).join(', ')}
                      </div>
                    </div>
                    <button onClick={async () => {
                      if (!confirm('Duyệt xuất bù vật tư này?')) return;
                      await fetch('/api/pwr/manager/scrap-approve', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: req.id })
                      });
                      fetchData();
                    }} style={{ background: '#10b981', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>
                      Duyệt Xuất Kho
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>`;

c = c.replace(replaceStr, newStr);
fs.writeFileSync('src/components/pwr/manager/ManagerDashboardClient.tsx', c, 'utf8');
