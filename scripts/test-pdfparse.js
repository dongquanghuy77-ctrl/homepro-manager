// Quick test: how pdf-parse exports
const pp = require('pdf-parse');
console.log('type:', typeof pp);
console.log('keys:', Object.keys(pp).slice(0,10).join(','));
