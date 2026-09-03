const fs = require('fs');
let c = fs.readFileSync('src/app/api/pwr/dashboard/route.ts', 'utf8');

c = c.replace(/const stats = \{/, `const urgentTasks = activeTasks.filter(t => t.priority === 'CRITICAL');\n\n    const stats = {`);
c = c.replace(/workLogCountToday: todayLogs.filter\(l => !l.isSystemLog\).length,\n    \}\);/, `workLogCountToday: todayLogs.filter(l => !l.isSystemLog).length,\n      urgentTasks,\n    });`);

fs.writeFileSync('src/app/api/pwr/dashboard/route.ts', c, 'utf8');
