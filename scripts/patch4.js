const fs = require('fs');
let content = fs.readFileSync('src/components/pwr/station/StationAuthUI.tsx', 'utf8');

// Fix TypeScript error: add string type annotation
content = content.replace(
  'const getInitials = (name) => {',
  'const getInitials = (name: string) => {'
);

fs.writeFileSync('src/components/pwr/station/StationAuthUI.tsx', content);
console.log('Fixed TypeScript type error');
