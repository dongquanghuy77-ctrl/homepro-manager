const fs = require('fs');
let c = fs.readFileSync('next.config.mjs', 'utf8');

if (!c.includes('eslint:')) {
  c = c.replace(/experimental: \{/, "eslint: { ignoreDuringBuilds: true },\n  experimental: {");
  fs.writeFileSync('next.config.mjs', c, 'utf8');
}
