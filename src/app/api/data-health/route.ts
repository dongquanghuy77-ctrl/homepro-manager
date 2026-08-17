import { NextResponse } from 'next/server';
import { db } from '@/db';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const totalModules = 12;

    const missingUsersResult = await db.execute(sql`SELECT count(*) FROM users WHERE department IS NULL OR department = ''`);
    const missingDataVal = Number(missingUsersResult.rows[0].count);

    const orphanTasksResult = await db.execute(sql`SELECT count(*) FROM tasks WHERE project_id IS NULL OR project_id NOT IN (SELECT id FROM projects)`);
    const orphanVal = Number(orphanTasksResult.rows[0].count);

    const brokenLinksResult = await db.execute(sql`SELECT count(*) FROM purchase_order_items WHERE material_id IS NOT NULL AND material_id NOT IN (SELECT id FROM materials)`);
    const brokenLinksVal = Number(brokenLinksResult.rows[0].count);

    const dupMaterials = await db.execute(sql`SELECT count(*) FROM (SELECT code FROM materials GROUP BY code HAVING count(*) > 1) as dup`);
    const duplicatesVal = Number(dupMaterials.rows[0].count);
    
    const apiErrorsVal = 0;

    const totalIssues = missingDataVal + orphanVal + brokenLinksVal + duplicatesVal + apiErrorsVal;
    
    const data = {
      summary: {
        totalModules,
        healthyScore: totalIssues === 0 ? 100 : Math.max(0, 100 - totalIssues * 2),
        totalIssues
      },
      issues: [
        { id: 1, type: 'Missing Data', description: 'Users without department assigned', count: missingDataVal, table: 'users', actionLink: '/admin/users' },
        { id: 2, type: 'Orphans', description: 'Tasks without valid project linked', count: orphanVal, table: 'tasks', actionLink: '/projects' },
        { id: 3, type: 'Broken Links', description: 'Purchase order items with deleted materials', count: brokenLinksVal, table: 'purchase_order_items', actionLink: '/purchasing/orders' },
        { id: 4, type: 'Duplicates', description: 'Duplicate material codes found', count: duplicatesVal, table: 'materials', actionLink: '/inventory' },
      ]
    };
    
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: String(error?.message || error) || 'Internal Server Error' }, { status: 500 });
  }
}
