// src/app/api/hr/employees/export/route.ts
// ══════════════════════════════════════════════════════════════════════════════
// HR Employee Export API — Xuất danh sách nhân viên ra Excel
//
// GET /api/hr/employees/export
//   → trả về file .xlsx với đầy đủ thông tin nhân viên
//   → Sheet 1: Danh sách nhân viên (format chuẩn để re-import được)
//   → Sheet 2: Ghi chú hướng dẫn cột
// ══════════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { requireAuth, ADMIN_OR_MANAGER } from '@/lib/auth';
import * as XLSX from 'xlsx';

// ─────────────────────────────────────────────────────────────────────────────
// Column map: DB field → header tiếng Việt
// Thứ tự này khớp với template import để có thể re-import file export
// ─────────────────────────────────────────────────────────────────────────────
const COLUMNS = [
  { key: 'employeeCode',   header: 'Mã NV',        width: 10 },
  { key: 'name',           header: 'Họ tên',        width: 24 },
  { key: 'position',       header: 'Chức vụ',       width: 18 },
  { key: 'department',     header: 'Bộ phận',       width: 18 },
  { key: 'phone',          header: 'SĐT',           width: 14 },
  { key: 'email',          header: 'Email',         width: 26 },
  { key: 'birthDate',      header: 'Ngày sinh',     width: 12 },
  { key: 'joinDate',       header: 'Ngày vào',      width: 12 },
  { key: 'employmentType', header: 'Loại HĐ',       width: 12 },
  { key: 'employeeStatus', header: 'Trạng thái',    width: 12 },
  { key: 'note',           header: 'Ghi chú',       width: 30 },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// GET Handler
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth(req, ADMIN_OR_MANAGER);
  if (error) return error;

  try {
    // Lấy toàn bộ nhân viên, sắp xếp theo mã NV
    const employees = await db.select({
      employeeCode:   users.employeeCode,
      name:           users.name,
      position:       users.position,
      department:     users.department,
      phone:          users.phone,
      email:          users.email,
      birthDate:      users.birthDate,
      joinDate:       users.joinDate,
      employmentType: users.employmentType,
      employeeStatus: users.employeeStatus,
      note:           users.note,
    }).from(users)
      .where(eq(users.active, true))
      .orderBy(users.employeeCode);

    // ── Build workbook ─────────────────────────────────────────────────────
    const wb = XLSX.utils.book_new();

    // ── Sheet 1: Dữ liệu nhân viên ────────────────────────────────────────
    const headers = COLUMNS.map((c) => c.header);
    const dataRows = employees.map((emp) =>
      COLUMNS.map((c) => (emp as Record<string, unknown>)[c.key] ?? '')
    );

    const wsData = [headers, ...dataRows];
    const ws1 = XLSX.utils.aoa_to_sheet(wsData);

    // Thiết lập độ rộng cột
    ws1['!cols'] = COLUMNS.map((c) => ({ wch: c.width }));

    // Freeze header row
    ws1['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: 'A2' };

    XLSX.utils.book_append_sheet(wb, ws1, 'Nhân viên');

    // ── Sheet 2: Hướng dẫn ────────────────────────────────────────────────
    const guideData = [
      ['HƯỚNG DẪN IMPORT FILE EXCEL NHÂN VIÊN'],
      [''],
      ['Cột', 'Ý nghĩa', 'Bắt buộc', 'Giá trị hợp lệ'],
      ['Mã NV',       'Mã nhân viên duy nhất (NV001...)',            'CÓ',  'Ví dụ: NV001, NV002'],
      ['Họ tên',      'Họ và tên đầy đủ',                            'CÓ',  ''],
      ['Chức vụ',     'Vị trí công việc',                            'Không', 'Ví dụ: Thợ mộc, Kế toán'],
      ['Bộ phận',     'Phòng ban',                                   'Không', 'Xưởng gỗ | Lắp đặt | Sơn | Thi công | Thiết kế | Kế toán | Quản lý'],
      ['SĐT',         'Số điện thoại',                               'Không', ''],
      ['Email',       'Địa chỉ email',                               'Không', 'Phải đúng định dạng email'],
      ['Ngày sinh',   'Ngày tháng năm sinh',                         'Không', 'DD/MM/YYYY'],
      ['Ngày vào',    'Ngày gia nhập công ty',                       'Không', 'DD/MM/YYYY'],
      ['Loại HĐ',     'Loại hợp đồng lao động',                     'Không', 'FULL_TIME | PART_TIME | CONTRACT'],
      ['Trạng thái',  'Trạng thái hiện tại của nhân viên',          'Không', 'ACTIVE | INACTIVE | ON_LEAVE'],
      ['Ghi chú',     'Thông tin bổ sung',                           'Không', ''],
      [''],
      ['LƯU Ý QUAN TRỌNG:'],
      ['• Cột "Mã NV" là khóa upsert: đã tồn tại → cập nhật, chưa có → tạo mới'],
      ['• Nhân viên mới sẽ có mật khẩu mặc định: 123456 (phải đổi sau khi đăng nhập)'],
      ['• Tối đa 500 nhân viên / lần import'],
      [`• File được xuất lúc: ${new Date().toLocaleString('vi-VN')}`],
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(guideData);
    ws2['!cols'] = [{ wch: 14 }, { wch: 40 }, { wch: 12 }, { wch: 55 }];
    XLSX.utils.book_append_sheet(wb, ws2, 'Hướng dẫn');

    // ── Serialize → Buffer ─────────────────────────────────────────────────
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });

    const filename = `nhan-vien-${new Date().toISOString().split('T')[0]}.xlsx`;

    return new NextResponse(buf, {
      headers: {
        'Content-Type':        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        'Content-Length':      String(buf.length),
        'Cache-Control':       'no-store',
      },
    });

  } catch (err) {
    console.error('[HR Export] Lỗi:', err);
    return NextResponse.json(
      { error: 'Không thể xuất file Excel' },
      { status: 500 }
    );
  }
}
