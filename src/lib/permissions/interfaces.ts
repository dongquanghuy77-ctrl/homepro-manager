// src/lib/permissions/interfaces.ts
import { PermissionKey, Scope } from './types';
import { UserRole } from '@/db/schema'; // Ensure this matches UserRole definition

export interface PermissionEvaluationContext {
  role: UserRole | string; // Accept string for runtime safety/flexibility
  permission: PermissionKey;
  requestedScope: Scope;
  resourceOwnerId?: number;
  resourceDepartmentId?: number;
  accessorId?: number;
  accessorDepartmentId?: number;
}

export interface PermissionRepository {
  /** Retrieves allowed scopes for a specific role and permission from the database */
  getAllowedScopes(role: string, permission: PermissionKey): Promise<Scope[]>;
  /** Checks if the permission table is seeded/ready */
  isReady(): Promise<boolean>;
}

export interface AuthorizationService {
  /** Evaluates whether an accessor can perform an action on a resource */
  evaluate(context: PermissionEvaluationContext): Promise<boolean>;
}
