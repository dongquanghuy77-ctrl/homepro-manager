import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { costs, projects } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { requireAuth, ADMIN_OR_MANAGER, ALL_ROLES } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { error } = await requireAuth(req, ALL_ROLES);
  if (error) return error;

  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');

    let query = db
      .select({
        id: costs.id,
        projectId: costs.projectId,
        projectName: projects.name,
        projectCode: projects.code,
        contractValue: projects.contractValue,
        title: costs.title,
        amount: costs.amount,
        category: costs.category,
        costDate: costs.costDate,
        notes: costs.notes,
        createdByName: costs.createdByName,
        createdAt: costs.createdAt,
      })
      .from(costs)
      .leftJoin(projects, eq(costs.projectId, projects.id))
      .orderBy(desc(costs.id));

    if (projectId) {
      const pId = parseInt(projectId);
      if (!isNaN(pId)) {
        // @ts-ignore
        query = query.where(eq(costs.projectId, pId));
      }
    }

    const list = await query;
    return NextResponse.json(list);
  } catch (err) {
    console.error('GET /api/costs error:', err);
    return NextResponse.json({ error: 'Không thể tải danh sách chi phí' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { error } = await requireAuth(req, ADMIN_OR_MANAGER);
  if (error) return error;

  try {
    const body = await req.json();
    const { projectId, title, amount, category, costDate, notes, createdByName } = body;

    if (!projectId || !title || amount === undefined || !costDate) {
      return NextResponse.json({ error: 'Thiếu thông tin bắt buộc (Dự án, Nội dung, Số tiền, Ngày chi)' }, { status: 400 });
    }

    const [newCost] = await db
      .insert(costs)
      .values({
        projectId: parseInt(projectId),
        title: title.trim(),
        amount: parseFloat(amount) || 0,
        category: category || 'Vật tư mua ngoài',
        costDate: costDate.trim(),
        notes: notes ? notes.trim() : null,
        createdByName: createdByName ? createdByName.trim() : null,
      })
      .returning();

    return NextResponse.json(newCost, { status: 201 });
  } catch (err) {
    console.error('POST /api/costs error:', err);
    return NextResponse.json({ error: 'Không thể thêm khoản chi phí' }, { status: 500 });
  }
}
