const fs = require('fs');
let c = fs.readFileSync('src/components/pwr/kanban/PwrKanbanClient.tsx', 'utf-8');

if (!c.includes('import PwrDispatchModal')) {
  c = c.replace(
    "import { KanbanConfig } from '@/lib/pwr/types';",
    "import { KanbanConfig } from '@/lib/pwr/types';\nimport PwrDispatchModal from './PwrDispatchModal';"
  );
}

if (!c.includes('dispatchTask')) {
  c = c.replace(
    "const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null);",
    "const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null);\n  const [dispatchTask, setDispatchTask] = useState<any>(null);"
  );
}

// Add the dispatch button next to the Quick Action Button
if (!c.includes('Điều Phối')) {
  c = c.replace(
    "onClick={(e) => { e.stopPropagation(); moveTask(task, action.next); }}",
    "onClick={(e) => { e.stopPropagation(); moveTask(task, action.next); }}"
  );
  c = c.replace(
    "  {action.label}",
    "  {action.label}\n                            </button>\n                            <button\n                              onClick={(e) => { e.stopPropagation(); setDispatchTask(task); }}\n                              style={{ flex: 1, padding: '8px', border: 'none', background: 'var(--color-surface-2)', color: 'var(--color-text)', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 12 }}\n                            >\n                              ⚡ Điều Phối\n                            </button>"
  );
  // Need to fix the button closing tag issue from the above replace
  c = c.replace(
    "  {action.label}\n                            </button>\n                            <button\n                              onClick={(e) => { e.stopPropagation(); setDispatchTask(task); }}\n                              style={{ flex: 1, padding: '8px', border: 'none', background: 'var(--color-surface-2)', color: 'var(--color-text)', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 12 }}\n                            >\n                              ⚡ Điều Phối\n                            </button>\n                            </button>",
    "  {action.label}\n                            </button>\n                            <button\n                              onClick={(e) => { e.stopPropagation(); setDispatchTask(task); }}\n                              style={{ flex: 1, padding: '8px', border: 'none', background: 'var(--color-surface-2)', color: 'var(--color-text)', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 12 }}\n                            >\n                              ⚡ Điều Phối\n                            </button>"
  );
  
  // Actually, wait, let's just use regex or a safer replace for the button container.
}

// Add the modal component at the end
if (!c.includes('<PwrDispatchModal')) {
  c = c.replace(
    "    </div>\n  );\n}",
    "      {dispatchTask && <PwrDispatchModal task={dispatchTask} onClose={() => setDispatchTask(null)} onRefresh={refresh} />}\n    </div>\n  );\n}"
  );
}

fs.writeFileSync('src/components/pwr/kanban/PwrKanbanClient.tsx', c);
