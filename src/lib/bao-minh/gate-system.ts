export interface Gate {
  name: string;
  status: 'PASS' | 'LOCKED' | 'PENDING' | 'BLOCKED';
  blockedBy: string[];
  unlocksModules: string[];
  detail: string;
}

export function evaluateGates(ctx: {
  hasSources: boolean;
  hasBoq: boolean;
  hasMaterials: boolean;
  bdStatuses: Record<string, string>; // { 'BD-01': 'BLOCKED', 'BD-04': 'BLOCKED', ... }
  hasConfirmedProcurement: boolean;
}): Gate[] {
  const { hasSources, hasBoq, hasMaterials, bdStatuses, hasConfirmedProcurement } = ctx;
  
  return [
    {
      name: 'SOURCE_READY',
      status: hasSources ? 'PASS' : 'PENDING',
      blockedBy: [],
      unlocksModules: ['BOQ', 'LINEAGE'],
      detail: hasSources ? '8 source documents registered' : 'No source documents',
    },
    {
      name: 'BOQ_READY',
      status: hasBoq ? 'PASS' : 'PENDING',
      blockedBy: [],
      unlocksModules: ['MATERIAL_MATCHING', 'COST_ESTIMATE'],
      detail: hasBoq ? 'BOQ ID=23, 32 items, 7 sections' : 'No BOQ',
    },
    {
      name: 'MATERIAL_READY',
      status: hasMaterials ? 'PASS' : 'PENDING',
      blockedBy: [],
      unlocksModules: ['PURCHASE_REQUEST', 'BOM_MATCHING'],
      detail: hasMaterials ? '8 materials seeded (6 confirmed + 2 exception)' : 'No materials',
    },
    {
      name: 'MATERIAL_REGISTER_READY',
      status: bdStatuses['BD-01'] === 'BLOCKED' ? 'BLOCKED' : 'PENDING',
      blockedBy: ['BD-01'],
      unlocksModules: ['MATERIAL_CODE_ASSIGNMENT'],
      detail: 'BD-01: BANG MÃ VAN T15.xlsx = T9 data. Cannot assign material codes to T15 BOQ until resolved.',
    },
    {
      name: 'PROCUREMENT_READY',
      status: (bdStatuses['BD-06'] === 'APPROVED') ? 'PASS' : 'PENDING',
      blockedBy: ['BD-06'],
      unlocksModules: ['PURCHASE_ORDERS', 'GRN', 'INVENTORY'],
      detail: 'BD-06: 4 phiếu nhập vật tư pending confirmation. PRs can be created as DRAFT.',
    },
    {
      name: 'PRODUCTION_READY',
      status: bdStatuses['BD-04'] === 'BLOCKED' ? 'LOCKED' : 'PENDING',
      blockedBy: ['BD-04', 'BD-01'],
      unlocksModules: ['PRODUCTION_ORDER', 'WORK_ORDER', 'CNC', 'ASSEMBLY'],
      detail: 'BD-04: 4 HIGH SketchUp issues (MEP clearance, room dims, coordination, directive error). PRODUCTION LOCKED.',
    },
    {
      name: 'QC_READY',
      status: 'LOCKED',
      blockedBy: ['BD-04'],
      unlocksModules: ['QC_INSPECTION'],
      detail: 'QC blocked until production starts.',
    },
    {
      name: 'COST_READY',
      status: hasConfirmedProcurement ? 'PASS' : 'PENDING',
      blockedBy: [],
      unlocksModules: ['COST_REPORT'],
      detail: hasConfirmedProcurement ? 'Purchase data available for cost estimate' : 'Procurement pending',
    },
  ];
}
