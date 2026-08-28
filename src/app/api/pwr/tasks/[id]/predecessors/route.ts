import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { pwrTasks, pwrTaskDependencies } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const taskId = parseInt(params.id);
    
    // Tìm các task mà task hiện tại đang phụ thuộc vào (predecessors)
    const deps = await db.select().from(pwrTaskDependencies).where(eq(pwrTaskDependencies.taskId, taskId));
    
    const predecessorIds = deps.map(d => d.dependsOnId);
    if (predecessorIds.length === 0) return NextResponse.json([]);

    // Lấy thông tin chi tiết của các predecessors
    const predecessors = [];
    for (const pid of predecessorIds) {
       const [t] = await db.select().from(pwrTasks).where(eq(pwrTasks.id, pid));
       if (t) predecessors.push(t);
    }
    
    return NextResponse.json(predecessors);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
