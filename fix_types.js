const fs = require('fs');
let c = fs.readFileSync('src/app/api/pwr/ingestion/explode/route.ts', 'utf-8');
c = c.replace(
  `items.filter((i) => i.type === 'HARDWARE' || i.category === 'HARDWARE').reduce((sum, i) => sum + i.quantity, 0)`,
  `items.filter((i: any) => i.type === 'HARDWARE' || i.category === 'HARDWARE').reduce((sum: number, i: any) => sum + i.quantity, 0)`
);
c = c.replace(
  `taskId: cncTask.id, // Link với CNC`,
  `taskId: cncTaskIds[0], // Link với CNC Phần 1`
);
c = c.replace(
  `machines.find((m) => m.name.includes('Khoan'))`,
  `machines.find((m: any) => m.name.includes('Khoan'))`
);
fs.writeFileSync('src/app/api/pwr/ingestion/explode/route.ts', c);
