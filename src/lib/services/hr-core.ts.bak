import { db } from '@/db';
import { 
  users, 
  employees, 
  employmentContracts, 
  salaryProfiles, 
  departments, 
  positions 
} from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { writeHrAuditLog } from '@/lib/hr';
import bcrypt from 'bcryptjs';

// --- CREATE EMPLOYEE ---

export interface CreateEmployeePayload {
  name: string;
  username: string;
  passwordHash: string;
  position?: string | null;
  role: string;
  phone?: string | null;
  email?: string | null;
  birthDate?: string | null;
  department?: string | null;
  employmentType?: string | null;
  joinDate?: string | null;
  managerId?: number | null; // This is the manager's users.id
  note?: string | null;
  employeeCode: string;
  officialSalary?: number;
  actorId: number;
  actorName: string;
  ipAddress: string;
}

export async function createEmployeeTransaction(payload: CreateEmployeePayload) {
  return await db.transaction(async (tx) => {
    let departmentId = null;
    if (payload.department) {
      const [dept] = await tx.select({ id: departments.id }).from(departments).where(eq(departments.name, payload.department));
      if (!dept) throw new Error(`Phòng ban không tồn tại: ${payload.department}`);
      departmentId = dept.id;
    } else {
      throw new Error('Phòng ban là bắt buộc trong hệ thống HR Core mới');
    }

    let positionId = null;
    if (payload.position) {
      const [pos] = await tx.select({ id: positions.id }).from(positions).where(eq(positions.name, payload.position));
      if (!pos) throw new Error(`Chức vụ không tồn tại: ${payload.position}`);
      positionId = pos.id;
    }

    let managerEmployeeId = null;
    if (payload.managerId) {
      const [mgr] = await tx.select({ id: employees.id }).from(employees).where(eq(employees.userId, payload.managerId));
      if (mgr) {
        managerEmployeeId = mgr.id;
      }
    }

    const [newUser] = await tx.insert(users).values({
      name: payload.name,
      username: payload.username,
      password: payload.passwordHash,
      position: payload.position, 
      role: payload.role,
      phone: payload.phone,
      email: payload.email,
      birthDate: payload.birthDate,
      department: payload.department, 
      departmentId: departmentId, 
      employmentType: payload.employmentType, 
      joinDate: payload.joinDate, 
      managerId: payload.managerId, 
      note: payload.note,
      employeeCode: payload.employeeCode,
      officialSalary: payload.officialSalary || 0, 
      active: true,
      employeeStatus: 'ACTIVE',
    }).returning({ id: users.id });

    const [newEmployee] = await tx.insert(employees).values({
      employeeCode: payload.employeeCode,
      userId: newUser.id,
      fullName: payload.name,
      departmentId: departmentId,
      positionId: positionId,
      managerId: managerEmployeeId,
      employmentStatus: 'ACTIVE',
    }).returning({ id: employees.id });

    const startDate = payload.joinDate || new Date().toISOString().split('T')[0];
    await tx.insert(employmentContracts).values({
      employeeId: newEmployee.id,
      contractType: payload.employmentType || 'FULL_TIME',
      status: 'ACTIVE',
      startDate: startDate,
    });

    await tx.insert(salaryProfiles).values({
      employeeId: newEmployee.id,
      baseSalary: payload.officialSalary || 0,
      effectiveFrom: startDate,
      status: 'ACTIVE',
    });

    try {
      await writeHrAuditLog({
        action: 'EMPLOYEE_CREATED',
        entityType: 'employee',
        entityId: newUser.id,
        actorId: payload.actorId,
        actorName: payload.actorName,
        newValue: { name: payload.name, username: payload.username, department: payload.department, employeeCode: payload.employeeCode },
        ipAddress: payload.ipAddress,
      });
    } catch (e) {}

    return { id: newUser.id, employeeCode: payload.employeeCode };
  });
}

// --- UPDATE EMPLOYEE ---

export interface UpdateEmployeePayload {
  name?: string;
  position?: string | null;
  phone?: string | null;
  email?: string | null;
  birthDate?: string | null;
  department?: string | null;
  employmentType?: string | null;
  joinDate?: string | null;
  managerId?: number | null;
  note?: string | null;
  role?: string;
  officialSalary?: number;
  password?: string;
  employeeCode?: string; // used for manual input promotion ONLY
  
  actorId: number;
  actorName: string;
  ipAddress: string;
}

