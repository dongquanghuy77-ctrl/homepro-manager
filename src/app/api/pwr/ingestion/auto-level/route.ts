import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { pwrTasks, pwrTaskResources, pwrResources, pwrResourceCalendar, pwrTaskDependencies } from '@/db/schema';
import { eq, inArray, and, gte, like } from 'drizzle-orm';
import { getAuthSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const { batchId } = await req.json();
    if (!batchId) return NextResponse.json({ error: 'Missing batchId' }, { status: 400 });

    let message = '';
    
    await db.transaction(async (tx) => {
      const allExplodedTasks = await tx.select({
        id: pwrTasks.id,
        title: pwrTasks.title,
        status: pwrTasks.status,
        projectRef: pwrTasks.projectRef,
        projectId: pwrTasks.projectId,
        tags: pwrTasks.tags
      }).from(pwrTasks).where(
        and(
          eq(pwrTasks.source, 'SYSTEM_EXPLOSION'),
          inArray(pwrTasks.status, ['TODO', 'INBOX'])
        )
      );

      const batchTasks = allExplodedTasks.filter(t => t.tags && t.tags.includes(batchId));
      if (batchTasks.length === 0) {
        throw new Error('Không tìm thấy Task nào ở trạng thái TODO để San Phẳng.');
      }

      const taskIds = batchTasks.map(t => t.id);
      
      const resourcesRows = await tx.select().from(pwrTaskResources).where(inArray(pwrTaskResources.taskId, taskIds));
      
      const resourceLoad = new Map();
      for (const row of resourcesRows) {
        const hours = parseFloat(row.estimatedHours || '0');
        resourceLoad.set(row.resourceId, (resourceLoad.get(row.resourceId) || 0) + hours);
      }

      const machines = await tx.select().from(pwrResources);
      const machineMap = new Map(machines.map(m => [m.id, m]));
      
      const todayStr = new Date().toISOString().split('T')[0];
      const overrides = await tx.select().from(pwrResourceCalendar).where(gte(pwrResourceCalendar.dateStr, todayStr));

      await tx.delete(pwrTasks).where(inArray(pwrTasks.id, taskIds));

      let totalNewTasks = 0;
      
      for (const [resourceId, remainingHours] of resourceLoad.entries()) {
        if (remainingHours <= 0) continue;
        const machine = machineMap.get(resourceId);
        if (!machine) continue;
        
        let remH = remainingHours;
        let d = new Date();
        let partIndex = 1;
        
        const typeStr = machine.name.includes('CNC') ? 'CNC' : (machine.name.includes('Dán') ? 'DÁN CẠNH' : 'KHOAN CAM');
        const projRef = batchTasks[0].projectRef;
        const projId = batchTasks[0].projectId;
        
        while (remH > 0.01) {
          if (d.getDay() === 0) {
            d.setDate(d.getDate() + 1);
            continue;
          }
          
          const dateStr = d.toISOString().split('T')[0];
          const override = overrides.find(o => o.resourceId === resourceId && o.dateStr === dateStr);
          const maxH = override ? parseFloat(override.capacityHours || '0') : parseFloat(machine.capacityHoursPerDay || '8.0');
          
          if (maxH <= 0) {
             d.setDate(d.getDate() + 1);
             continue;
          }
          
          const hoursToPour = Math.min(maxH, remH);
          remH -= hoursToPour;
          
          let qty = 0;
          let unit = '';
          if (typeStr === 'CNC') { qty = Math.round(hoursToPour / 0.15); unit = 'Tấm'; }
          else if (typeStr === 'DÁN CẠNH') { qty = Math.round((hoursToPour / 0.1) * 10); unit = 'mét'; }
          else { qty = Math.round(hoursToPour / 0.0133); unit = 'mũi'; }
          
          const [newTask] = await tx.insert(pwrTasks).values({
            userId: session.id,
            title: `[${typeStr}] Xử lý ${qty} ${unit} - ${projRef} - AutoLevel P.${partIndex}`,
            description: `Hệ thống tự động San Phẳng (Rót Nước) vào ngày ${dateStr} với công suất ${hoursToPour.toFixed(2)}h`,
            category: 'PRODUCTION', priority: 'MEDIUM', status: 'TODO',
            projectRef: projRef, projectId: projId, taskType: 'PROJECT_TASK',
            tags: ['EXPLOSION', typeStr.replace(' ', '_'), batchId, 'AUTO_LEVELED'],
            source: 'SYSTEM_EXPLOSION', startDate: dateStr, dueDate: dateStr
          }).returning();
          
          await tx.insert(pwrTaskResources).values({
             taskId: newTask.id, resourceId: resourceId, estimatedHours: hoursToPour.toFixed(2), reservedDate: dateStr
          });
          
          partIndex++;
          totalNewTasks++;
          
          if (remH > 0.01) {
            d.setDate(d.getDate() + 1);
          }
        }
      }
      
      message = `San phẳng thành công. Đã tái phân bổ ${totalNewTasks} Task mới dựa trên Lịch máy hiện tại.`;
    });

    return NextResponse.json({ success: true, message });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
