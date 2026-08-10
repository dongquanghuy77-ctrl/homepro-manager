// src/app/api/hr/employees/import/route.ts
// ══════════════════════════════════════════════════════════════════════════════
// HR Employee Import API — Upsert hàng loạt từ Excel
//
// POST /api/hr/employees/import
//   Body: { rows: EmployeeImportRow[] }
//   Response: { created, updated, skipped, errors: RowError[] }
//
// Upsert logic:
//   - Match theo employeeCode (unique)
//   - Tồn tại → UPDATE (không đụng password/username)
//   - Chưa có → INSERT (tự tạo username = employeeCode.toLowerCase(), mật khẩu mặc định = '123456')
//
// Giới hạn an toàn:
//   - Tối đa 500 rows / request
//   - Validate từng row trước khi ghi DB
//   - Partial success: ghi được bao nhiêu, báo lỗi bao nhiêu
// ══════════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth, ADMIN_ONLY } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { writeHrAuditLog } from '@/lib/hr';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
export interface EmployeeImportRow {
  employeeCode:   string;   // Mã NV — dùng để upsert key (BẮT BUỘC)
  name:           string;   // Họ tên (BẮT BUỘC)
  position?:      string;   // Chức vụ
  department?:    string;   // Bộ phận
  phone?:         string;   // SĐT
  email?:         string;   // Email
  birthDate?:     string;   // Ngày sinh (dd/mm/yyyy)
  joinDate?:      string;   // Ngày vào (dd/mm/yyyy)
  employmentType?: string;  // FULL_TIME | PART_TIME | CONTRACT
  employeeStatus?: string;  // ACTIVE | INACTIVE | ON_LEAVE
  note?:          string;   // Ghi chú
}

export interface RowError {
  row:     number;
  code:    string;
  message: string;
}

