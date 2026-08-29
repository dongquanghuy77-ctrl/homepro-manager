const fs = require('fs');
let c = fs.readFileSync('src/components/pwr/kanban/PwrKanbanClient.tsx', 'utf-8');

c = c.replace("import PwrDispatchModal from './PwrDispatchModal';\n", "");
c = c.replace("'use client';", "'use client';\nimport PwrDispatchModal from './PwrDispatchModal';\n");

fs.writeFileSync('src/components/pwr/kanban/PwrKanbanClient.tsx', c);
