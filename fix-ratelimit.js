const fs = require('fs');
let c = fs.readFileSync('src/lib/ratelimit.ts', 'utf8');
c = c.replace(/if \(REDIS_URL && REDIS_TOKEN\)/, "if (REDIS_URL && REDIS_URL.startsWith('http') && REDIS_TOKEN)");
fs.writeFileSync('src/lib/ratelimit.ts', c, 'utf8');
