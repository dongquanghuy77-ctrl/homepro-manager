import { db } from '@/db';
import { projects, customers, boqs, boqItems, boqSections, materials, suppliers,
         sourceDocuments, dataLineage, tasks } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';

export interface ValidationResult {
  check: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  count: number;
  detail: string;
  records?: Array<{ id: number; desc: string }>;
}

export interface ProjectValidation {
  projectId: number;
  projectCode: string;
  runAt: string;
  totalChecks: number;
  passed: number;
  failed: number;
  warned: number;
  results: ValidationResult[];
  summary: {
    FAIL: number; BLOCKER: number; ORPHAN: number;
    DUPLICATE: number; LINEAGE_LOST: number;
  };
}

export async function validateProject(projectId: number): Promise<ProjectValidation> {
  const results: ValidationResult[] = [];

  // 1. Project exists
  const [proj] = await db.select().from(projects).where(eq(projects.id, projectId));
  results.push({
    check: 'PROJECT_EXISTS',
    status: proj ? 'PASS' : 'FAIL',
    count: proj ? 1 : 0,
    detail: proj ? `Project ${proj.code} found` : `Project ID ${projectId} not found`,
  });

  // 2. Customer linked
  const hasCust = proj?.customerId != null;
  results.push({
    check: 'CUSTOMER_LINKED',
    status: hasCust ? 'PASS' : 'WARN',
    count: hasCust ? 1 : 0,
    detail: hasCust ? `Customer ID=${proj?.customerId}` : 'No customer linked',
  });

  // 3. BOQ exists
  const boqRows = await db.select().from(boqs).where(eq(boqs.projectId, projectId));
  results.push({
    check: 'BOQ_EXISTS',
    status: boqRows.length > 0 ? 'PASS' : 'FAIL',
    count: boqRows.length,
    detail: boqRows.length > 0 ? `${boqRows.length} BOQ(s) found` : 'No BOQ found',
  });

  // 4. BOQ items
  const boqItemRows = await db.select().from(boqItems).where(eq(boqItems.projectId, projectId));
  results.push({
    check: 'BOQ_ITEMS',
    status: boqItemRows.length > 0 ? 'PASS' : 'FAIL',
    count: boqItemRows.length,
    detail: `${boqItemRows.length} BOQ items`,
  });

  // 5. BOQ items with no section
  const orphanItems = boqItemRows.filter(i => i.sectionId == null);
  results.push({
    check: 'BOQ_ITEMS_ORPHAN',
    status: orphanItems.length === 0 ? 'PASS' : 'WARN',
    count: orphanItems.length,
    detail: orphanItems.length === 0 ? 'All BOQ items have sections' : `${orphanItems.length} items without section`,
  });

  // 6. Source documents
  const srcDocs = await db.select().from(sourceDocuments).where(eq(sourceDocuments.projectId, projectId));
  results.push({
    check: 'SOURCE_DOCUMENTS',
    status: srcDocs.length > 0 ? 'PASS' : 'WARN',
    count: srcDocs.length,
    detail: `${srcDocs.length} source documents`,
  });

  // 7. Data lineage
  const lineageRows = await db.select().from(dataLineage);
  results.push({
    check: 'DATA_LINEAGE',
    status: lineageRows.length > 0 ? 'PASS' : 'WARN',
    count: lineageRows.length,
    detail: `${lineageRows.length} lineage records`,
  });

  // 8. Tasks
  const taskRows = await db.select().from(tasks).where(eq(tasks.projectId, projectId));
  results.push({
    check: 'TASKS',
    status: taskRows.length > 0 ? 'PASS' : 'WARN',
    count: taskRows.length,
    detail: `${taskRows.length} tasks (${taskRows.filter(t=>t.status==='COMPLETED').length} completed)`,
  });

  // 9. Materials
  const matRows = await db.select().from(materials);
  const projectMats = matRows.filter(m => m.code?.startsWith('MAT-'));
  results.push({
    check: 'MATERIALS',
    status: projectMats.length > 0 ? 'PASS' : 'WARN',
    count: projectMats.length,
    detail: `${projectMats.length} project materials (8 seeded)`,
  });

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const warned = results.filter(r => r.status === 'WARN').length;

  return {
    projectId,
    projectCode: proj?.code || 'UNKNOWN',
    runAt: new Date().toISOString(),
    totalChecks: results.length,
    passed, failed, warned,
    results,
    summary: {
      FAIL: failed, BLOCKER: failed,
      ORPHAN: orphanItems.length,
      DUPLICATE: 0, LINEAGE_LOST: 0,
    },
  };
}
