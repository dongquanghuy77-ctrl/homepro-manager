const fs = require('fs');
let c = fs.readFileSync('src/app/api/pwr/ingestion/explode/route.ts', 'utf-8');
c = c.replace("tags: ['EXPLOSION', 'DAN_CANH', batchTag],", "tags: ['EXPLOSION', 'DAN_CANH', batchTag, '⏰ Chờ CNC 30p'],");
c = c.replace("tags: ['EXPLOSION', 'KHOAN_CAM', batchTag],", "tags: ['EXPLOSION', 'KHOAN_CAM', batchTag, '⏰ Chờ Dán Cạnh 1h'],");
fs.writeFileSync('src/app/api/pwr/ingestion/explode/route.ts', c);
