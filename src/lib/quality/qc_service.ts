import { db } from '@/db';
import { qcInspections, qcIssues, qcNcrs, productionOrders, workOrders, routingSteps, qcControlPoints } from '@/db/schema';
import { eq, and, sql, desc, or } from 'drizzle-orm';
import { QrService } from '../tracking/qr_service';
import { BudgetService } from '../finance/budget_service';

export class QcService {
  /**
   * 1. CREATE INSPECTION
   */
  static async createInspection(data: {
    projectId?: number;
    productId?: number;
    productionOrderId?: number;
    workOrderId?: number;
    routingStepId?: number;
    controlPointId?: number;
    inspectorId?: number;
    result: 'PASS' | 'FAIL' | 'PASS_WITH_CONDITIONS' | 'PENDING';
    notes?: string;
    evidenceUrl?: string;
  }) {
    return await db.transaction(async (tx) => {
      const code = `INSP-${Date.now()}`;
      
      let finalProjectId = data.projectId;
      let finalProductId = data.productId;

      if (data.productionOrderId && (!finalProjectId || !finalProductId)) {
        const [po] = await tx.select().from(productionOrders).where(eq(productionOrders.id, data.productionOrderId));
        if (po) {
          finalProjectId = finalProjectId || po.projectId;
          finalProductId = finalProductId || po.productId;
        }
      }

      const [inspection] = await tx.insert(qcInspections).values({
        code,
        projectId: finalProjectId,
        productId: finalProductId,
        productionOrderId: data.productionOrderId,
        workOrderId: data.workOrderId,
        routingStepId: data.routingStepId,
        controlPointId: data.controlPointId,
        inspectorId: data.inspectorId,
        result: data.result,
        notes: data.notes,
        evidenceUrl: data.evidenceUrl
      }).returning();

      // Enforce Hard Gate: Update PO QC Status if applicable
      if (data.productionOrderId) {
        if (data.result === 'FAIL') {
          await tx.update(productionOrders)
            .set({ qcStatus: 'FAIL' })
            .where(eq(productionOrders.id, data.productionOrderId));
        } else if (data.result === 'PASS') {
          // Check if there are any unresolved issues for this PO
          const unresolvedIssues = await tx.select().from(qcIssues)
            .where(and(
              eq(qcIssues.productionOrderId, data.productionOrderId),
              or(eq(qcIssues.status, 'OPEN'), eq(qcIssues.status, 'REWORK'), eq(qcIssues.status, 'INVESTIGATING'))
            ));
          
          if (unresolvedIssues.length === 0) {
             await tx.update(productionOrders)
              .set({ qcStatus: 'PASS' })
              .where(eq(productionOrders.id, data.productionOrderId));
          }
        }
      }

      return inspection;
    });
  }

  /**
   * 1.5 CLOSE ISSUE
   */
  static async closeIssue(issueId: number) {
    return await db.transaction(async (tx) => {
      const [issue] = await tx.update(qcIssues)
        .set({ status: 'CLOSED', resolvedDate: new Date().toISOString(), updatedAt: new Date() })
        .where(eq(qcIssues.id, issueId))
        .returning();

      if (issue.productionOrderId) {
        // Re-evaluate PO QC status
        const unresolvedIssues = await tx.select().from(qcIssues)
          .where(and(
            eq(qcIssues.productionOrderId, issue.productionOrderId),
            or(eq(qcIssues.status, 'OPEN'), eq(qcIssues.status, 'REWORK'), eq(qcIssues.status, 'INVESTIGATING'))
          ));
        
        if (unresolvedIssues.length === 0) {
           await tx.update(productionOrders)
            .set({ qcStatus: 'PASS' })
            .where(eq(productionOrders.id, issue.productionOrderId));
        }
      }

      return issue;
    });
  }

  /**
   * 2. LOG DEFECT (from a Failed Inspection)
   */
  static async logDefect(inspectionId: number, data: {
    title: string;
    description: string;
    category?: string;
    severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    quantityAffected?: number;
    reportedBy?: string;
  }) {
    return await db.transaction(async (tx) => {
      const [inspection] = await tx.select().from(qcInspections).where(eq(qcInspections.id, inspectionId));
      if (!inspection) throw new Error("Inspection not found");

      const issueCode = `DEF-${Date.now()}`;

      const [issue] = await tx.insert(qcIssues).values({
        projectId: inspection.projectId!, // Assuming projectId is passed down
        productId: inspection.productId,
        productionOrderId: inspection.productionOrderId,
        workOrderId: inspection.workOrderId,
        inspectionId: inspection.id,
        code: issueCode,
        title: data.title,
        description: data.description,
        category: data.category,
        severity: data.severity || 'MEDIUM',
        status: 'OPEN',
        quantityAffected: data.quantityAffected || 0,
        reportedBy: data.reportedBy
      }).returning();

      return issue;
    });
  }

  /**
   * 3. RAISE NCR (Non-Conformance Report) for Root Cause Analysis
   */
  static async createNcr(issueId: number, data: {
    description: string;
    source: 'INSPECTION' | 'CUSTOMER_COMPLAINT' | 'INTERNAL_AUDIT';
    assigneeId?: number;
  }) {
    return await db.transaction(async (tx) => {
      const [issue] = await tx.select().from(qcIssues).where(eq(qcIssues.id, issueId));
      if (!issue) throw new Error("Defect not found");

      const ncrCode = `NCR-${Date.now()}`;

      const [ncr] = await tx.insert(qcNcrs).values({
        code: ncrCode,
        projectId: issue.projectId,
        issueId: issue.id,
        source: data.source,
        description: data.description,
        assigneeId: data.assigneeId,
        status: 'OPEN'
      }).returning();

      return ncr;
    });
  }

  /**
   * 4. COMPLETE RCA (Root Cause Analysis) & CORRECTIVE ACTION
   */
  static async submitNcrAction(ncrId: number, data: {
    rootCause: string;
    responsibility: string;
    correctiveAction: string;
    preventiveAction?: string;
  }) {
    const [updatedNcr] = await db.update(qcNcrs).set({
      rootCause: data.rootCause,
      responsibility: data.responsibility,
      correctiveAction: data.correctiveAction,
      preventiveAction: data.preventiveAction,
      status: 'ACTION_TAKEN',
      updatedAt: new Date()
    }).where(eq(qcNcrs.id, ncrId)).returning();

    return updatedNcr;
  }

  /**
   * 5. LOG REWORK COST (Quality Cost calculation)
   */
  static async logReworkCost(issueId: number, amount: number, type: 'MATERIAL' | 'LABOR' | 'OVERHEAD') {
    return await db.transaction(async (tx) => {
      const [issue] = await tx.select().from(qcIssues).where(eq(qcIssues.id, issueId));
      if (!issue) throw new Error("Issue not found");

      // We just map the rework cost as an actual cost against the project with a special QC note/category if needed.
      // Assuming BudgetService handles it correctly.
      await BudgetService.recordActualCost(issue.projectId, type, amount, 'QC_ISSUE', issue.id, tx);
      
      // Update issue logic to show it's being reworked
      await tx.update(qcIssues).set({ status: 'REWORK' }).where(eq(qcIssues.id, issueId));

      return true;
    });
  }
}
