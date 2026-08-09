import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { projects, tasks } from '@/db/schema';
import { eq } from 'drizzle-orm';
import * as XLSX from 'xlsx';
import { requireAuth, ADMIN_OR_MANAGER } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const { error } = await requireAuth(request, ADMIN_OR_MANAGER);
  if (error) return error;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Vui lòng chọn file Excel hoặc CSV để tải lên' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Read workbook with SheetJS
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Convert sheet to JSON array
    const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (rawRows.length === 0) {
      return NextResponse.json({ error: 'File Excel rỗng hoặc không đúng định dạng' }, { status: 400 });
    }

    let createdProjectsCount = 0;
    let createdTasksCount = 0;
    const projectCache = new Map<string, number>();

    // Helper map for normalizing headers
    const findValue = (row: Record<string, any>, keys: string[]) => {
      for (const k of keys) {
        for (const rowKey of Object.keys(row)) {
          if (rowKey.trim().toLowerCase() === k.toLowerCase()) {
            return row[rowKey];
          }
        }
      }
      return '';
    };

    for (const row of rawRows) {
      const code = String(findValue(row, ['Mã dự án', 'code', 'ProjectCode'])).trim();
      const projectName = String(findValue(row, ['Tên dự án', 'name', 'ProjectName'])).trim();
      const customer = String(findValue(row, ['Khách hàng', 'customer'])).trim() || 'Khách hàng';
      const manager = String(findValue(row, ['Quản lý', 'manager'])).trim() || 'Huy';
      const location = String(findValue(row, ['Địa điểm', 'location'])).trim();
      const rawValue = findValue(row, ['Hợp đồng (VND)', 'Hợp đồng', 'contract_value', 'contractValue']);
      const contractValue = parseFloat(String(rawValue).replace(/[^0-9.]/g, '')) || 0;
      const pStartDate = String(findValue(row, ['Ngày bắt đầu dự án', 'start_date', 'startDate'])).trim();
      const pDeadline = String(findValue(row, ['Deadline dự án', 'deadline'])).trim();
      const pNotes = String(findValue(row, ['Ghi chú dự án', 'notes'])).trim();

      if (!code || !projectName) {
        continue; // Skip rows without project code or name
      }

      // Find or create project
      let projectId = projectCache.get(code);

      if (!projectId) {
        const [existing] = await db.select().from(projects).where(eq(projects.code, code));
        if (existing) {
          projectId = existing.id;
        } else {
          const [newProj] = await db
            .insert(projects)
            .values({
              code,
              name: projectName,
              customer,
              manager,
              location,
              contractValue,
              startDate: pStartDate || null,
              deadline: pDeadline || null,
              status: 'ACTIVE',
              notes: pNotes,
            })
            .returning();
          projectId = newProj.id;
          createdProjectsCount++;
        }
        projectCache.set(code, projectId);
      }

      // Check if task exists in this row
      const taskTitle = String(findValue(row, ['Tên công việc', 'title', 'TaskTitle'])).trim();
      if (taskTitle) {
        const category = String(findValue(row, ['Hạng mục công việc', 'Hạng mục', 'category'])).trim() || 'Thi công';
        const assignee = String(findValue(row, ['Người phụ trách', 'assignee'])).trim() || 'Huy';
        const tStartDate = String(findValue(row, ['Ngày bắt đầu task', 'start_date'])).trim();
        const tEndDate = String(findValue(row, ['Hạn công việc', 'end_date', 'endDate'])).trim();
        const priorityRaw = String(findValue(row, ['Ưu tiên', 'priority'])).trim().toUpperCase();
        const statusRaw = String(findValue(row, ['Trạng thái', 'status'])).trim().toUpperCase();
        const progressRaw = parseInt(String(findValue(row, ['Tiến độ %', 'progress'])).replace(/[^0-9]/g, '')) || 0;
        const taskNotes = String(findValue(row, ['Ghi chú task', 'notes'])).trim();

        // Priority normalization
        let priority: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM';
        if (priorityRaw.includes('CAO') || priorityRaw === 'HIGH') priority = 'HIGH';
        else if (priorityRaw.includes('THẤP') || priorityRaw === 'LOW') priority = 'LOW';

        // Status normalization
        let status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'PAUSED' | 'OVERDUE' = 'NOT_STARTED';
        if (statusRaw.includes('HOÀN THÀNH') || statusRaw === 'COMPLETED' || progressRaw === 100) {
          status = 'COMPLETED';
        } else if (statusRaw.includes('ĐANG') || statusRaw === 'IN_PROGRESS' || progressRaw > 0) {
          status = 'IN_PROGRESS';
        } else if (statusRaw.includes('TẠM DỪNG') || statusRaw === 'PAUSED') {
          status = 'PAUSED';
        }

        await db.insert(tasks).values({
          projectId,
          category,
          title: taskTitle,
          assignee,
          startDate: tStartDate || null,
          endDate: tEndDate || null,
          status,
          priority,
          progress: status === 'COMPLETED' ? 100 : progressRaw,
          notes: taskNotes,
        });

        createdTasksCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Nhập dữ liệu thành công!`,
      projectsImported: createdProjectsCount,
      tasksImported: createdTasksCount,
    });
  } catch (error: any) {
    console.error('[POST /api/import]', error);
    return NextResponse.json({ error: 'Lỗi xử lý file. Vui lòng kiểm tra định dạng và thử lại.' }, { status: 500 });
  }
}
