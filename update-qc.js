const fs = require('fs');
let c = fs.readFileSync('src/app/api/pwr/station/qc/route.ts', 'utf8');

c = c.replace(/status: "TODO", \/\/ C.n l.m l.i/, `status: "TODO", // Cần làm lại
        priority: "CRITICAL", // Ưu tiên cao nhất`);

fs.writeFileSync('src/app/api/pwr/station/qc/route.ts', c, 'utf8');
