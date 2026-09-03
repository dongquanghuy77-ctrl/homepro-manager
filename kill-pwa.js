const fs = require('fs');
let c = fs.readFileSync('next.config.mjs', 'utf8');

c = c.replace(/disable: process.env.NODE_ENV === "development",/, "disable: true, // TEMPORARILY DISABLED TO KILL PWA CACHE GHOST");

fs.writeFileSync('next.config.mjs', c, 'utf8');
