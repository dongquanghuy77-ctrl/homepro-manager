export interface ReconciliationLine {
  id: string;
  source: string;
  target: string;
  sourceValue: string | number;
  targetValue: string | number;
  status: 'MATCH' | 'VARIANCE' | 'MISSING' | 'EXTRA' | 'CONFLICT' | 'UNRESOLVED';
  delta?: number | string;
  note: string;
}

export const BAO_MINH_RECONCILIATION: ReconciliationLine[] = [
  // KL ↔ BOQ
  { id:'REC-001', source:'KL', target:'BOQ', sourceValue:'82 items', targetValue:'32 seeded', status:'VARIANCE', delta:'50 items not seeded (CLIENT_SUPPLIED/NOT_EXECUTED)', note:'50 items are CLIENT_SUPPLIED or NOT_EXECUTED — excluded from scope' },
  // BOQ ↔ BOM
  { id:'REC-002', source:'BOQ B.I.1 Bàn LV NV', target:'BOM Assembly', sourceValue:'18 bộ', targetValue:'18 asm (BOM)', status:'MATCH', note:'Confirmed via BOM cross-ref' },
  { id:'REC-003', source:'BOQ B.I.2 Tủ di động', target:'BOM Assembly', sourceValue:'18 cái', targetValue:'18 asm (BOM)', status:'MATCH', note:'BOM confirmed' },
  // BOM ↔ Materials
  { id:'REC-004', source:'BOM HN-111G-17.5mm', target:'MAT-HN-111G-175', sourceValue:'62 tấm req', targetValue:'65 tấm PO (SOURCE-02)', status:'VARIANCE', delta:'+3 buffer', note:'Buffer stock accepted' },
  { id:'REC-005', source:'BOM HN-111G-10mm', target:'MAT-HN-111G-10', sourceValue:'25 tấm req', targetValue:'26 tấm PO', status:'VARIANCE', delta:'+1 buffer', note:'Buffer OK' },
  { id:'REC-006', source:'BOM BT-SC010MW-17.5', target:'MAT-BT-SC010MW-175', sourceValue:'65 tấm req', targetValue:'67 tấm PO (SOURCE-04)', status:'VARIANCE', delta:'+2 buffer', note:'Buffer OK' },
  { id:'REC-007', source:'BOM BT-SC010MW-10', target:'MAT-BT-SC010MW-10', sourceValue:'20 tấm req', targetValue:'21 tấm PO', status:'VARIANCE', delta:'+1 buffer', note:'Buffer OK' },
  { id:'REC-008', source:'BOM BT-200T-17.5', target:'MAT-BT-200T-175', sourceValue:'6 tấm req', targetValue:'6 tấm PO (SOURCE-04)', status:'MATCH', note:'Exact match' },
  { id:'REC-009', source:'BOM AC-9205S-17.5', target:'MAT-AC-9205S-175', sourceValue:'4 tấm req', targetValue:'4 tấm PO (SOURCE-03)', status:'MATCH', note:'Confirmed' },
  { id:'REC-010', source:'BOM THAN TRE-8mm', target:'MAT-THAN-TRE-8', sourceValue:'10 tấm req', targetValue:'10 tấm PO (SOURCE-01)', status:'CONFLICT', note:'CONFLICT-004: THAN TRE not in BOQ — which item uses it?' },
  { id:'REC-011', source:'BOM GỖ GHÉP THANH 30mm', target:'MAT-GO-GHEP-30', sourceValue:'1 tấm req', targetValue:'NONE in PO', status:'MISSING', note:'BD-05: No purchase document. 12 cut parts blocked.' },
  // Supplier ↔ Purchase docs
  { id:'REC-012', source:'SUP-HN SOURCE-02', target:'MAT-HN-111G-175/10', sourceValue:'65t+26t', targetValue:'BOM 62t+25t', status:'VARIANCE', delta:'+3t+1t buffer', note:'Confirmed delivery' },
  { id:'REC-013', source:'SUP-BT SOURCE-04', target:'MAT-BT-SC010MW-175/10/200T', sourceValue:'67t+21t+6t', targetValue:'BOM 65t+20t+6t', status:'VARIANCE', delta:'+2t+1t+0', note:'Confirmed delivery' },
  { id:'REC-014', source:'SUP-AC SOURCE-03', target:'MAT-AC-9205S-175', sourceValue:'4t', targetValue:'BOM 4t', status:'MATCH', note:'Confirmed' },
  // BANG MÃ VAN
  { id:'REC-015', source:'BANG MÃ VAN BMS T15', target:'BOQ T15 items', sourceValue:'Tầng 9 content', targetValue:'Tầng 15 BOQ', status:'CONFLICT', note:'BD-01 BLOCKED: T15.xlsx = T9 data. Quantities 4× larger. File not usable.' },
];
