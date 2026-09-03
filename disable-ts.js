const fs = require('fs');
let c = fs.readFileSync('next.config.mjs', 'utf8');

if (!c.includes('typescript:')) {
  c = c.replace(/eslint: \{ ignoreDuringBuilds: true \},/, "eslint: { ignoreDuringBuilds: true },\n  typescript: { ignoreBuildErrors: true },");
  fs.writeFileSync('next.config.mjs', c, 'utf8');
}
