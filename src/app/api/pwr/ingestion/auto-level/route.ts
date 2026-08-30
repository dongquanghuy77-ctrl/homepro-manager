import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { pwrTasks, pwrTaskResources, pwrResources, pwrResourceCalendar, pwrTaskDependencies, pwrMaterialTransactions, pwrWorkLogs, pwrTaskAuditLog } from '@/db/schema';
import { eq, inArray, and, gte, notInArray } from 'drizzle-orm';
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
      // ─── BƯỚC 1: Lấy TẤT CẢ tasks của batch (trừ DONE/CANCELLED) ──
      const allExplodedTasks = await tx.select({
        id: pwrTasks.id,
        status: pwrTasks.status,
        projectRef: pwrTasks.projectRef,
        projectId: pwrTasks.projectId,
        tags: pwrTasks.tags
      }).from(pwrTasks).where(
        and(
          eq(pwrTasks.source, 'SYSTEM_EXPLOSION'),
          notInArray(pwrTasks.status, ['DONE', 'CANCELLED'])
        )
      );

      const batchTag = batchId.startsWith('BATCH_') ? batchId : `BATCH_${batchId}`;
      const batchTasks = allExplodedTasks.filter(t =>
        t.tags && (t.tags.includes(batchId) || t.tags.includes(batchTag))
      );
      if (batchTasks.length === 0) {
        throw new Error('Không tìm thấy Task nào để San Phẳng. Kiểm tra lại tên Lô.');
      }

      const taskIds = batchTasks.map(t => t.id);
      const projRef = batchTasks[0].projectRef;
      const projId = batchTasks[0].projectId;
      
      // ─── BƯỚC 2: Lưu dữ liệu cần bảo toàn ──────────────────────────
      const oldTransactions = await tx.select().from(pwrMaterialTransactions)
        .where(inArray(pwrMaterialTransactions.taskId, taskIds));
      
      // Tổng hợp giờ theo máy TỪ DỮ LIỆU CŨ
      const resourcesRows = await tx.select().from(pwrTaskResources)
        .where(inArray(pwrTaskResources.taskId, taskIds));
      const resourceLoad = new Map<number, number>();
      for (const row of resourcesRows) {
        const hours = parseFloat(row.estimatedHours || '0');
        resourceLoad.set(row.resourceId, (resourceLoad.get(row.resourceId) || 0) + hours);
      }

      // Lấy thông tin máy
      const machines = await tx.select().from(pwrResources);
      const cncMachine = machines.find((m:any) => m.name.includes('CNC'));
      const edgeMachine = machines.find((m:any) => m.name.includes('Dán'));
      const drillMachine = machines.find((m:any) => m.name.includes('Khoan'));
      
      if (!cncMachine) throw new Error('Không tìm thấy máy CNC trong hệ thống.');
      
      // Tải overrides từ hôm nay trở đi
      const todayStr = new Date().toISOString().split('T')[0];
      const overrides = await tx.select().from(pwrResourceCalendar)
        .where(gte(pwrResourceCalendar.dateStr, todayStr));

      // ─── BƯỚC 3: XÓA THEO THỨ TỰ TRÁNH FK ──────────────────────────
      await tx.delete(pwrTaskAuditLog).where(inArray(pwrTaskAuditLog.taskId, taskIds));
      await tx.delete(pwrWorkLogs).where(inArray(pwrWorkLogs.taskId, taskIds));
      await tx.delete(pwrTaskDependencies).where(inArray(pwrTaskDependencies.taskId, taskIds));
      await tx.delete(pwrTaskDependencies).where(inArray(pwrTaskDependencies.dependsOnId, taskIds));
      await tx.delete(pwrTaskResources).where(inArray(pwrTaskResources.taskId, taskIds));
      await tx.delete(pwrTasks).where(inArray(pwrTasks.id, taskIds));

      let totalNewTasks = 0;

      // ─── BƯỚC 4: HELPERS ────────────────────────────────────────────
      const getDayCapacity = (machine: any, dateStr: string): number => {
        const override = overrides.find((o: any) => o.resourceId === machine.id && o.dateStr === dateStr);
        if (override) return parseFloat(override.capacityHours || '0');
        return parseFloat(machine.capacityHoursPerDay || '8.0');
      };

      // ─── BƯỚC 5: XÂY DỰNG CNC SCHEDULE (anchor) ─────────────────────
      type DaySlot = { dateStr: string; hours: number };
      const cncSchedule: DaySlot[] = [];
      {
        let remH = resourceLoad.get(cncMachine.id) || 0;
        const d = new Date();
        let safe = 0;
        while (remH > 0.01 && safe < 365) {
          safe++;
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

      // Tạo CNC tasks
      const cncTaskIds: number[] = [];
      for (let i = 0; i < cncSchedule.length; i++) {
        const slot = cncSchedule[i];
        const qty = Math.round(slot.hours / 0.15);
        const [t] = await tx.insert(pwrTasks).values({
          userId: session.id,
          title: `[CNC] Cắt ${qty} Tấm — ${projRef} — Ngày ${i + 1}`,
          description: `San Phẳng: CNC ${slot.hours.toFixed(1)}h vào ${slot.dateStr}`,
          category: 'PRODUCTION', priority: 'HIGH', status: 'TODO',
          projectRef: projRef, projectId: projId, taskType: 'PROJECT_TASK',
          tags: ['EXPLOSION', 'CNC', batchTag, 'AUTO_LEVELED'],
          source: 'SYSTEM_EXPLOSION', startDate: slot.dateStr, dueDate: slot.dateStr
        }).returning();
        await tx.insert(pwrTaskResources).values({
          taskId: t.id, resourceId: cncMachine.id,
          estimatedHours: slot.hours.toFixed(2), reservedDate: slot.dateStr
        });
        cncTaskIds.push(t.id);
        totalNewTasks++;
      }

      // Khôi phục vật tư
      if (cncTaskIds.length > 0 && oldTransactions.length > 0) {
        for (const trans of oldTransactions) {
          await tx.update(pwrMaterialTransactions)
            .set({ taskId: cncTaskIds[0] })
            .where(eq(pwrMaterialTransactions.id, trans.id));
        }
      }

      // ─── BƯỚC 6: HÀM SYNCHRONIZED POUR (Đã sửa công thức) ──────────
      // NGUYÊN TẮC: Mỗi ngày CNC làm → downstream cũng làm cùng ngày
      // GIỜ/NGÀY = totalHours / số_ngày_CNC (trải đều tuyệt đối)
      const pourSynced = async (
        machine: any,
        totalHours: number,
        typeStr: string,
        unitStr: string,
        divisor: number,
        hoursPerMeterFactor: number  // để tính qty đúng
      ): Promise<number[]> => {
        if (!machine || totalHours <= 0 || cncSchedule.length === 0) return [];
        
        const ids: number[] = [];
        // Giờ/ngày đều tuyệt đối — chia đều lên tất cả ngày CNC
        const hoursPerDay = totalHours / cncSchedule.length;
        let remH = totalHours;
        
        for (let i = 0; i < cncSchedule.length && remH > 0.001; i++) {
          const { dateStr } = cncSchedule[i];
          const maxH = getDayCapacity(machine, dateStr);
          
          // Capacity của máy này ngày đó = 0 → bỏ qua
          if (maxH <= 0) continue;
          
          // Đổ min(capacity_máy, giờ_đều/ngày, còn_lại)
          const actualH = Math.min(maxH, hoursPerDay, remH);
          if (actualH <= 0.001) continue;
          remH -= actualH;
          
          const qty = Math.round(actualH / divisor * hoursPerMeterFactor);
          const [newTask] = await tx.insert(pwrTasks).values({
            userId: session.id,
            title: `[${typeStr}] ${qty} ${unitStr} — ${projRef} — Ngày ${i + 1}`,
            description: `Synchronized với CNC: ${actualH.toFixed(2)}h vào ${dateStr}`,
            category: 'PRODUCTION', priority: 'MEDIUM',
            status: 'TODO',  // TODO thay vì WAITING để hiển thị trên Kanban
            projectRef: projRef, projectId: projId, taskType: 'PROJECT_TASK',
            tags: ['EXPLOSION', typeStr.replace(/ /g, '_'), batchTag, 'AUTO_LEVELED'],
            source: 'SYSTEM_EXPLOSION', startDate: dateStr, dueDate: dateStr
          }).returning();
          
          await tx.insert(pwrTaskResources).values({
            taskId: newTask.id, resourceId: machine.id,
            estimatedHours: actualH.toFixed(3), reservedDate: dateStr
          });
          
          ids.push(newTask.id);
          totalNewTasks++;
        }
        return ids;
      };

      // ─── BƯỚC 7: DÁN CẠNH ───────────────────────────────────────────
      const rawEdgeHours = edgeMachine ? (resourceLoad.get(edgeMachine.id) || 0) : 0;
      // Fallback: nếu thiếu dữ liệu, tính theo tỷ lệ từ CNC (51% từ dữ liệu lịch sử)
      const cncHours = resourceLoad.get(cncMachine.id) || 0;
      const edgeHours = rawEdgeHours > 0 ? rawEdgeHours : cncHours * 0.51;
      
      const edgeTaskIds = edgeMachine 
        ? await pourSynced(edgeMachine, edgeHours, 'DÁN CẠNH', 'mét', 0.01, 1)
        : [];

      // Dependency: Dán Cạnh[i] phụ thuộc CNC[i]
      for (let i = 0; i < edgeTaskIds.length; i++) {
        const depId = cncTaskIds[Math.min(i, cncTaskIds.length - 1)];
        if (depId) await tx.insert(pwrTaskDependencies).values({
          taskId: edgeTaskIds[i], dependsOnId: depId, depType: 'PRECONDITION', timeWindowDays: 0
        });
      }

      // ─── BƯỚC 8: KHOAN CAM ──────────────────────────────────────────
      const rawDrillHours = drillMachine ? (resourceLoad.get(drillMachine.id) || 0) : 0;
      // NGHIỆP VỤ XÁC NHẬN: CNC 8h → Khoan Cam 1h (tỷ lệ 12.5%)
      // Nếu không có dữ liệu gốc, tính lại từ CNC hours
      const drillHours = rawDrillHours > 0 ? rawDrillHours : cncHours * 0.125;
      
      const drillTaskIds = drillMachine
        ? await pourSynced(drillMachine, drillHours, 'KHOAN CAM', 'mũi', 0.0133, 1)
        : [];

      // Dependency: Khoan Cam[i] phụ thuộc Dán Cạnh[i] hoặc CNC[i]
      for (let i = 0; i < drillTaskIds.length; i++) {
        const depId = edgeTaskIds.length > 0
          ? edgeTaskIds[Math.min(i, edgeTaskIds.length - 1)]
          : cncTaskIds[Math.min(i, cncTaskIds.length - 1)];
        if (depId) await tx.insert(pwrTaskDependencies).values({
          taskId: drillTaskIds[i], dependsOnId: depId, depType: 'PRECONDITION', timeWindowDays: 0
        });
      }

      const cncTotal = (resourceLoad.get(cncMachine.id) || 0).toFixed(1);
      message = [
        'San phẳng thành công (Synchronized v3).',
        `CNC: ${cncTotal}h → ${cncTaskIds.length} ngày.`,
        edgeMachine ? `Dán Cạnh: ${edgeHours.toFixed(1)}h → ${edgeTaskIds.length} ngày.` : '',
        drillMachine ? `Khoan Cam: ${drillHours.toFixed(1)}h → ${drillTaskIds.length} ngày.` : '',
        `Tổng ${totalNewTasks} Task mới.`
      ].filter(Boolean).join(' ');
    });

    return NextResponse.json({ success: true, message });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
