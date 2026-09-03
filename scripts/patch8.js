const fs = require('fs');
let content = fs.readFileSync('src/components/pwr/station/StationAuthUI.tsx', 'utf8');

// Replace all instances of /pwr/station/dashboard with /pwr/station
content = content.replace(/\/pwr\/station\/dashboard/g, '/pwr/station');

fs.writeFileSync('src/components/pwr/station/StationAuthUI.tsx', content);
console.log('Fixed router.push to /pwr/station');
