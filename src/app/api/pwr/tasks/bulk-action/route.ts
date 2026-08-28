import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { pwrTasks } from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const { taskIds, action } = await req.json();
    
    if (!taskIds || taskIds.length === 0) {
      return NextResponse.json({ error: 'Chưa chọn Task nào' }, { status: 400 });
    }

    if (action === 'ARCHIVE') {
      // Lưu kho: Chuyển sang CANCELLED với lý do
      for (const id of taskIds) {
        await db.update(pwrTasks)
          .set({ status: 'CANCELLED', cancelReason: 'Dọn dẹp Kanban - Lưu kho bởi Quản lý', deletedAt: new Date() })
          .where(eq(pwrTasks.id, id));
      }
      return NextResponse.json({ success: true, message: `Đã lưu kho ${taskIds.length} Task` });
    }

    if (action === 'DELETE') {
      // Xóa mềm: Đánh dấu deletedAt
      for (const id of taskIds) {
        await db.update(pwrTasks)
          .set({ deletedAt: new Date() })
          .where(eq(pwrTasks.id, id));
      }
      return NextResponse.json({ success: true, message: `Đã xóa ${taskIds.length} Task` });
    }

    return NextResponse.json({ error: 'Action không hợp lệ. Chọn ARCHIVE hoặc DELETE.' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
