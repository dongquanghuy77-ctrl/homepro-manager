import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { pwrWorkLogs } from '@/db/schema';
import { requireAuth } from '@/lib/auth';
import { writeFile } from 'fs/promises';
import { join } from 'path';

export async function POST(req: NextRequest) {
  try {
    // 1. Phân quyền: Kiểm tra session
    const { session, error } = await requireAuth(req);
    if (error) return error;

    // 2. Parse FormData
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const taskId = formData.get('taskId') as string;
    const note = formData.get('note') as string || '';

    if (!taskId) {
      return NextResponse.json({ error: 'Missing taskId' }, { status: 400 });
    }

    let fileUrl = '';

    // 3. Xử lý File vật lý
    if (file) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const uploadDir = join(process.cwd(), 'public', 'uploads', 'defects');
      const filePath = join(uploadDir, fileName);
      
      // Ghi file cứng
      await writeFile(filePath, buffer);
      fileUrl = `/uploads/defects/${fileName}`;
    }

    // 4. Ghi DB: Tạo Issue Log
    const newLog = await db.insert(pwrWorkLogs).values({
      taskId: parseInt(taskId),
      userId: session!.id,
      logType: 'ISSUE_LOG',
      content: note || 'Báo cáo sự cố từ máy trạm',
      issue: fileUrl ? `Đính kèm ảnh lỗi: ${fileUrl}` : null,
      isSystemLog: false
    }).returning();

    return NextResponse.json({ 
      success: true, 
      message: 'Đã lưu sự cố', 
      log: newLog[0],
      fileUrl
    });

  } catch (error: any) {
    console.error('Mobile Defect API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
