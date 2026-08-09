import { NextResponse } from 'next/server';
import { db } from '@/db';
import { projects } from '@/db/schema';
import { desc } from 'drizzle-orm';

export async function GET() {
  try {
    const allProjects = await db.select().from(projects).orderBy(desc(projects.createdAt));
    return NextResponse.json(allProjects);
  } catch (error) {
    console.error('[GET /api/projects]', error);
    return NextResponse.json({ error: 'Không thể tải danh sách dự án' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code, name, customer, location, manager, startDate, deadline, contractValue, status, notes } = body;

    if (!code || !name || !customer || !manager) {
      return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 });
    }

    const [newProject] = await db
      .insert(projects)
      .values({ code, name, customer, location, manager, startDate, deadline, contractValue, status: status || 'ACTIVE', notes })
      .returning();

    return NextResponse.json(newProject, { status: 201 });
  } catch (error: unknown) {
    console.error('[POST /api/projects]', error);
    if (error instanceof Error && error.message?.includes('UNIQUE')) {
      return NextResponse.json({ error: 'Mã dự án đã tồn tại' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Không thể tạo dự án' }, { status: 500 });
  }
}
