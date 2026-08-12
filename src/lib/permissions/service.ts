// src/lib/permissions/service.ts
import { PermissionEvaluationContext, AuthorizationService, PermissionRepository } from './interfaces';
import { evaluateScopeAccess } from './evaluator';

export class DefaultAuthorizationService implements AuthorizationService {
  constructor(private repository: PermissionRepository) {}

  async evaluate(context: PermissionEvaluationContext): Promise<boolean> {
    const isReady = await this.repository.isReady();
    if (!isReady) {
      throw new Error('UAT_DATABASE_REQUIRED: Permission database tables are not available.');
    }

    const grantedScopes = await this.repository.getAllowedScopes(context.role, context.permission);
    
    // If no scopes granted for this role-permission pair, deny
    if (grantedScopes.length === 0) {
      return false;
    }

    return evaluateScopeAccess(
      grantedScopes,
      context.accessorId,
      context.accessorDepartmentId,
      context.resourceOwnerId,
      context.resourceDepartmentId
    );
  }
}
