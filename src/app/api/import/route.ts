import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { projects, tasks } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import * as XLSX from 'xlsx';
import { requireAuth, ADMIN_OR_MANAGER } from '@/lib/auth';
import {
  buildColumnMap, getField, fixRowEncoding, hasEncodingIssue,
  runEncodingTest, type ColumnMapResult,
} from '@/lib/import-parser';
import { detectHeaderRow } from '@/lib/boq-parser';

// ── Trả lỗi 422 chuẩn với chi tiết cho UI ───────────────────────────────────
function reject422(reason: string, details: string[], columnLog?: string[]) {
  return NextResponse.json({
    error:       reason,
    details,
    columnLog:   columnLog ?? [],
    projectsImported: 0,
    tasksImported:    0,
  }, { status: 422 });
}

export async function POST(request: NextRequest) {
  const { error } = await requireAuth(request, ADMIN_OR_MANAGER);
  if (error) return error;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Vui lòng chọn file Excel hoặc CSV để tải lên' }, { status: 400 });
    }

    // ── BƯỚC 2: Đọc file + phát hiện encoding ──────────────────────────────
    const bytes  = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // SheetJS đọc file — codepage: 65001 = UTF-8, 1258 = Windows Vietnamese
    const workbook = XLSX.read(buffer, {
      type:     'buffer',
      codepage: 65001,   // Ưu tiên UTF-8
      raw:      false,
      cellDates: true,
    });

    const sheetName = workbook.SheetNames[0];
    const sheet     = workbook.Sheets[sheetName];

    // ── BƯỚC 1A: Đọc sheet thành mảng 2D (không giả định hàng 0 là header) ────
    const allRows2D = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header:    1,        // Trả mảng 2D, không có key tự động
      defval:    '',
      raw:       false,
      dateNF:    'yyyy-mm-dd',
    });

    if (allRows2D.length === 0) {
      return reject422(
        'File Excel rỗng hoặc không đọc được dữ liệu',
        ['Sheet đầu tiên không có dòng dữ liệu nào.',
         'Kiểm tra file có đúng định dạng .xlsx/.csv không.']
      );
    }

    // ── BƯỚC 1B: Phát hiện hàng tiêu đề thông minh (quét 5 hàng đầu) ─────
    const headerDetect = detectHeaderRow(allRows2D);
    console.log('[/api/import] ── Smart Header Detection ──');
    headerDetect.log.forEach(l => console.log(l));

    // ── BƯỚC 1C: Xây dựng rawRows từ các dòng DƯỚI header row ──────────
    const headerCells = headerDetect.headerCells;
    const rawRows: Record<string, unknown>[] = [];
    for (let r = headerDetect.rowIndex + 1; r < allRows2D.length; r++) {
      const dataRow = allRows2D[r] as unknown[] ?? [];
      const obj: Record<string, unknown> = {};
      headerCells.forEach((h, i) => { if (h) obj[h] = dataRow[i] ?? ''; });
      // Bỏ hàng hoàn toàn rỗng
      if (Object.values(obj).some(v => String(v).trim() !== '')) rawRows.push(obj);
    }

    if (rawRows.length === 0) {
      return reject422(
        'Không có dữ liệu bên dưới hàng tiêu đề',
        [
          `Hàng tiêu đề được phát hiện tại dòng ${headerDetect.rowIndex + 1} (score=${headerDetect.score.toFixed(1)}).`,
          'Các cột nhận diện: ' + headerCells.filter(Boolean).join(', '),
          'Không có dòng dữ liệu nào bên dưới.',
          'Kiểm tra lại file hoặc tải file mẫu để xem định dạng chuẩn.',
        ]
      );
    }

    // ── BƯỚC 2: Tự động sửa lỗi encoding nếu phát hiện garbled text ─────────
    let encodingFixed = false;
    const processedRows = rawRows.map(row => {
      const rowStr = JSON.stringify(row);
      if (hasEncodingIssue(rowStr)) {
        encodingFixed = true;
        return fixRowEncoding(row);
      }
      return row;
    });
    // Log encoding test khi chạy
    const encTest = runEncodingTest();
    console.log('[/api/import] Encoding self-test:', encTest.passed ? 'PASS' : 'WARN',
      encTest.results.join('\n'));
    if (encodingFixed) {
      console.log('[/api/import] ⚠️  Đã phát hiện và sửa lỗi encoding Windows-1258→UTF-8');
    }

    // ── BƯỚC 1: Fuzzy Header Matching ────────────────────────────────────────
    const headers = Object.keys(processedRows[0] ?? {});
    const colMap: ColumnMapResult = buildColumnMap(headers);

    // Log chi tiết lên console để dev kiểm tra
    console.log('[/api/import] ── Column Map Log ──');
    colMap.log.forEach(l => console.log(' ', l));

    // BƯỚC 3: Nếu thiếu cả code lẫn projectName → trả 422 chi tiết
    if (colMap.missingRequired.length > 0) {
      const details: string[] = [
        `Không tìm thấy cột bắt buộc: ${colMap.missingRequired.join(', ')}`,
        `Các cột hiện có trong file: ${headers.join(' | ')}`,
        '',
        'Hướng dẫn sửa:',
        '  • Cột Mã dự án: đặt tên là "Mã dự án", "code", hoặc "Project Code"',
        '  • Cột Tên dự án: đặt tên là "Tên dự án", "name", hoặc "Project Name"',
        '  • Tải file mẫu từ nút "📥 Tải File Mẫu" để xem định dạng chuẩn.',
      ];
      return reject422(
        `Lỗi: File thiếu cột bắt buộc — "${colMap.missingRequired.join('", "')}"`,
        details,
        colMap.log
      );
    }

    // ── Parse từng dòng ───────────────────────────────────────────────────
    let createdProjectsCount  = 0;   // Dự án mới tạo
    let existingProjectsCount = 0;   // Dự án đã tồn tại — vẫn nạp được cấu kiện
    let createdTasksCount     = 0;
    let skippedRows           = 0;
    const projectCache = new Map<string, number>();
    const parseErrors: string[] = [];

    for (const rawRow of processedRows) {
      const row = rawRow as Record<string, unknown>;

      // ── BƯỚC 0: Chuẩn hóa mã dự án — trim + UPPER ────────────────────────
      // Bất kể file Excel gửi "da-ak-260719 " hay "DA-AK-260719"
      // → luôn so khớp với DB (vốn lưu dạng UPPER)
      const codeRaw  = getField(row, colMap.fieldToColumn, 'code');
      const code     = codeRaw.trim().toUpperCase();
      const projectName = getField(row, colMap.fieldToColumn, 'projectName');

      // Log mắt xích nếu phát hiện code bị lệch khỏi chuẩn
      if (codeRaw !== code) {
        console.warn(
          `[/api/import] ⚠️  Code lệch chuẩn — raw: "${codeRaw}" → normalized: "${code}"`,
          `(dòng ${processedRows.indexOf(rawRow) + 1})`
        );
      }

      if (!code || !projectName) {
        skippedRows++;
        continue;
      }

      const customer      = getField(row, colMap.fieldToColumn, 'customer')      || 'Khách hàng';
      const manager       = getField(row, colMap.fieldToColumn, 'manager')       || 'Huy';
      const location      = getField(row, colMap.fieldToColumn, 'location')      || '';
      const contractRaw   = getField(row, colMap.fieldToColumn, 'contractValue');
      const contractValue = parseFloat(contractRaw.replace(/[^0-9.]/g, ''))      || 0;
      const pStartDate    = getField(row, colMap.fieldToColumn, 'startDate')     || null;
      const pDeadline     = getField(row, colMap.fieldToColumn, 'deadline')      || null;
      const pNotes        = getField(row, colMap.fieldToColumn, 'projectNotes')  || '';

      // Tìm hoặc tạo project — so khớp CASE-INSENSITIVE
      let projectId = projectCache.get(code);  // cache key là UPPER rồi
      if (!projectId) {
        try {
          // UPPER(TRIM(projects.code)) = code (cũng đã UPPER)
          // → match được cả DB lưu thường lẫn DB lưu HOA
          const [existing] = await db
            .select()
            .from(projects)
            .where(eq(sql`UPPER(TRIM(${projects.code}))`, code));

          if (existing) {
            projectId = existing.id;
            existingProjectsCount++;   // ❤️ Đếm riêng: dự án đã có sẵn
            console.log(`[/api/import] ✅ Dự án tồn tại: "${code}" → id=${existing.id}`);
          } else {
            // Không tìm thấy — tạo mới với code đã được chuẩn hóa (UPPER)
            console.log(`[/api/import] ➕ Tạo dự án mới: "${code}"`);
            const [newProj] = await db.insert(projects).values({
              code, name: projectName, customer, manager, location,
              contractValue, startDate: pStartDate, deadline: pDeadline,
              status: 'ACTIVE', notes: pNotes,
            }).returning();
            projectId = newProj.id;
            createdProjectsCount++;
          }
          projectCache.set(code, projectId);
        } catch (e) {
          console.error(`[/api/import] ❌ Lỗi tra cứu dự án "${code}": ${String(e)}`);
          parseErrors.push(`Lỗi tạo dự án "${code}": ${String(e)}`);
          continue;
        }
      }

      // Tạo task nếu có
      const taskTitle = getField(row, colMap.fieldToColumn, 'taskTitle');
      if (taskTitle && projectId) {
        try {
          const category    = getField(row, colMap.fieldToColumn, 'category')     || 'Thi công';
          const assignee    = getField(row, colMap.fieldToColumn, 'assignee')     || 'Huy';
          const tStartDate  = getField(row, colMap.fieldToColumn, 'taskStartDate')|| null;
          const tEndDate    = getField(row, colMap.fieldToColumn, 'taskEndDate')  || null;
          const priorityRaw = getField(row, colMap.fieldToColumn, 'priority').toUpperCase();
          const statusRaw   = getField(row, colMap.fieldToColumn, 'status').toUpperCase();
          const progressRaw = parseInt(getField(row, colMap.fieldToColumn, 'progress').replace(/[^0-9]/g, '')) || 0;
          const taskNotes   = getField(row, colMap.fieldToColumn, 'taskNotes')   || '';

          // Chuẩn hóa priority
          let priority: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM';
          const pNorm = priorityRaw.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase();
          if (pNorm.includes('cao') || pNorm === 'high')   priority = 'HIGH';
          else if (pNorm.includes('thap') || pNorm === 'low') priority = 'LOW';

          // Chuẩn hóa status
          let status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'PAUSED' | 'OVERDUE' = 'NOT_STARTED';
          const sNorm = statusRaw.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase();
          if (sNorm.includes('hoan thanh') || sNorm === 'completed' || progressRaw === 100) status = 'COMPLETED';
          else if (sNorm.includes('dang') || sNorm === 'in_progress' || progressRaw > 0)    status = 'IN_PROGRESS';
          else if (sNorm.includes('tam dung') || sNorm === 'paused')                        status = 'PAUSED';

          await db.insert(tasks).values({
            projectId, category, title: taskTitle, assignee,
            startDate: tStartDate, endDate: tEndDate, status, priority,
            progress: status === 'COMPLETED' ? 100 : progressRaw,
            notes: taskNotes,
          });
          createdTasksCount++;
        } catch (e) {
          parseErrors.push(`Lỗi tạo task "${taskTitle}": ${String(e)}`);
        }
      }
    }

    // ── BƯỚC 3: Kiểm tra kết quả — chỉ báo lỗi khi KHÔNG làm gì được cả ─────────
    //
    //  ✅ Thành công nếu: dự án mới tạo > 0
    //  ✅ Thành công nếu: dự án đã có sẵn và có task/cấu kiện được nạp vào
    //  ✅ Thành công nếu: có bất kỳ task nào được tạo
    //  ❌ Lỗi chỉ khi: không có dự án nào được chạm vào (neither new nor existing)
    const totalProjectsTouched = createdProjectsCount + existingProjectsCount;
    if (totalProjectsTouched === 0 && processedRows.length > 0) {
      const details: string[] = [
        `File có ${processedRows.length} dòng nhưng không tìm được dự án nào (mới lẫn cũ).`,
        skippedRows > 0
          ? `${skippedRows} dòng bị bỏ qua do thiếu "Mã dự án" hoặc "Tên dự án".`
          : 'Tất cả dòng bị bỏ qua — kiểm tra giá trị cột "Mã dự án" không được rỗng.',
        '',
        `Cột đã nhận diện được:`,
        ...Object.entries(colMap.fieldToColumn).map(([f, c]) => `  • ${f} ← "${c}"`),
        '',
        'Cột CHƯA nhận diện được:',
        ...colMap.unmappedHeaders.map(h => `  ⚠️  "${h}"`),
        '',
        parseErrors.length > 0 ? `Lỗi kỹ thuật: ${parseErrors.join('; ')}` : '',
        'Hãy tải file mẫu và đối chiếu tên cột.',
      ].filter(Boolean);

      return reject422(
        `Lỗi: File được xử lý nhưng không gắn được vào dự án nào — kiểm tra cột Mã dự án`,
        details,
        colMap.log
      );
    }

    // ── Trả 201 thành công ─────────────────────────────────────────────────
    const successMessage = createdProjectsCount > 0
      ? `Nhập dữ liệu thành công! Đã tạo ${createdProjectsCount} dự án mới và ${createdTasksCount} công việc.`
      : `Import thành công! Đã cập nhật dữ liệu cấu kiện cho dự án hiện tại.`;

    return NextResponse.json({
      success:          true,
      message:          successMessage,
      projectsImported: createdProjectsCount,
      projectsUpdated:  existingProjectsCount,   // Dự án cũ được cập nhật
      tasksImported:    createdTasksCount,
      skippedRows,
      encodingFixed,
      columnMap:        colMap.fieldToColumn,
      warnings:         parseErrors.length > 0 ? parseErrors : undefined,
    }, { status: 201 });

  } catch (err: unknown) {
    console.error('[POST /api/import]', err);
    return NextResponse.json({
      error:   'Lỗi xử lý file. Vui lòng kiểm tra định dạng và thử lại.',
      details: [String(err)],
      projectsImported: 0,
      tasksImported:    0,
    }, { status: 500 });
  }
}
