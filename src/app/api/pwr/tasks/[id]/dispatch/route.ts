import { NextResponse } from "next/server";
import { db } from "@/db";
import { pwrTasks, pwrTaskResources, pwrTaskAuditLog } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth, ALL_ROLES } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { session, error } = await requireAuth(req as any, ALL_ROLES);
    if (error) return error;

    const id = parseInt(params.id, 10);
    if (isNaN(id)) return NextResponse.json({ error: "ID không hợp lệ" }, { status: 400 });

    const body = await req.json();
    const { action, otHours, nextDate } = body;

    const [task] = await db.select().from(pwrTasks).where(eq(pwrTasks.id, id));
    if (!task) return NextResponse.json({ error: "Không tìm thấy công việc" }, { status: 404 });

    const resources = await db.select().from(pwrTaskResources).where(eq(pwrTaskResources.taskId, id));

    if (action === "RESCHEDULE") {
      if (!nextDate) return NextResponse.json({ error: "Thiếu nextDate" }, { status: 400 });
      await db.update(pwrTaskResources)
        .set({ reservedDate: nextDate })
        .where(eq(pwrTaskResources.taskId, id));
      
      // Log audit
      await db.insert(pwrTaskAuditLog).values({
        taskId: id,
        userId: session.id,
        action: 'FIELD_UPDATED',
        fieldName: 'reservedDate (San tải)',
        oldValue: resources[0]?.reservedDate || '',
        newValue: nextDate,
        reason: 'Dời lịch toàn bộ'
      });
      return NextResponse.json({ success: true, action: "RESCHEDULE", nextDate });
    }

    if (action === "OUTSOURCE") {
      await db.delete(pwrTaskResources).where(eq(pwrTaskResources.taskId, id));
      
      const newTags = [...(task.tags || []).filter(t => t !== 'THUE_NGOAI'), 'THUE_NGOAI'];
      await db.update(pwrTasks)
        .set({ tags: newTags, status: 'DONE' }) // Thuê ngoài coi như chốt khoán ngoài
        .where(eq(pwrTasks.id, id));
      
      await db.insert(pwrTaskAuditLog).values({
        taskId: id,
        userId: session.id,
        action: 'STATUS_CHANGED',
        fieldName: 'status',
        oldValue: task.status,
        newValue: 'DONE',
        reason: 'Chuyển sang thuê ngoài'
      });
      return NextResponse.json({ success: true, action: "OUTSOURCE" });
    }

    if (action === "OVERTIME_SPILL") {
      if (!otHours || !nextDate) return NextResponse.json({ error: "Thiếu otHours hoặc nextDate" }, { status: 400 });
      if (resources.length === 0) return NextResponse.json({ error: "Task không có tải trọng máy móc" }, { status: 400 });
      
      const resRecord = resources[0];
      const totalHours = parseFloat(resRecord.estimatedHours || "0");
      const limitHours = parseFloat(otHours);
      
      if (totalHours <= limitHours) {
         return NextResponse.json({ error: "Tổng giờ <= giờ tăng ca, không cần tràn số" }, { status: 400 });
      }
      
      const spillHours = (totalHours - limitHours).toFixed(2);
      
      await db.transaction(async (tx) => {
        // Cập nhật record hiện tại thành limitHours
        await tx.update(pwrTaskResources)
          .set({ estimatedHours: limitHours.toFixed(2) })
          .where(eq(pwrTaskResources.id, resRecord.id));
          
        // Tạo record mới cho phần tràn sang nextDate
        await tx.insert(pwrTaskResources).values({
          taskId: id,
          resourceId: resRecord.resourceId,
          estimatedHours: spillHours,
          reservedDate: nextDate
        });
      });
      
      await db.insert(pwrTaskAuditLog).values({
        taskId: id,
        userId: session.id,
        action: 'FIELD_UPDATED',
        fieldName: 'estimatedHours (Tăng ca tràn số)',
        oldValue: totalHours.toString(),
        newValue: `${limitHours} hôm nay, ${spillHours} ngày mai`,
        reason: 'Điều phối Tăng ca tràn số'
      });
      
      return NextResponse.json({ success: true, action: "OVERTIME_SPILL", limitHours, spillHours, nextDate });
    }

    return NextResponse.json({ error: "Action không hợp lệ" }, { status: 400 });

  } catch (err: any) {
    console.error("DISPATCH API ERR:", err);
    return NextResponse.json({ error: err.message || "Lỗi máy chủ" }, { status: 500 });
  }
}
