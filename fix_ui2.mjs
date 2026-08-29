import fs from 'fs';

const kanbanPath = 'src/components/pwr/kanban/PwrWbsView.tsx';
let content = fs.readFileSync(kanbanPath, 'utf-8');

const newHeader = `                  <div style={{ display: 'flex', gap: 8 }}>
                    {pTasks[0]?.projectId && (
                      <button 
                        onClick={() => handleDeleteProject(pTasks[0].projectId!, projName)}
                        style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '8px 16px', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                      >
                        <Trash2 size={16} /> Xóa Dự Án
                      </button>
                    )}
                    <button onClick={() => setShowModal(true)} style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 8, fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                      + T\u1EA1o vi\u1EC7c m\u1EDBi
                    </button>
                  </div>`;

const regex = /<div style=\{\{ display: 'flex', gap: 8 \}\}>\s*<button onClick=\{\(\) => setShowModal\(true\)\} style=\{\{ background: '#3b82f6'[\s\S]*?<\/button>\s*<\/div>/;

if (regex.test(content)) {
  content = content.replace(regex, newHeader);
  fs.writeFileSync(kanbanPath, content);
  console.log("Successfully replaced!");
} else {
  console.log("Regex didn't match.");
}
