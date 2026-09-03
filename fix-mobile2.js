const fs = require('fs');
let c = fs.readFileSync('src/components/pwr/station/MobileStationClient.tsx', 'utf8');

c = c.replace(/<HomeTabUI userName=\{session\?\.user\?\.name \|\| 'Thợ'\} \/>/g, "<HomeTabUI userName={usePwrStore.getState().userName || 'Thợ'} />");

fs.writeFileSync('src/components/pwr/station/MobileStationClient.tsx', c, 'utf8');
