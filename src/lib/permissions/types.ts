// src/lib/permissions/types.ts

export type Resource = 'EMPLOYEE' | 'ATTENDANCE' | 'LEAVE' | 'PAYROLL' | 'USER' | 'ROLE' | 'SYSTEM';
export type Action = 'VIEW' | 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'CALCULATE' | 'PUBLISH' | 'EXPORT' | 'MANAGE' | 'CONFIG';

export type PermissionKey = string;

export type Scope = 'SELF' | 'DEPARTMENT' | 'COMPANY' | 'SYSTEM';

// Common Payroll Permissions (Constants)
export const PERMISSION_PAYROLL_VIEW: PermissionKey = 'payroll.view';
export const PERMISSION_PAYROLL_CREATE: PermissionKey = 'payroll.create';
export const PERMISSION_PAYROLL_EDIT: PermissionKey = 'payroll.edit';
export const PERMISSION_PAYROLL_APPROVE: PermissionKey = 'payroll.approve';
export const PERMISSION_PAYROLL_LOCK: PermissionKey = 'payroll.lock';
export const PERMISSION_PAYROLL_EXPORT: PermissionKey = 'payroll.export';
export const PERMISSION_PAYROLL_PUBLISH: PermissionKey = 'payroll.publish';
export const PERMISSION_PAYROLL_CONFIG: PermissionKey = 'payroll.config';
