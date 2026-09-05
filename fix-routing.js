const fs = require('fs');

// 1. Fix api/pwr/tasks/route.ts
let tasksApi = fs.readFileSync('src/app/api/pwr/tasks/route.ts', 'utf8');
tasksApi = tasksApi.replace(
  /const conditions: any\[\] = \[\s*eq\(pwrTasks\.userId, session\.id\),\s*isNull\(pwrTasks\.deletedAt\),\s*\];/,
  `const conditions: any[] = [ isNull(pwrTasks.deletedAt) ];
    if (stationDispatch !== 'true') {
      conditions.push(eq(pwrTasks.userId, session.id));
    }`
);
// Fix stats query in tasks/route.ts to also respect stationDispatch
tasksApi = tasksApi.replace(
  /const allNonDeleted = await db\s*\.select\(\)\s*\.from\(pwrTasks\)\s*\.where\(and\(eq\(pwrTasks\.userId, session\.id\), isNull\(pwrTasks\.deletedAt\)\)\);/,
  `const allNonDeleted = await db.select().from(pwrTasks).where(
      stationDispatch === 'true' 
        ? isNull(pwrTasks.deletedAt) 
        : and(eq(pwrTasks.userId, session.id), isNull(pwrTasks.deletedAt))
    );`
);
fs.writeFileSync('src/app/api/pwr/tasks/route.ts', tasksApi, 'utf8');

// 2. Fix api/pwr/dashboard/route.ts
let dashboardApi = fs.readFileSync('src/app/api/pwr/dashboard/route.ts', 'utf8');
dashboardApi = dashboardApi.replace(
  /const allTasks = await db\.select\(\)\.from\(pwrTasks\)\s*\.where\(and\(eq\(pwrTasks\.userId, session\.id\), isNull\(pwrTasks\.deletedAt\)\)\);/,
  `const { searchParams } = new URL(request.url);
    const station = searchParams.get('station');

    // Routing Logic: Thợ (Kiosk) thấy task của Trạm (category) HOẶC Rework của cá nhân (userId + CRITICAL)
    const baseCondition = station 
      ? or(eq(pwrTasks.category, station), and(eq(pwrTasks.userId, session.id), eq(pwrTasks.priority, 'CRITICAL')))
      : eq(pwrTasks.userId, session.id);

    const allTasks = await db.select().from(pwrTasks)
      .where(and(baseCondition, isNull(pwrTasks.deletedAt)));`
);
// Also need to import 'or' in dashboardApi if it's missing (it's not missing? let's check)
if (!dashboardApi.includes("import { eq, and, isNull, gte, lte, or }")) {
  dashboardApi = dashboardApi.replace(/import { eq, and, isNull, gte, lte }/, "import { eq, and, isNull, gte, lte, or }");
}
fs.writeFileSync('src/app/api/pwr/dashboard/route.ts', dashboardApi, 'utf8');

// 3. Fix HomeTabUI.tsx
let homeUI = fs.readFileSync('src/components/pwr/station/HomeTabUI.tsx', 'utf8');
homeUI = homeUI.replace(
  /export function HomeTabUI\(\{ userName \}: \{ userName: string \}\) \{/,
  `export function HomeTabUI({ userName, station }: { userName: string, station?: string }) {`
);
homeUI = homeUI.replace(
  /fetch\("\/api\/pwr\/dashboard"\)/,
  `fetch(\`/api/pwr/dashboard\${station ? '?station=' + station : ''}\`)`
);
fs.writeFileSync('src/components/pwr/station/HomeTabUI.tsx', homeUI, 'utf8');

// 4. Fix MobileStationClient.tsx
let mobileUI = fs.readFileSync('src/components/pwr/station/MobileStationClient.tsx', 'utf8');
mobileUI = mobileUI.replace(
  /<HomeTabUI userName=\{session\?\.user\?\.name \|\| 'Th? X?ng'\} \/>/,
  `<HomeTabUI userName={session?.user?.name || 'Th? X?ng'} station={userStationRole} />`
);
fs.writeFileSync('src/components/pwr/station/MobileStationClient.tsx', mobileUI, 'utf8');
