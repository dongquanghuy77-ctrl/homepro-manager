// scripts/test_p095_permissions.ts
import { pureEvaluatePermission } from '../src/lib/permissions/evaluator';

let total = 0;
let passed = 0;

function assertAccess(role: string, permission: string, expected: boolean, name: string, context: any = {}) {
  total++;
  const result = pureEvaluatePermission(
    role,
    permission,
    context.accessorId,
    context.accessorDepartmentId,
    context.resourceOwnerId,
    context.resourceDepartmentId
  );
  
  if (result === expected) {
    console.log(`[PASS] ${name}`);
    passed++;
  } else {
    console.error(`[FAIL] ${name} | Expected ${expected}, got ${result}`);
  }
}

console.log("=== RUNNING PERMISSION EVALUATOR TESTS ===\n");

// WORKER
assertAccess('WORKER', 'PAYROLL_VIEW', true, 'WORKER: PAYROLL_VIEW SELF = ALLOW', { accessorId: 1, resourceOwnerId: 1 });
assertAccess('WORKER', 'PAYROLL_VIEW', false, 'WORKER: PAYROLL_VIEW OTHER = DENY', { accessorId: 1, resourceOwnerId: 2 });
assertAccess('WORKER', 'PAYROLL_CALCULATE', false, 'WORKER: PAYROLL_CALCULATE = DENY');

// MANAGER
assertAccess('MANAGER', 'PAYROLL_VIEW', true, 'MANAGER: PAYROLL_VIEW OWN_DEPARTMENT = ALLOW', { accessorDepartmentId: 10, resourceDepartmentId: 10 });
assertAccess('MANAGER', 'PAYROLL_VIEW', false, 'MANAGER: PAYROLL_VIEW OTHER_DEPARTMENT = DENY', { accessorDepartmentId: 10, resourceDepartmentId: 11 });
assertAccess('MANAGER', 'PAYROLL_CALCULATE', false, 'MANAGER: PAYROLL_CALCULATE = DENY');

// HR
assertAccess('HR', 'PAYROLL_VIEW', true, 'HR: PAYROLL_VIEW = ALLOW');
assertAccess('HR', 'PAYROLL_CALCULATE', true, 'HR: PAYROLL_CALCULATE = ALLOW');
assertAccess('HR', 'PAYROLL_APPROVE', false, 'HR: PAYROLL_APPROVE = DENY');
assertAccess('HR', 'PAYROLL_PUBLISH', false, 'HR: PAYROLL_PUBLISH = DENY');
assertAccess('HR', 'PAYROLL_CONFIG', false, 'HR: PAYROLL_CONFIG = DENY');

// DIRECTOR
assertAccess('DIRECTOR', 'PAYROLL_VIEW', true, 'DIRECTOR: PAYROLL_VIEW = ALLOW');
assertAccess('DIRECTOR', 'PAYROLL_CALCULATE', true, 'DIRECTOR: PAYROLL_CALCULATE = ALLOW');
assertAccess('DIRECTOR', 'PAYROLL_APPROVE', true, 'DIRECTOR: PAYROLL_APPROVE = ALLOW');
assertAccess('DIRECTOR', 'PAYROLL_PUBLISH', true, 'DIRECTOR: PAYROLL_PUBLISH = ALLOW');
assertAccess('DIRECTOR', 'PAYROLL_CONFIG', false, 'DIRECTOR: PAYROLL_CONFIG = DENY');

// ADMIN
assertAccess('ADMIN', 'PAYROLL_VIEW', true, 'ADMIN: ALL = ALLOW (VIEW)');
assertAccess('ADMIN', 'PAYROLL_CONFIG', true, 'ADMIN: ALL = ALLOW (CONFIG)');

console.log(`\n=== RESULTS: ${passed}/${total} PASS ===`);
if (passed !== total) {
  process.exit(1);
}
