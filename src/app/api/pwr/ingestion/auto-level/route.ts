import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { pwrTasks, pwrTaskResources, pwrResources, pwrResourceCalendar, pwrTaskDependencies, pwrMaterialTransactions } from '@/db/schema';
import { eq, inArray, and, gte } from 'drizzle-orm';
import { requireAuth, ALL_ROLES } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAuth(req as any, ALL_ROLES);
    if (authResult.error) return authResult.error;
    const { session } = authResult;
    
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
          inArray(pwrTasks.status, ['TODO', 'INBOX', 'WAITING', 'IN_PROGRESS'])
        )
      );

      const batchTag = batchId.startsWith('BATCH_') ? batchId : `BATCH_${batchId}`;
      const batchTasks = allExplodedTasks.filter(t => t.tags && (t.tags.includes(batchId) || t.tags.includes(batchTag)));
      if (batchTasks.length === 0) {
        throw new Error('Không tìm thấy Task nào ở trạng thái TODO để San Phẳng.');
      }

      const taskIds = batchTasks.map(t => t.id);
      const projRef = batchTasks[0].projectRef;
      const projId = batchTasks[0].projectId;
      
      // BẢO TOÀN DỮ LIỆU: Lấy lại các giao dịch vật tư đã link với các task cũ
      const oldTransactions = await tx.select().from(pwrMaterialTransactions).where(inArray(pwrMaterialTransactions.taskId, taskIds));
      
      const resourcesRows = await tx.select().from(pwrTaskResources).where(inArray(pwrTaskResources.taskId, taskIds));
      const resourceLoad = new Map();
      for (const row of resourcesRows) {
        const hours = parseFloat(row.estimatedHours || '0');
        resourceLoad.set(row.resourceId, (resourceLoad.get(row.resourceId) || 0) + hours);
      }

      const machines = await tx.select().from(pwrResources);
      const machineMap = new Map(machines.map(m => [m.id, m]));
      const cncMachine = machines.find((m:any) => m.name.includes('CNC'));
      const edgeMachine = machines.find((m:any) => m.name.includes('Dán'));
      const drillMachine = machines.find((m:any) => m.name.includes('Khoan'));
      
      const todayStr = new Date().toISOString().split('T')[0];
      const overrides = await tx.select().from(pwrResourceCalendar).where(gte(pwrResourceCalendar.dateStr, todayStr));

      // XÓA TASK CŨ
      await tx.delete(pwrTasks).where(inArray(pwrTasks.id, taskIds));

      let totalNewTasks = 0;

      // HÀM RÓT NƯỚC (POUR) CHUẨN
      const pourHours = async (machine: any, totalHours: number, typeStr: string, unitStr: string, divisor: number) => {
        if (!machine || totalHours <= 0) return [];
        let remH = totalHours;
        let d = new Date();
        let partIndex = 1;
        const generatedTasks = [];

        while (remH > 0.01) {
          if (d.getDay() === 0) {
            d.setDate(d.getDate() + 1);
            continue;
          }
          
          const dateStr = d.toISOString().split('T')[0];
          const override = overrides.find(o => o.resourceId === machine.id && o.dateStr === dateStr);
          const maxH = override ? parseFloat(override.capacityHours || '0') : parseFloat(machine.capacityHoursPerDay || '8.0');
          
          if (maxH <= 0) {
             d.setDate(d.getDate() + 1);
             continue;
          }
          
          const hoursToPour = Math.min(maxH, remH);
          remH -= hoursToPour;
          
          let qty = Math.round(hoursToPour / divisor);
          if (typeStr === 'DÁN CẠNH') qty = Math.round((hoursToPour / divisor) * 10);
          
          const [newTask] = await tx.insert(pwrTasks).values({
            userId: session.id,
            title: `[${typeStr}] Xử lý ${qty} ${unitStr} - ${projRef} - AutoLevel P.${partIndex}`,
            description: `Hệ thống tự động San Phẳng (Rót Nước) vào ngày ${dateStr} với công suất ${hoursToPour.toFixed(2)}h`,
            category: 'PRODUCTION', priority: 'MEDIUM', status: 'TODO',
            projectRef: projRef, projectId: projId, taskType: 'PROJECT_TASK',
            tags: ['EXPLOSION', typeStr.replace(' ', '_'), batchTag, 'AUTO_LEVELED'],
            source: 'SYSTEM_EXPLOSION', startDate: dateStr, dueDate: dateStr
          }).returning();
          
          await tx.insert(pwrTaskResources).values({
             taskId: newTask.id, resourceId: machine.id, estimatedHours: hoursToPour.toFixed(2), reservedDate: dateStr
          });
          
          generatedTasks.push(newTask.id);
          partIndex++;
          totalNewTasks++;
          
          if (remH > 0.01) {
            d.setDate(d.getDate() + 1);
          }
        }
        return generatedTasks;
      };

      // RÓT CNC
      const cncHours = cncMachine ? (resourceLoad.get(cncMachine.id) || 0) : 0;
      const cncTaskIds = await pourHours(cncMachine, cncHours, 'CNC', 'Tấm', 0.15);

      // KHÔI PHỤC LIÊN KẾT VẬT TƯ (BẢO TOÀN DỮ LIỆU)
      if (cncTaskIds.length > 0 && oldTransactions.length > 0) {
         for (const trans of oldTransactions) {
            await tx.update(pwrMaterialTransactions).set({ taskId: cncTaskIds[0] }).where(eq(pwrMaterialTransactions.id, trans.id));
         }
      }

      // RÓT DÁN CẠNH
      const edgeHours = edgeMachine ? (resourceLoad.get(edgeMachine.id) || 0) : 0;
      const edgeTaskIds = await pourHours(edgeMachine, edgeHours, 'DÁN CẠNH', 'mét', 0.1);
      
      // MÓC XÍCH DEPENDENCY DÁN CẠNH -> CNC
      for (let i = 0; i < edgeTaskIds.length; i++) {
         const depId = cncTaskIds[Math.min(i, cncTaskIds.length - 1)];
         if (depId) {
            await tx.insert(pwrTaskDependencies).values({
               taskId: edgeTaskIds[i], dependsOnId: depId, depType: 'PRECONDITION', timeWindowDays: 0
            });
         }
      }

      // RÓT KHOAN CAM
      const drillHours = drillMachine ? (resourceLoad.get(drillMachine.id) || 0) : 0;
      const drillTaskIds = await pourHours(drillMachine, drillHours, 'KHOAN CAM', 'mũi', 0.0133);

      // MÓC XÍCH DEPENDENCY KHOAN CAM -> DÁN CẠNH (hoặc CNC)
      for (let i = 0; i < drillTaskIds.length; i++) {
         let depId = null;
         if (edgeTaskIds.length > 0) {
            depId = edgeTaskIds[Math.min(i, edgeTaskIds.length - 1)];
         } else if (cncTaskIds.length > 0) {
            depId = cncTaskIds[Math.min(i, cncTaskIds.length - 1)];
         }
         
         if (depId) {
            await tx.insert(pwrTaskDependencies).values({
               taskId: drillTaskIds[i], dependsOnId: depId, depType: 'PRECONDITION', timeWindowDays: 0
            });
         }
      }
      
      message = `San phẳng thành công. Đã tái phân bổ ${totalNewTasks} Task mới dựa trên Lịch máy hiện tại, bảo toàn Dependency & Vật tư.`;
    });

    return NextResponse.json({ success: true, message });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
