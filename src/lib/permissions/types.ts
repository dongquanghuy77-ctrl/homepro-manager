// src/lib/permissions/types.ts

export type Resource = 'EMPLOYEE' | 'ATTENDANCE' | 'LEAVE' | 'PAYROLL' | 'USER' | 'ROLE' | 'SYSTEM';
export type Action = 'VIEW' | 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'CALCULATE' | 'PUBLISH' | 'EXPORT' | 'MANAGE' | 'CONFIG';

export type PermissionKey = string;

export type Scope = 'SELF' | 'DEPARTMENT' | 'COMPANY' | 'SYSTEM';

// Common Payroll Permissions (Constants)
export const PERMISSION_PAYROLL_VIEW: PermissionKey = 'PAYROLL_VIEW';
export const PERMISSION_PAYROLL_CALCULATE: PermissionKey = 'PAYROLL_CALCULATE';
export const PERMISSION_PAYROLL_APPROVE: PermissionKey = 'PAYROLL_APPROVE';
export const PERMISSION_PAYROLL_PUBLISH: PermissionKey = 'PAYROLL_PUBLISH';
export const PERMISSION_PAYROLL_CONFIG: PermissionKey = 'PAYROLL_CONFIG';
