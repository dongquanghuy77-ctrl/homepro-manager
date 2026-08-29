import fs from 'fs';

const filepath = 'src/components/pwr/kanban/PwrKanbanClient.tsx';
let content = fs.readFileSync(filepath, 'utf-8');

const oldCode = `{nextStatuses.length > 0 && (
                          <select
                            className="filter-bar-select"
                            style={{ fontSize: 10, padding: '2px 4px', width: '100%', marginTop: 4 }}
                            value=""
                            onChange={e => { if (e.target.value) moveTask(task, e.target.value); }}
                          >
                            <option value="">→ Chuyển trạng thái</option>
                            {nextStatuses.map(s => (
                              <option key={s} value={s}>
                                {PWR_STATUS[s]?.icon} {PWR_STATUS[s]?.label}
                              </option>
                            ))}
                          </select>
                        )}`;

const newCode = `
                        {/* QUICK ACTION BUTTONS */}
                        {(() => {
                          const quickMap: Record<string, { label: string, color: string, next: string, icon: string }> = {
                            INBOX: { label: 'Vào Cần Làm', color: '#8b5cf6', next: 'TODO', icon: '📥' },
                            TODO: { label: 'Bắt Đầu Làm', color: '#3b82f6', next: 'IN_PROGRESS', icon: '▶️' },
                            IN_PROGRESS: { label: 'Xong', color: '#10b981', next: 'DONE', icon: '✅' },
                            WAITING: { label: 'Tiếp Tục', color: '#3b82f6', next: 'IN_PROGRESS', icon: '▶️' },
                            DEFERRED: { label: 'Mở Lại', color: '#f59e0b', next: 'TODO', icon: '🔄' },
                          };
                          const action = quickMap[task.status];
                          if (!action) return null;
                          return (
                            <button
                              onClick={(e) => { e.stopPropagation(); moveTask(task, action.next); }}
                              style={{ 
                                marginTop: 8, 
                                width: '100%', 
                                padding: '6px 0', 
                                fontSize: 11, 
                                fontWeight: 600, 
                                borderRadius: 6, 
                                border: \`1px solid \${action.color}40\`, 
                                background: \`\${action.color}15\`, 
                                color: action.color, 
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                              }}
                              onMouseOver={(e) => { e.currentTarget.style.background = \`\${action.color}30\`; }}
                              onMouseOut={(e) => { e.currentTarget.style.background = \`\${action.color}15\`; }}
                            >
                              {action.icon} {action.label} 
                            </button>
                          );
                        })()}
`;

if (content.includes('→ Chuyển trạng thái')) {
  content = content.replace(oldCode, newCode);
  fs.writeFileSync(filepath, content);
  console.log('Replaced dropdown with Quick Action buttons!');
} else {
  console.log('Target code not found.');
}
