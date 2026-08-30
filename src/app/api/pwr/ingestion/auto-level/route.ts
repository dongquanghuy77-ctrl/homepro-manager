import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { pwrTasks, pwrTaskResources, pwrResources, pwrResourceCalendar, pwrTaskDependencies, pwrMaterialTransactions, pwrWorkLogs, pwrTaskAuditLog } from '@/db/schema';
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
      // ─── BƯỚC 1: Lấy tất cả tasks của batch ────────────────────────
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
      
      // BẢO TOÀN DỮ LIỆU: Lấy các giao dịch vật tư đã link với tasks cũ
      const oldTransactions = await tx.select().from(pwrMaterialTransactions)
        .where(inArray(pwrMaterialTransactions.taskId, taskIds));
      
      // Tổng hợp giờ theo máy
      const resourcesRows = await tx.select().from(pwrTaskResources)
        .where(inArray(pwrTaskResources.taskId, taskIds));
      const resourceLoad = new Map<number, number>();
      for (const row of resourcesRows) {
        const hours = parseFloat(row.estimatedHours || '0');
        resourceLoad.set(row.resourceId, (resourceLoad.get(row.resourceId) || 0) + hours);
      }

      const machines = await tx.select().from(pwrResources);
      const cncMachine = machines.find((m:any) => m.name.includes('CNC'));
      const edgeMachine = machines.find((m:any) => m.name.includes('Dán'));
      const drillMachine = machines.find((m:any) => m.name.includes('Khoan'));
      
      const todayStr = new Date().toISOString().split('T')[0];
      const overrides = await tx.select().from(pwrResourceCalendar)
        .where(gte(pwrResourceCalendar.dateStr, todayStr));

      // ─── BƯỚC 2: XÓA THEO THỨ TỰ TRÁNH FK CONSTRAINT ──────────────
      await tx.delete(pwrTaskAuditLog).where(inArray(pwrTaskAuditLog.taskId, taskIds));
      await tx.delete(pwrWorkLogs).where(inArray(pwrWorkLogs.taskId, taskIds));
      await tx.delete(pwrTaskDependencies).where(inArray(pwrTaskDependencies.taskId, taskIds));
      await tx.delete(pwrTaskDependencies).where(inArray(pwrTaskDependencies.dependsOnId, taskIds));
      await tx.delete(pwrTaskResources).where(inArray(pwrTaskResources.taskId, taskIds));
      await tx.delete(pwrTasks).where(inArray(pwrTasks.id, taskIds));

      let totalNewTasks = 0;

      // ─── BƯỚC 3: HÀM HELPER ────────────────────────────────────────

      // Lấy capacity của 1 ngày cho 1 máy (tính override)
      const getDayCapacity = (machine: any, dateStr: string): number => {
        const override = overrides.find(o => o.resourceId === machine.id && o.dateStr === dateStr);
        return override ? parseFloat(override.capacityHours || '0') : parseFloat(machine.capacityHoursPerDay || '8.0');
      };

      // Tạo lịch ngày làm việc (bỏ Chủ nhật)
      const getWorkingDays = (fromDate: Date, numDays: number): string[] => {
        const days: string[] = [];
        const d = new Date(fromDate);
        let count = 0;
        while (count < numDays + 30) { // buffer để tìm đủ ngày
          if (d.getDay() !== 0) { // bỏ CN
            days.push(d.toISOString().split('T')[0]);
          }
          d.setDate(d.getDate() + 1);
          count++;
          if (days.length >= numDays) break;
        }
        return days;
      };

      // ─── BƯỚC 4: TÍNH LỊCH CNC (anchor schedule) ──────────────────
      // CNC là trụ cột — các tổ khác PHẢI bám theo ngày của CNC
      
      type DaySlot = { dateStr: string; hours: number };
      const cncSchedule: DaySlot[] = []; // danh sách ngày CNC có việc + giờ/ngày

      if (cncMachine) {
        let remH = resourceLoad.get(cncMachine.id) || 0;
        const d = new Date();
        let safeCount = 0;
        while (remH > 0.01 && safeCount < 365) {
          safeCount++;
          if (d.getDay() === 0) { d.setDate(d.getDate() + 1); continue; }
          const dateStr = d.toISOString().split('T')[0];
          const maxH = getDayCapacity(cncMachine, dateStr);
          if (maxH <= 0) { d.setDate(d.getDate() + 1); continue; }
          const pour = Math.min(maxH, remH);
          remH -= pour;
          cncSchedule.push({ dateStr, hours: pour });
          d.setDate(d.getDate() + 1);
        }
      }

      // Tạo tasks CNC từ schedule
      const cncTaskIds: number[] = [];
      for (let i = 0; i < cncSchedule.length; i++) {
        const slot = cncSchedule[i];
        const qty = Math.round(slot.hours / 0.15);
        const [newTask] = await tx.insert(pwrTasks).values({
          userId: session.id,
          title: `[CNC] Cắt ${qty} Tấm - ${projRef} - AutoLevel P.${i+1}`,
          description: `San Phẳng: CNC chạy ${slot.hours.toFixed(1)}h vào ngày ${slot.dateStr}`,
          category: 'PRODUCTION', priority: 'HIGH', status: 'TODO',
          projectRef: projRef, projectId: projId, taskType: 'PROJECT_TASK',
          tags: ['EXPLOSION', 'CNC', batchTag, 'AUTO_LEVELED'],
          source: 'SYSTEM_EXPLOSION', startDate: slot.dateStr, dueDate: slot.dateStr
        }).returning();
        await tx.insert(pwrTaskResources).values({
          taskId: newTask.id, resourceId: cncMachine!.id,
          estimatedHours: slot.hours.toFixed(2), reservedDate: slot.dateStr
        });
        cncTaskIds.push(newTask.id);
        totalNewTasks++;
      }

      // Khôi phục liên kết vật tư vào CNC task 1
      if (cncTaskIds.length > 0 && oldTransactions.length > 0) {
        for (const trans of oldTransactions) {
          await tx.update(pwrMaterialTransactions)
            .set({ taskId: cncTaskIds[0] })
            .where(eq(pwrMaterialTransactions.id, trans.id));
        }
      }

      // ─── BƯỚC 5: HÀM "SYNCHRONIZED POUR" ──────────────────────────
      // Phân bổ totalHours chỉ vào các ngày CNC có việc
      // Tổ sau KHÔNG được có ngày ngoài lịch CNC
      
      const pourSynced = async (
        machine: any,
        totalHours: number,
        typeStr: string,
        unitStr: string,
        divisor: number,
        cncDays: DaySlot[]
      ): Promise<number[]> => {
        if (!machine || totalHours <= 0 || cncDays.length === 0) return [];
        
        const generatedIds: number[] = [];
        let remH = totalHours;
        
        for (let i = 0; i < cncDays.length && remH > 0.01; i++) {
          const { dateStr } = cncDays[i];
          const maxH = getDayCapacity(machine, dateStr);
          if (maxH <= 0) continue;
          
          // Phân bổ đều: giờ còn lại / số ngày còn lại
          const remainingDays = cncDays.length - i;
          const targetH = Math.min(maxH, remH / remainingDays, remH);
          const hoursToPour = Math.min(maxH, Math.max(targetH, remH > maxH ? maxH : remH));
          const actualH = Math.min(maxH, Math.min(hoursToPour, remH));
          
          if (actualH <= 0) continue;
          remH -= actualH;

          let qty = Math.round(actualH / divisor);
          if (typeStr === 'DÁN CẠNH') qty = Math.round((actualH / divisor) * 10);

          const partIndex = i + 1;
          const [newTask] = await tx.insert(pwrTasks).values({
            userId: session.id,
            title: `[${typeStr}] Xử lý ${qty} ${unitStr} - ${projRef} - AutoLevel P.${partIndex}`,
            description: `Synchronized với CNC: ${actualH.toFixed(2)}h vào ngày ${dateStr}`,
            category: 'PRODUCTION', priority: 'MEDIUM', status: 'WAITING',
            waitingFor: 'Đợi sản phẩm từ công đoạn trước',
            projectRef: projRef, projectId: projId, taskType: 'PROJECT_TASK',
            tags: ['EXPLOSION', typeStr.replace(/ /g, '_'), batchTag, 'AUTO_LEVELED'],
            source: 'SYSTEM_EXPLOSION', startDate: dateStr, dueDate: dateStr
          }).returning();
          
          await tx.insert(pwrTaskResources).values({
            taskId: newTask.id, resourceId: machine.id,
            estimatedHours: actualH.toFixed(2), reservedDate: dateStr
          });
          
          generatedIds.push(newTask.id);
          totalNewTasks++;
        }
        
        return generatedIds;
      };

      // ─── BƯỚC 6: RÓT DÁN CẠNH SYNCHRONIZED VỚI CNC ────────────────
      const edgeHours = edgeMachine ? (resourceLoad.get(edgeMachine.id) || 0) : 0;
      const edgeTaskIds = await pourSynced(edgeMachine, edgeHours, 'DÁN CẠNH', 'mét', 0.1, cncSchedule);
      
      // Dependency: Dán Cạnh ngày i → CNC ngày i
      for (let i = 0; i < edgeTaskIds.length; i++) {
        const depId = cncTaskIds[Math.min(i, cncTaskIds.length - 1)];
        if (depId) {
          await tx.insert(pwrTaskDependencies).values({
            taskId: edgeTaskIds[i], dependsOnId: depId, depType: 'PRECONDITION', timeWindowDays: 0
          });
        }
      }

      // ─── BƯỚC 7: RÓT KHOAN CAM SYNCHRONIZED VỚI CNC ───────────────
      const drillHours = drillMachine ? (resourceLoad.get(drillMachine.id) || 0) : 0;
      const drillTaskIds = await pourSynced(drillMachine, drillHours, 'KHOAN CAM', 'mũi', 0.0133, cncSchedule);
      
      // Dependency: Khoan Cam ngày i → Dán Cạnh ngày i (hoặc CNC nếu không có Dán Cạnh)
      for (let i = 0; i < drillTaskIds.length; i++) {
        const depId = edgeTaskIds.length > 0
          ? edgeTaskIds[Math.min(i, edgeTaskIds.length - 1)]
          : cncTaskIds[Math.min(i, cncTaskIds.length - 1)];
        if (depId) {
          await tx.insert(pwrTaskDependencies).values({
            taskId: drillTaskIds[i], dependsOnId: depId, depType: 'PRECONDITION', timeWindowDays: 0
          });
        }
      }
      
      message = `San phẳng thành công (Synchronized). Đã tạo ${totalNewTasks} Task mới — CNC: ${cncTaskIds.length} ngày, Dán Cạnh: ${edgeTaskIds.length} ngày, Khoan Cam: ${drillTaskIds.length} ngày.`;
    });

    return NextResponse.json({ success: true, message });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
