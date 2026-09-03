const fs = require('fs');
let c = fs.readFileSync('src/components/pwr/station/MobileStationClient.tsx', 'utf8');

// Replace CNC card
c = c.replace(/<div style=\{\{ display: 'flex', alignItems: 'center', gap: 8 \}\}>\s*<Trophy.*?<\/span>\s*<\/div>/s, "");

// Replace Dán Cạnh card
c = c.replace(/<div style=\{\{ display: 'flex', alignItems: 'center', gap: 8 \}\}>\s*<Trophy.*?<\/span>\s*<\/div>/s, "");

// Replace Khoan Cam card
c = c.replace(/<div style=\{\{ display: 'flex', alignItems: 'center', gap: 8 \}\}>\s*<Trophy.*?<\/span>\s*<\/div>/s, "");

// Remove bottom stats grid
c = c.replace(/\{\/\* Bottom Stats Grid \*\/\}.*?<\/div>\s*<\/div>\s*<\/div>\s*<\/>\s*\)\s*:\s*activeTab === 'HOME'/s, "</div>\n            </>\n          ) : activeTab === 'HOME'");

fs.writeFileSync('src/components/pwr/station/MobileStationClient.tsx', c, 'utf8');
