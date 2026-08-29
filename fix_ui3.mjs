import fs from 'fs';

const filepath = 'src/components/pwr/ingestion/PwrIngestionClient.tsx';
let content = fs.readFileSync(filepath, 'utf-8');

const batchUI = `
                      <div>
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

// Find where to insert. We will insert it after the Phân Loại Dự Án select block.
// Let's insert it before the closing </div> of the 'NEW' branch.
// The easiest way is to find `<select ... value={newProjectType}` and insert it right after that block.
const insertTarget = /<select[\s\S]*?value=\{newProjectType\}[\s\S]*?<\/select>\s*<\/div>/;
content = content.replace(insertTarget, (match) => {
  return match + "\n" + batchUI;
});

// Since the user might also want this field in the 'EXISTING' project mode (to add a new batch to an existing project!), we should actually put it OUTSIDE the projectMode condition, or in both.
// Let's put it right before `<button style={{ display: 'flex', alignItems: 'center' ... onClick={handleFileClick}`
// Wait, the button for choosing file is separate? 
// Let's look at the UI. "Tạo Dự Án Mới", "Nhà Hàng 19", "Phân loại", then "Chọn file từ máy tính".
// Yes, the button is below everything. So inserting it right before the button is perfect.
fs.writeFileSync(filepath, content);
console.log("Injected Batch Name UI");
