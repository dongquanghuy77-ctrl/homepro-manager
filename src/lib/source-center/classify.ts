export function classifyDocument(fileName: string, mimeType?: string): { category: string; confidence: number; routedTo: string } {
  const name = fileName.toLowerCase();
  const ext = name.split('.').pop() || '';
  
  if (ext === 'skp' || ext === 'skb') return { category: 'DESIGN_SKETCHUP', confidence: 0.99, routedTo: 'engineering/designs' };
  if (ext === 'xlsx' || ext === 'xls') {
    if (name.includes('boq') || name.includes('kl') || name.includes('khoi luong') || name.includes('bom')) return { category: 'BOQ_EXCEL', confidence: 0.95, routedTo: 'crm/boq' };
    if (name.includes('vat tu') || name.includes('vật tư') || name.includes('material')) return { category: 'BOQ_EXCEL', confidence: 0.90, routedTo: 'inventory/materials' };
    return { category: 'BOQ_EXCEL', confidence: 0.70, routedTo: 'crm/boq' };
  }
  if (ext === 'pdf') {
    if (name.includes('tknt') || name.includes('thiet ke') || name.includes('nt-')) return { category: 'DESIGN_PDF', confidence: 0.92, routedTo: 'engineering/designs' };
    if (name.includes('boq') || name.includes('kl') || name.includes('khoi luong')) return { category: 'BOQ_PDF', confidence: 0.93, routedTo: 'crm/boq' };
    if (name.includes('hop dong') || name.includes('contract')) return { category: 'CONTRACT', confidence: 0.95, routedTo: 'crm/contracts' };
    return { category: 'DESIGN_PDF', confidence: 0.60, routedTo: 'engineering/designs' };
  }
  if (['jpg','jpeg','png','webp'].includes(ext)) {
    if (name.includes('phieu nhap') || name.includes('phi\u1ebfu nh\u1eadp') || name.includes('chung tu')) return { category: 'PROCUREMENT_DOCUMENT', confidence: 0.88, routedTo: 'purchasing/requests' };
    if (name.includes('qc') || name.includes('kiem tra')) return { category: 'QC_EVIDENCE', confidence: 0.85, routedTo: 'qc' };
    if (name.includes('kc') || name.includes('kich thuoc') || name.includes('khảo')) return { category: 'SURVEY_IMAGE', confidence: 0.85, routedTo: 'engineering/surveys' };
    if (name.includes('vat lieu') || name.includes('vật liệu') || name.includes('material')) return { category: 'MATERIAL_IMAGE', confidence: 0.85, routedTo: 'inventory/materials' };
    return { category: 'SURVEY_IMAGE', confidence: 0.55, routedTo: 'engineering/surveys' };
  }
  if (ext === 'zip') return { category: 'OTHER', confidence: 0.50, routedTo: 'source-center' };
  return { category: 'OTHER', confidence: 0.30, routedTo: 'source-center' };
}
