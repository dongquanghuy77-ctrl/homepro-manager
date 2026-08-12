import { DbPermissionRepository } from './repository';
import { SessionPayload } from '../session';

const repo = new DbPermissionRepository();

export async function hasPermissionCode(role: string, permissionCode: string): Promise<boolean> {
  const scopes = await repo.getAllowedScopes(role, permissionCode as any);
  return scopes.length > 0;
}

export async function canReadEmployee(session: SessionPayload, targetId: number, targetDepartmentId: number | null): Promise<boolean> {
  if (await hasPermissionCode(session.role, 'employee.read.all')) return true;
  if (await hasPermissionCode(session.role, 'payroll.read.all')) return true; // Implicit for ACCOUNTANT
  if (targetDepartmentId !== null && session.departmentId === targetDepartmentId) {
    if (await hasPermissionCode(session.role, 'employee.read.department')) return true;
  }
  if (session.id === targetId) {
    if (await hasPermissionCode(session.role, 'employee.read.self')) return true;
  }
  return false;
}

export async function getEmployeeReadScope(session: SessionPayload): Promise<'ALL' | 'DEPARTMENT' | 'SELF' | 'NONE'> {
  if (await hasPermissionCode(session.role, 'employee.read.all')) return 'ALL';
  if (await hasPermissionCode(session.role, 'payroll.read.all')) return 'ALL';
  if (await hasPermissionCode(session.role, 'employee.read.department')) return 'DEPARTMENT';
  if (await hasPermissionCode(session.role, 'employee.read.self')) return 'SELF';
  return 'NONE';
}

export async function canWriteEmployee(session: SessionPayload, targetId: number, targetDepartmentId: number | null): Promise<boolean> {
  if (await hasPermissionCode(session.role, 'employee.write.all')) return true;
  // If we ever add department/self write, handle here
  return false;
}

export async function canReadAttendance(session: SessionPayload, targetId: number, targetDepartmentId: number | null): Promise<boolean> {
  if (await hasPermissionCode(session.role, 'attendance.read.all')) return true;
  if (targetDepartmentId !== null && session.departmentId === targetDepartmentId) {
    if (await hasPermissionCode(session.role, 'attendance.read.department')) return true;
  }
  if (session.id === targetId) {
    if (await hasPermissionCode(session.role, 'attendance.read.self')) return true;
  }
  return false;
}

export async function getAttendanceReadScope(session: SessionPayload): Promise<'ALL' | 'DEPARTMENT' | 'SELF' | 'NONE'> {
  if (await hasPermissionCode(session.role, 'attendance.read.all')) return 'ALL';
  if (await hasPermissionCode(session.role, 'attendance.read.department')) return 'DEPARTMENT';
  if (await hasPermissionCode(session.role, 'attendance.read.self')) return 'SELF';
  return 'NONE';
}

export async function canWriteAttendance(session: SessionPayload, targetId: number, targetDepartmentId: number | null): Promise<boolean> {
  if (await hasPermissionCode(session.role, 'attendance.write.all')) return true;
  return false;
}

export async function getAttendanceApprovalLevel(session: SessionPayload): Promise<2 | 1 | 0> {
  if (await hasPermissionCode(session.role, 'attendance.write.all')) return 2;
  if (await hasPermissionCode(session.role, 'attendance.read.department')) return 1;
  return 0;
}

export async function canWriteLeave(session: SessionPayload, targetId: number, targetDepartmentId: number | null): Promise<boolean> {
  if (await hasPermissionCode(session.role, 'leave.write.all')) return true;
  if (targetDepartmentId !== null && session.departmentId === targetDepartmentId) {
    if (await hasPermissionCode(session.role, 'leave.write.department')) return true;
  }
  return false;
}

export async function getLeaveApprovalLevel(session: SessionPayload): Promise<2 | 1 | 0> {
  if (await hasPermissionCode(session.role, 'leave.approve.all')) return 2;
  if (await hasPermissionCode(session.role, 'leave.approve.department')) return 1;
  return 0;
}

export async function canReadLeave(session: SessionPayload, targetId: number, targetDepartmentId: number | null): Promise<boolean> {
  if (await hasPermissionCode(session.role, 'leave.read.all')) return true;
  if (targetDepartmentId !== null && session.departmentId === targetDepartmentId) {
    if (await hasPermissionCode(session.role, 'leave.read.department')) return true;
  }
  if (session.id === targetId) {
    if (await hasPermissionCode(session.role, 'leave.read.self')) return true;
  }
  return false;
}

export async function canApproveLeave(session: SessionPayload, targetDepartmentId: number | null): Promise<boolean> {
  if (await hasPermissionCode(session.role, 'leave.approve.all')) return true;
  if (targetDepartmentId !== null && session.departmentId === targetDepartmentId) {
    if (await hasPermissionCode(session.role, 'leave.approve.department')) return true;
  }
  return false;
}

export async function canReadPayroll(session: SessionPayload, targetId: number, targetDepartmentId: number | null): Promise<boolean> {
  if (await hasPermissionCode(session.role, 'payroll.read.all')) return true;
  if (targetDepartmentId !== null && session.departmentId === targetDepartmentId) {
    if (await hasPermissionCode(session.role, 'payroll.read.department')) return true;
  }
  if (session.id === targetId) {
    if (await hasPermissionCode(session.role, 'payroll.read.self')) return true;
  }
  return false;
}

export async function getPayrollReadScope(session: SessionPayload): Promise<'ALL' | 'DEPARTMENT' | 'SELF' | 'NONE'> {
  if (await hasPermissionCode(session.role, 'payroll.read.all')) return 'ALL';
  if (await hasPermissionCode(session.role, 'payroll.read.department')) return 'DEPARTMENT';
  if (await hasPermissionCode(session.role, 'payroll.read.self')) return 'SELF';
  
  // Implicit defaults if DB migration is not fully complete for basic roles
  if (session.role === 'WORKER') return 'SELF';
  if (session.role === 'SUPERVISOR') return 'SELF';
  
  return 'NONE';
}
