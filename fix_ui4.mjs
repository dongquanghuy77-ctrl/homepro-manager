import fs from 'fs';

const filepath = 'src/components/pwr/ingestion/PwrIngestionClient.tsx';
let content = fs.readFileSync(filepath, 'utf-8');

const batchUI = `
                  <div style={{ margin: '0 0 24px 0', textAlign: 'left' }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--color-text-muted)' }}>Tên Lô / Đợt sản xuất (Tùy chọn):</label>
                    <input 
                      type="text" 
                      value={batchName}
                      onChange={(e) => setBatchName(e.target.value)}
                      placeholder="VD: Đợt 1 - Tủ Bếp Tầng 1"
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)', outline: 'none', fontSize: 14 }}
                    />
                  </div>
`;

// Find `<input type="file" id="file-upload"`
const target = /<input\s+type="file"\s+id="file-upload"/;
content = content.replace(target, batchUI + '$&');

fs.writeFileSync(filepath, content);
console.log("Injected successfully with regex!");
