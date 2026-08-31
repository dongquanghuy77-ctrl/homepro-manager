const fs = require('fs');
let c = fs.readFileSync('src/app/api/pwr/ingestion/explode/route.ts', 'utf-8');
c = c.replace(
  `const generateChunks = (totalQty, totalHours) => {`,
  `const generateChunks = (totalQty: number, totalHours: number) => {`
);
fs.writeFileSync('src/app/api/pwr/ingestion/explode/route.ts', c);