export async function updateEmployeeTransaction(userId: number, payload: UpdateEmployeePayload) {
  return await db.transaction(async (tx) => {
    const [oldUser] = await tx.select().from(users).where(eq(users.id, userId));
    if (!oldUser) throw new Error('Không tìm thấy nhân viên');

    const [oldEmployee] = await tx.select().from(employees).where(eq(employees.userId, userId));
    const isManualInput = !oldEmployee;

    // Build mapped fields
    const updateUsersData: any = { updatedAt: new Date() };
    const updateEmployeesData: any = { updatedAt: new Date() };

    // Common resolutions
    let departmentId = undefined;
    if (payload.department !== undefined) {
      if (payload.department === null) throw new Error('Phòng ban không được để trống');
      const [dept] = await tx.select({ id: departments.id }).from(departments).where(eq(departments.name, payload.department));
      if (!dept) throw new Error(`Phòng ban không tồn tại: ${payload.department}`);
      departmentId = dept.id;
      updateUsersData.department = payload.department;
      updateUsersData.departmentId = departmentId;
      updateEmployeesData.departmentId = departmentId;
    }

    let positionId = undefined;
    if (payload.position !== undefined) {
      if (payload.position) {
        const [pos] = await tx.select({ id: positions.id }).from(positions).where(eq(positions.name, payload.position));
        if (!pos) throw new Error(`Chức vụ không tồn tại: ${payload.position}`);
        positionId = pos.id;
      } else {
        positionId = null;
      }
      updateUsersData.position = payload.position;
      updateEmployeesData.positionId = positionId;
    }

    let managerEmployeeId = undefined;
    if (payload.managerId !== undefined) {
      if (payload.managerId) {
        const [mgr] = await tx.select({ id: employees.id }).from(employees).where(eq(employees.userId, payload.managerId));
        if (mgr) managerEmployeeId = mgr.id;
      } else {
        managerEmployeeId = null;
      }
      updateUsersData.managerId = payload.managerId;
      updateEmployeesData.managerId = managerEmployeeId;
    }

    if (payload.name !== undefined) {
      updateUsersData.name = payload.name;
      updateEmployeesData.fullName = payload.name;
    }
    if (payload.phone !== undefined) updateUsersData.phone = payload.phone;
    if (payload.email !== undefined) updateUsersData.email = payload.email;
    if (payload.birthDate !== undefined) updateUsersData.birthDate = payload.birthDate;
    if (payload.employmentType !== undefined) updateUsersData.employmentType = payload.employmentType;
    if (payload.joinDate !== undefined) updateUsersData.joinDate = payload.joinDate;
    if (payload.note !== undefined) updateUsersData.note = payload.note;
    if (payload.role !== undefined) updateUsersData.role = payload.role;
    if (payload.officialSalary !== undefined) updateUsersData.officialSalary = payload.officialSalary;

    if (payload.password) {
      updateUsersData.password = await bcrypt.hash(payload.password, 10);
    }

    if (isManualInput) {
      // MANUAL_INPUT PROMOTION FLOW
      const finalDepartment = payload.department ?? oldUser.department;
      const finalPosition = payload.position ?? oldUser.position;
      const finalEmploymentType = payload.employmentType ?? oldUser.employmentType ?? 'FULL_TIME';
      const finalJoinDate = payload.joinDate ?? oldUser.joinDate ?? new Date().toISOString().split('T')[0];
      const finalSalary = payload.officialSalary ?? oldUser.officialSalary ?? 0;
      const finalEmployeeCode = payload.employeeCode ?? oldUser.employeeCode;
      const finalName = payload.name ?? oldUser.name;

      if (!finalEmployeeCode || !finalDepartment || !finalEmploymentType) {
        throw new Error('Chưa đủ thông tin bắt buộc để kích hoạt tài khoản MANUAL_INPUT vào HR Core. Cần: mã nhân viên, phòng ban.');
      }

      // Department ID must have been resolved
      let finalDepartmentId = departmentId;
      if (!finalDepartmentId) {
        const [dept] = await tx.select({ id: departments.id }).from(departments).where(eq(departments.name, finalDepartment));
        if (!dept) throw new Error(`Phòng ban không tồn tại: ${finalDepartment}`);
        finalDepartmentId = dept.id;
      }
      
      let finalPositionId = positionId;
      if (!finalPositionId && finalPosition) {
        const [pos] = await tx.select({ id: positions.id }).from(positions).where(eq(positions.name, finalPosition));
        if (pos) finalPositionId = pos.id;
      }

      updateUsersData.employeeCode = finalEmployeeCode;

      // Update Users
      if (Object.keys(updateUsersData).length > 1) {
        await tx.update(users).set(updateUsersData).where(eq(users.id, userId));
      }

      // Insert HR Core Tables
      const [newEmployee] = await tx.insert(employees).values({
        employeeCode: finalEmployeeCode,
        userId: userId,
        fullName: finalName,
        departmentId: finalDepartmentId,
        positionId: finalPositionId || null,
        managerId: managerEmployeeId || null, // Will be null if manager not found, which is ok
        employmentStatus: oldUser.employeeStatus === 'TERMINATED' ? 'TERMINATED' : 'ACTIVE',
      }).returning({ id: employees.id });

      await tx.insert(employmentContracts).values({
        employeeId: newEmployee.id,
        contractType: finalEmploymentType,
        status: 'ACTIVE',
        startDate: finalJoinDate,
      });

      await tx.insert(salaryProfiles).values({
        employeeId: newEmployee.id,
        baseSalary: finalSalary,
        effectiveFrom: finalJoinDate,
        status: 'ACTIVE',
      });

    } else {
      // STANDARD UPDATE FLOW
      if (Object.keys(updateUsersData).length > 1) {
        await tx.update(users).set(updateUsersData).where(eq(users.id, userId));
      }
      if (Object.keys(updateEmployeesData).length > 1) {
        await tx.update(employees).set(updateEmployeesData).where(eq(employees.id, oldEmployee.id));
      }

      // Salary Check
      if (payload.officialSalary !== undefined && payload.officialSalary !== oldUser.officialSalary) {
        const today = new Date().toISOString().split('T')[0];
        
        await tx.update(salaryProfiles)
          .set({ effectiveTo: today, status: 'ARCHIVED' })
          .where(and(
            eq(salaryProfiles.employeeId, oldEmployee.id),
            eq(salaryProfiles.status, 'ACTIVE')
          ));
        
        await tx.insert(salaryProfiles).values({
          employeeId: oldEmployee.id,
          baseSalary: payload.officialSalary,
          effectiveFrom: today,
          status: 'ACTIVE'
        });
      }
    }

    try {
      await writeHrAuditLog({
        action: isManualInput ? 'EMPLOYEE_PROMOTED' : 'EMPLOYEE_UPDATED',
        entityType: 'user',
        entityId: userId,
        actorId: payload.actorId,
        actorName: payload.actorName,
        oldValue: { ...oldUser, password: '[REDACTED]' },
        newValue: { ...updateUsersData, password: payload.password ? '[REDACTED]' : undefined },
        ipAddress: payload.ipAddress
      });
    } catch (e) {}

    return { id: userId };
  });
}

