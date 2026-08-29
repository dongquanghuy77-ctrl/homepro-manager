const fs = require('fs');
let c = fs.readFileSync('src/components/pwr/kanban/PwrKanbanClient.tsx', 'utf-8');

c = c.replace(
  "return (\n                            <button\n                              onClick={(e) => { e.stopPropagation(); moveTask(task, action.next); }}",
  "return (\n                            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>\n                            <button\n                              onClick={(e) => { e.stopPropagation(); moveTask(task, action.next); }}"
);

c = c.replace(
  "style={{ \n                                marginTop: 8, \n                                width: '100%', ",
  "style={{ \n                                flex: 1, \n                                width: '100%', "
);

c = c.replace(
  "                              {action.icon} {action.label} \n                            </button>\n                          );",
  "                              {action.icon} {action.label} \n                            </button>\n                            <button\n                              onClick={(e) => { e.stopPropagation(); setDispatchTask(task); }}\n                              style={{ flex: 1, padding: '6px 0', border: '1px solid var(--color-border)', background: 'var(--color-surface-2)', color: 'var(--color-text)', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 11 }}\n                            >\n                              ⚡ Điều Phối\n                            </button>\n                            </div>\n                          );"
);

fs.writeFileSync('src/components/pwr/kanban/PwrKanbanClient.tsx', c);
