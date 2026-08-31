const fs = require('fs');
let c = fs.readFileSync('src/app/api/pwr/ingestion/explode/route.ts', 'utf-8');
c = c.replace(/source: 'SYSTEM_EXPLOSION'/g, `source: 'SYSTEM_EXPLOSION', startDate: chunk.dateStr, dueDate: chunk.dateStr`);
fs.writeFileSync('src/app/api/pwr/ingestion/explode/route.ts', c);
