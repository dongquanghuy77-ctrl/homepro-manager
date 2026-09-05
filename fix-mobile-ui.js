const fs = require('fs');
let mobileUI = fs.readFileSync('src/components/pwr/station/MobileStationClient.tsx', 'utf8');
mobileUI = mobileUI.replace(
  /<HomeTabUI userName=\{[^\}]+\} \/>/,
  `<HomeTabUI userName={usePwrStore.getState().userName || 'Thợ Xưởng'} station={userStationRole} />`
);
fs.writeFileSync('src/components/pwr/station/MobileStationClient.tsx', mobileUI, 'utf8');
