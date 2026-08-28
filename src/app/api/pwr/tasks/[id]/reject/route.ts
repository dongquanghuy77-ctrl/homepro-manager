import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { pwrTasks, pwrWorkLogs, pwrTaskDependencies } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const currentTaskId = parseInt(params.id);
    const { predecessorId, rejectQuantity, reason } = await req.json();
    const userId = 1; // Giả lập User ID của thợ Dán Cạnh

    // 1. Lấy thông tin task bị trả về (Ví dụ: CNC)
    const [guiltyTask] = await db.select().from(pwrTasks).where(eq(pwrTasks.id, predecessorId));
    if (!guiltyTask) throw new Error("Không tìm thấy công đoạn trước đó để trả về.");

    // 2. Lấy thông tin task hiện tại (Ví dụ: Dán Cạnh)
    const [currentTask] = await db.select().from(pwrTasks).where(eq(pwrTasks.id, currentTaskId));

    // 3. Khởi tạo một Task [REWORK] mới dành cho tổ mắc lỗi
    const [reworkTask] = await db.insert(pwrTasks).values({
      userId: guiltyTask.userId, // Giao lại cho người đã làm sai
      title: `[REWORK - LÀM LẠI] ${guiltyTask.title.replace('[CNC] ', '')}`,
      description: `BỊ TỪ CHỐI TỪ TỔ SAU.\nSố lượng lỗi: ${rejectQuantity}\nLý do: ${reason}\nYêu cầu khắc phục ngay lập tức!`,
      category: guiltyTask.category,
      priority: 'CRITICAL',
      status: 'TODO',
      projectRef: guiltyTask.projectRef,
      tags: ['REWORK', 'PENALTY'],
      source: 'SYSTEM_REJECT'
    }).returning();

    // 4. Ghi Sẹo (Vết nhơ KPI) vào Task gốc của người làm sai
    await db.insert(pwrWorkLogs).values({
      taskId: guiltyTask.id,
      userId,
      logType: 'ISSUE_LOG',
      content: `[BỊ TỪ CHỐI TỪ CÔNG ĐOẠN SAU] Tổ sau đã trả lại ${rejectQuantity} sản phẩm. Lý do: ${reason}. Đã sinh mã Rework: ${reworkTask.id}`,
      issue: 'QUALITY_REJECT'
    });

    // 5. Khóa Task hiện tại (Dán Cạnh) lại, bắt buộc chờ Task Rework xong mới được đi tiếp
    await db.insert(pwrTaskDependencies).values({
      taskId: currentTask.id,
      dependsOnId: reworkTask.id,
      depType: 'BLOCKED_BY', // Khóa cứng luôn
      timeWindowDays: 0
    });

    // 6. Chuyển Task hiện tại (Dán Cạnh) về trạng thái WAITING
    await db.update(pwrTasks).set({ status: 'WAITING', waitingFor: `Chờ khắc phục lỗi (Task #${reworkTask.id})` }).where(eq(pwrTasks.id, currentTaskId));

    return NextResponse.json({ success: true, reworkTaskId: reworkTask.id, message: 'Đã đá bóng ngược thành công! Kẻ làm sai đã nhận án phạt.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