interface ImportResult {
  created:  number;
  updated:  number;
  skipped:  number;
  errors:   RowError[];
  total:    number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Validators
// ─────────────────────────────────────────────────────────────────────────────
const VALID_EMP_TYPES  = new Set(['FULL_TIME', 'PART_TIME', 'CONTRACT']);
const VALID_EMP_STATUS = new Set(['ACTIVE', 'INACTIVE', 'ON_LEAVE']);

function validateRow(row: EmployeeImportRow, idx: number): string | null {
  if (!row.employeeCode?.trim()) return `Hàng ${idx + 1}: Thiếu Mã nhân viên`;
  if (!row.name?.trim())         return `Hàng ${idx + 1}: Thiếu Họ tên`;
  if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
    return `Hàng ${idx + 1}: Email "${row.email}" không hợp lệ`;
  }
  if (row.employmentType && !VALID_EMP_TYPES.has(row.employmentType)) {
    return `Hàng ${idx + 1}: Loại hợp đồng "${row.employmentType}" không hợp lệ (FULL_TIME | PART_TIME | CONTRACT)`;
  }
  if (row.employeeStatus && !VALID_EMP_STATUS.has(row.employeeStatus)) {
    return `Hàng ${idx + 1}: Trạng thái "${row.employeeStatus}" không hợp lệ (ACTIVE | INACTIVE | ON_LEAVE)`;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST Handler
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // Chỉ Admin mới được import hàng loạt
  const { session, error } = await requireAuth(req, ADMIN_ONLY);
  if (error) return error;

  let body: { rows?: EmployeeImportRow[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body JSON không hợp lệ' }, { status: 400 });
  }

  const rows = body.rows;
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'Không có dữ liệu để import' }, { status: 400 });
  }
  if (rows.length > 500) {
    return NextResponse.json(
      { error: `Tối đa 500 nhân viên / lần import (bạn đang gửi ${rows.length})` },
      { status: 400 }
    );
  }

  const result: ImportResult = { created: 0, updated: 0, skipped: 0, errors: [], total: rows.length };

  // ── Detect duplicate employeeCode trong cùng file ──────────────────────────
  const seenCodes = new Set<string>();

  // ── Xử lý từng row ────────────────────────────────────────────────────────
  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i];
    const row: EmployeeImportRow = {
      ...raw,
      employeeCode:   String(raw.employeeCode ?? '').trim().toUpperCase(),
      name:           String(raw.name         ?? '').trim(),
      position:       String(raw.position     ?? '').trim() || undefined,
      department:     String(raw.department   ?? '').trim() || undefined,
      phone:          String(raw.phone        ?? '').trim() || undefined,
      email:          String(raw.email        ?? '').trim().toLowerCase() || undefined,
      birthDate:      String(raw.birthDate    ?? '').trim() || undefined,
      joinDate:       String(raw.joinDate     ?? '').trim() || undefined,
      employmentType: String(raw.employmentType ?? '').trim().toUpperCase() || undefined,
      employeeStatus: String(raw.employeeStatus ?? '').trim().toUpperCase() || undefined,
      note:           String(raw.note         ?? '').trim() || undefined,
    };

    // 1. Validate
    const validationErr = validateRow(row, i);
    if (validationErr) {
      result.errors.push({ row: i + 1, code: row.employeeCode || '?', message: validationErr });
      result.skipped++;
      continue;
    }

    // 2. Skip duplicate in same file
    if (seenCodes.has(row.employeeCode)) {
      result.errors.push({
        row: i + 1, code: row.employeeCode,
        message: `Hàng ${i + 1}: Mã "${row.employeeCode}" bị trùng trong file Excel — đã bỏ qua`,
      });
      result.skipped++;
      continue;
    }
    seenCodes.add(row.employeeCode);

    try {
      // ── BƯỚC 3: Tìm theo employeeCode (khóa nghiệp vụ duy nhất) ──────────
      const [existing] = await db
        .select({ id: users.id, username: users.username })
        .from(users)
        .where(eq(users.employeeCode, row.employeeCode))
        .limit(1);

      if (existing) {
        // ════════════════════════════════════════════════════════════════
        // UPSERT — NHÁNH UPDATE
        // Nhân viên đã tồn tại theo employeeCode → chỉ cập nhật HR fields.
        // TUYỆT ĐỐI KHÔNG CHẠM vào: username, password, role, active
        // ════════════════════════════════════════════════════════════════
        await db.update(users).set({
          name:           row.name,
          position:       row.position       ?? null,
          department:     row.department     ?? null,
          phone:          row.phone          ?? null,
          email:          row.email          ?? null,
          birthDate:      row.birthDate      ?? null,
          joinDate:       row.joinDate       ?? null,
          employmentType: row.employmentType ?? 'FULL_TIME',
          employeeStatus: row.employeeStatus ?? 'ACTIVE',
          note:           row.note           ?? null,
          updatedAt:      new Date(),
        }).where(eq(users.id, existing.id));

        await writeHrAuditLog({
          action:     'EMPLOYEE_UPDATED',
          entityType: 'employee',
          entityId:   existing.id,
          actorId:    session!.id,
          newValue:   { name: row.name, department: row.department, position: row.position },
        });

        result.updated++;

      } else {
        // ════════════════════════════════════════════════════════════════
        // UPSERT — NHÁNH INSERT
        // Nhân viên CHƯA tồn tại → tạo mới với username = employeeCode.lower
        //
        // Nếu username đó đã bị user KHÁC chiếm dụng → BÁO LỖI.
        // TUYỆT ĐỐI KHÔNG sinh mã thay thế (_Date.now) vì:
        //   - Vi phạm "1 nhân sự = 1 mã nhân sự"
        //   - Gây nhân sự ảo nếu import lại file cũ
        // ════════════════════════════════════════════════════════════════
        const username = row.employeeCode.toLowerCase();

        const [usernameConflict] = await db
          .select({ id: users.id, employeeCode: users.employeeCode })
          .from(users)
          .where(eq(users.username, username))
          .limit(1);

        if (usernameConflict) {
          // Tên đăng nhập đã bị dùng bởi nhân viên khác — từ chối, báo lỗi
          result.errors.push({
            row:     i + 1,
            code:    row.employeeCode,
            message: `Tên đăng nhập "${username}" đã tồn tại trong hệ thống (thuộc mã NV khác). `
              + `Kiểm tra lại mã NV "${row.employeeCode}" hoặc liên hệ Admin.`,
          });
          result.skipped++;
          continue;
        }

        // Username an toàn → INSERT nhân viên mới
        const hashedPw = await bcrypt.hash('123456', 10);

        const [newUser] = await db.insert(users).values({
          username,
          password:       hashedPw,
          name:           row.name,
          role:           'WORKER',
          active:         true,
          employeeCode:   row.employeeCode,
          position:       row.position       ?? null,
          department:     row.department     ?? null,
          phone:          row.phone          ?? null,
          email:          row.email          ?? null,
          birthDate:      row.birthDate      ?? null,
          joinDate:       row.joinDate       ?? null,
          employmentType: row.employmentType ?? 'FULL_TIME',
          employeeStatus: row.employeeStatus ?? 'ACTIVE',
          note:           row.note           ?? null,
        }).returning({ id: users.id });

        await writeHrAuditLog({
          action:     'EMPLOYEE_CREATED',
          entityType: 'employee',
          entityId:   newUser.id,
          actorId:    session!.id,
          newValue:   { name: row.name, employeeCode: row.employeeCode, username },
        });

        result.created++;
      }
    } catch (dbErr) {
      console.error(`[HR Import] Lỗi DB row ${i + 1} (${row.employeeCode}):`, dbErr);
      result.errors.push({
        row:     i + 1,
        code:    row.employeeCode,
        message: `Lỗi DB: ${dbErr instanceof Error ? dbErr.message : String(dbErr)}`,
      });
      result.skipped++;
    }
  }

  console.log(`[HR Import] Kết quả: +${result.created} tạo mới, ~${result.updated} cập nhật, ${result.skipped} bỏ qua, ${result.errors.length} lỗi`);

  return NextResponse.json(result, { status: 200 });
}
