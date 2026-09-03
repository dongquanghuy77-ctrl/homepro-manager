const fs = require('fs');
let c = fs.readFileSync('src/app/api/pwr/manager/route.ts', 'utf8');

c = c.replace(/export async function GET\(req: NextRequest\) \{/g, "import { pwrScrapRequests } from '@/db/schema';\n\nexport async function GET(req: NextRequest) {");

const replaceStr = `    return NextResponse.json({
      stationStats: stationStats.rows || stationStats,`;
const newStr = `    const scrapRequests = await db
      .select({
        id: pwrScrapRequests.id,
        taskId: pwrScrapRequests.taskId,
        itemsRequested: pwrScrapRequests.itemsRequested,
        reason: pwrScrapRequests.reason,
        status: pwrScrapRequests.status,
        createdAt: pwrScrapRequests.createdAt,
      })
      .from(pwrScrapRequests)
      .where(eq(pwrScrapRequests.status, 'PENDING'));

    return NextResponse.json({
      scrapRequests,
      stationStats: stationStats.rows || stationStats,`;

c = c.replace(replaceStr, newStr);
fs.writeFileSync('src/app/api/pwr/manager/route.ts', c, 'utf8');
