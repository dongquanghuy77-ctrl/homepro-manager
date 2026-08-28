import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { pwrResources, pwrTaskResources, pwrTasks } from '@/db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { addDays, format } from 'date-fns';

export async function GET(req: NextRequest) {
  try {
    const today = new Date();
    const startDate = format(today, 'yyyy-MM-dd');
    const endDate = format(addDays(today, 6), 'yyyy-MM-dd'); // 7 ngày

    // 1. Lấy danh sách máy móc
    let resources = await db.select().from(pwrResources);
    
    // Auto-seed nếu chưa có máy nào
    if (resources.length === 0) {
      const inserted = await db.insert(pwrResources).values([
        { userId: 1, name: 'Tổ CNC (Máy 1)', resourceType: 'MACHINE', capacityHoursPerDay: '8.0' },
        { userId: 1, name: 'Tổ Dán Cạnh', resourceType: 'MACHINE', capacityHoursPerDay: '8.0' },
        { userId: 1, name: 'Tổ Khoan Cam', resourceType: 'MACHINE', capacityHoursPerDay: '8.0' }
      ]).returning();
      resources = inserted;
    }

    // 2. Lấy tải trọng (TaskResources) trong 7 ngày
    const loads = await db.select({
      taskId: pwrTaskResources.taskId,
      resourceId: pwrTaskResources.resourceId,
      estimatedHours: pwrTaskResources.estimatedHours,
      reservedDate: pwrTaskResources.reservedDate,
      taskTitle: pwrTasks.title,
      taskStatus: pwrTasks.status,
      projectRef: pwrTasks.projectRef
    })
    .from(pwrTaskResources)
    .innerJoin(pwrTasks, eq(pwrTaskResources.taskId, pwrTasks.id))
    .where(
      and(
        gte(pwrTaskResources.reservedDate, startDate),
        lte(pwrTaskResources.reservedDate, endDate)
      )
    );

    // 3. Build Ma trận Heatmap
    const matrix = resources.map(res => {
      const dates = Array.from({length: 7}).map((_, i) => {
        const dateStr = format(addDays(today, i), 'yyyy-MM-dd');
        const tasksOnDate = loads.filter(l => l.resourceId === res.id && l.reservedDate === dateStr);
        const totalHours = tasksOnDate.reduce((sum, task) => sum + parseFloat(task.estimatedHours || '0'), 0);
        const maxCapacity = parseFloat(res.capacityHoursPerDay || '8.0');
        const loadPercentage = (totalHours / maxCapacity) * 100;
        
        let status = 'SAFE';
        if (loadPercentage > 100) status = 'OVERLOAD';
        else if (loadPercentage >= 80) status = 'WARNING';
        else if (loadPercentage === 0) status = 'EMPTY';

        return {
          dateStr,
          totalHours,
          maxCapacity,
          loadPercentage,
          status,
          tasks: tasksOnDate
        };
      });

      return {
        resource: res,
        schedule: dates
      };
    });

    return NextResponse.json({ matrix, dates: Array.from({length: 7}).map((_, i) => format(addDays(today, i), 'yyyy-MM-dd')) });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