// --- TERMINATE / STATUS CHANGE ---

export interface StatusChangePayload {
  active: boolean;
  employeeStatus: string; 
  actorId: number;
  actorName: string;
  ipAddress: string;
}

export async function changeEmployeeStatusTransaction(userId: number, payload: StatusChangePayload) {
  return await db.transaction(async (tx) => {
    const [oldUser] = await tx.select().from(users).where(eq(users.id, userId));
    if (!oldUser) throw new Error('Không tìm thấy nhân viên');

    const [oldEmployee] = await tx.select().from(employees).where(eq(employees.userId, userId));
    
    await tx.update(users).set({ 
      active: payload.active, 
      employeeStatus: payload.employeeStatus,
      updatedAt: new Date()
    }).where(eq(users.id, userId));

    if (oldEmployee) {
      await tx.update(employees).set({ 
        employmentStatus: payload.employeeStatus === 'TERMINATED' ? 'TERMINATED' : 'ACTIVE',
        updatedAt: new Date()
      }).where(eq(employees.id, oldEmployee.id));

      if (payload.employeeStatus === 'TERMINATED') {
        const today = new Date().toISOString().split('T')[0];
        await tx.update(employmentContracts)
          .set({ endDate: today })
          .where(and(
            eq(employmentContracts.employeeId, oldEmployee.id),
            eq(employmentContracts.status, 'ACTIVE')
          ));
        
        await tx.update(salaryProfiles)
          .set({ effectiveTo: today, status: 'ARCHIVED' })
          .where(and(
            eq(salaryProfiles.employeeId, oldEmployee.id),
            eq(salaryProfiles.status, 'ACTIVE')
          ));
      }
    }

    try {
      await writeHrAuditLog({
        action: 'EMPLOYEE_STATUS_CHANGED',
        entityType: 'user',
        entityId: userId,
        actorId: payload.actorId,
        actorName: payload.actorName,
        oldValue: { active: oldUser.active, employeeStatus: oldUser.employeeStatus },
        newValue: { active: payload.active, employeeStatus: payload.employeeStatus },
        ipAddress: payload.ipAddress
      });
    } catch (e) {}

    return { success: true };
  });
}
