const fs = require('fs');
let c = fs.readFileSync('src/app/api/pwr/ingestion/explode/route.ts', 'utf-8');

// For Purchase task (which uses batchTag)
c = c.replace(
  `tags: ['EXPLOSION', 'MUA_HANG', batchTag],\n          source: 'SYSTEM_EXPLOSION'`,
  `tags: ['EXPLOSION', 'MUA_HANG', batchTag],\n          source: 'SYSTEM_EXPLOSION',\n          startDate: todayStr,\n          dueDate: todayStr`
);

// For CNC
c = c.replace(
  `tags: ['EXPLOSION', 'CNC', batchTag],\n            source: 'SYSTEM_EXPLOSION'`,
  `tags: ['EXPLOSION', 'CNC', batchTag],\n            source: 'SYSTEM_EXPLOSION',\n            startDate: chunk.dateStr,\n            dueDate: chunk.dateStr`
);

// For DÁN CẠNH (no edge banding - done automatically)
c = c.replace(
  `tags: ['EXPLOSION', 'DAN_CANH', batchTag], source: 'SYSTEM_EXPLOSION'`,
  `tags: ['EXPLOSION', 'DAN_CANH', batchTag], source: 'SYSTEM_EXPLOSION', startDate: todayStr, dueDate: todayStr`
);

// For DÁN CẠNH (with chunks)
c = c.replace(
  `tags: ['EXPLOSION', 'DAN_CANH', batchTag, \`⏰ Chờ CNC \${chunk.numChunks > 1 ? 'Phần ' + chunk.partIndex : '30p'}\`],\n               source: 'SYSTEM_EXPLOSION'`,
  `tags: ['EXPLOSION', 'DAN_CANH', batchTag, \`⏰ Chờ CNC \${chunk.numChunks > 1 ? 'Phần ' + chunk.partIndex : '30p'}\`],\n               source: 'SYSTEM_EXPLOSION',\n               startDate: chunk.dateStr,\n               dueDate: chunk.dateStr`
);

// For KHOAN CAM (no drilling)
c = c.replace(
  `tags: ['EXPLOSION', 'KHOAN_CAM', batchTag], source: 'SYSTEM_EXPLOSION'`,
  `tags: ['EXPLOSION', 'KHOAN_CAM', batchTag], source: 'SYSTEM_EXPLOSION', startDate: todayStr, dueDate: todayStr`
);

// For KHOAN CAM (with chunks)
c = c.replace(
  `tags: ['EXPLOSION', 'KHOAN_CAM', batchTag, \`⏰ Chờ Dán Cạnh \${chunk.numChunks > 1 ? 'Phần ' + chunk.partIndex : '1h'}\`],\n               source: 'SYSTEM_EXPLOSION'`,
  `tags: ['EXPLOSION', 'KHOAN_CAM', batchTag, \`⏰ Chờ Dán Cạnh \${chunk.numChunks > 1 ? 'Phần ' + chunk.partIndex : '1h'}\`],\n               source: 'SYSTEM_EXPLOSION',\n               startDate: chunk.dateStr,\n               dueDate: chunk.dateStr`
);

fs.writeFileSync('src/app/api/pwr/ingestion/explode/route.ts', c);
