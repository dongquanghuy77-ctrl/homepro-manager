const fs = require('fs');
let dashboardApi = fs.readFileSync('src/app/api/pwr/dashboard/route.ts', 'utf8');
dashboardApi = dashboardApi.replace(
  /eq\(pwrTasks\.category, station\)/,
  `eq(pwrTasks.stationTeam, station)`
);
fs.writeFileSync('src/app/api/pwr/dashboard/route.ts', dashboardApi, 'utf8');
