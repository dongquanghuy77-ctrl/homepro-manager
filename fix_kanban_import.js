const fs = require('fs');
let c = fs.readFileSync('src/components/pwr/kanban/PwrKanbanClient.tsx', 'utf-8');
if (!c.includes('import PwrDispatchModal')) {
  c = "import PwrDispatchModal from './PwrDispatchModal';\n" + c;
  fs.writeFileSync('src/components/pwr/kanban/PwrKanbanClient.tsx', c);
}
