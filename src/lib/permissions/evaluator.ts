// src/lib/permissions/evaluator.ts
import { Scope } from './types';

/**
 * Pure function to evaluate if an accessor can access a resource based on granted scopes.
 * It does NOT access the database.
 */
export function evaluateScopeAccess(
  grantedScopes: Scope[],
  accessorId?: number,
  accessorDepartmentId?: number,
  resourceOwnerId?: number,
  resourceDepartmentId?: number
): boolean {
  if (grantedScopes.includes('SYSTEM')) {
    return true;
  }
  
  if (grantedScopes.includes('COMPANY')) {
    return true;
  }
  
  if (grantedScopes.includes('DEPARTMENT')) {
    // Both must be defined and match
    if (accessorDepartmentId !== undefined && resourceDepartmentId !== undefined && accessorDepartmentId === resourceDepartmentId) {
      return true;
    }
  }
  
  if (grantedScopes.includes('SELF')) {
    // Both must be defined and match
    if (accessorId !== undefined && resourceOwnerId !== undefined && accessorId === resourceOwnerId) {
      return true;
    }
  }
  
  return false;
}

/**
 * For unit testing the business matrix directly without DB.
 * This represents the pure business rule mapping for Payroll.
 */
export function getPayrollGrantedScopes(role: string, permission: string): Scope[] {
  switch (role) {
    case 'WORKER':
      if (permission === 'PAYROLL_VIEW') return ['SELF'];
      return [];
    case 'MANAGER':
      if (permission === 'PAYROLL_VIEW') return ['DEPARTMENT', 'SELF'];
      return [];
    case 'HR':
      if (permission === 'PAYROLL_VIEW') return ['COMPANY'];
      if (permission === 'PAYROLL_CALCULATE') return ['COMPANY'];
      return [];
    case 'DIRECTOR':
      if (permission === 'PAYROLL_VIEW') return ['COMPANY'];
      if (permission === 'PAYROLL_CALCULATE') return ['COMPANY'];
      if (permission === 'PAYROLL_APPROVE') return ['COMPANY'];
      if (permission === 'PAYROLL_PUBLISH') return ['COMPANY'];
      return [];
    case 'ADMIN':
      return ['SYSTEM', 'COMPANY']; // Admin has all by default in this matrix
    default:
      return [];
  }
}

/**
 * Pure evaluation function combining role matrix and scope evaluation for unit testing.
 */
export function pureEvaluatePermission(
  role: string,
  permission: string,
  accessorId?: number,
  accessorDepartmentId?: number,
  resourceOwnerId?: number,
  resourceDepartmentId?: number
): boolean {
  const scopes = getPayrollGrantedScopes(role, permission);
  if (scopes.length === 0) return false;
  
  return evaluateScopeAccess(
    scopes,
    accessorId,
    accessorDepartmentId,
    resourceOwnerId,
    resourceDepartmentId
  );
}
