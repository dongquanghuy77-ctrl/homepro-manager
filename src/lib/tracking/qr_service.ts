import { db } from '@/db';
import { qrCodes, productionOrders, workOrders, materials, inventoryBalances, qcIssues, jobCards } from '@/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import * as crypto from 'crypto';

export class QrService {
  /**
   * Generates a new unique QR Code for any entity in the system.
   */
  static async generateQr(data: {
    entityType: string;
    entityId: number;
    createdBy?: number;
    metadata?: any;
  }) {
    // Check if QR already exists for this exact entity to avoid duplicates?
    // It's possible to have multiple QRs (e.g., printing replacements), but usually 1:1.
    // Let's generate a unique value
    const uniqueHash = crypto.randomBytes(6).toString('hex').toUpperCase();
    const qrValue = `QR-${data.entityType}-${data.entityId}-${uniqueHash}`;

    const [qr] = await db.insert(qrCodes).values({
      entityType: data.entityType,
      entityId: data.entityId,
      qrValue: qrValue,
      status: 'ACTIVE',
      createdBy: data.createdBy,
      metadata: data.metadata || {}
    }).returning();

    return qr;
  }

  /**
   * Scans a QR value and resolves the entity it points to.
   */
  static async resolveQr(qrValue: string) {
    const qrs = await db.select().from(qrCodes).where(eq(qrCodes.qrValue, qrValue));
    const qr = qrs[0];
    if (!qr) throw new Error('QR Code not found');
    if (qr.status !== 'ACTIVE') throw new Error(`QR Code is ${qr.status}`);

    let entityData = null;

    // Resolve specific entity details
    switch (qr.entityType) {
      case 'PRODUCT':
      case 'MATERIAL':
        const mats = await db.select().from(materials).where(eq(materials.id, qr.entityId));
        entityData = mats[0];
        break;
      case 'PRODUCTION_ORDER':
        const pos = await db.select().from(productionOrders).where(eq(productionOrders.id, qr.entityId));
        entityData = pos[0];
        break;
      case 'WORK_ORDER':
        const wos = await db.select().from(workOrders).where(eq(workOrders.id, qr.entityId));
        entityData = wos[0];
        break;
      case 'JOB_CARD':
        const jcs = await db.select().from(jobCards).where(eq(jobCards.id, qr.entityId));
        entityData = jcs[0];
        break;
      case 'QC_ISSUE':
        const qcs = await db.select().from(qcIssues).where(eq(qcIssues.id, qr.entityId));
        entityData = qcs[0];
        break;
      // Expand as needed
    }

    return {
      qr,
      entity: entityData
    };
  }

  /**
   * Traces the lineage of a given QR (e.g., Finished Good -> PO -> Material)
   */
  static async traceOrigins(qrValue: string) {
    const { qr, entity } = await this.resolveQr(qrValue);

    const lineage: any = {
      target: { qr, entity },
      parents: []
    };

    if (qr.entityType === 'PRODUCTION_ORDER') {
      // Find what it consumes?
      // A PO consumes materials via material_consumptions
      // But we can trace upwards to BOQ/Project.
    } else if (qr.entityType === 'WORK_ORDER') {
      // Find PO
      const po = await db.select().from(productionOrders).where(eq(productionOrders.id, (entity as any).productionOrderId));
      lineage.parents.push({ type: 'PRODUCTION_ORDER', entity: po[0] });
    } else if (qr.entityType === 'QC_ISSUE') {
      // Find PO or WO
      if ((entity as any).productionOrderId) {
        const po = await db.select().from(productionOrders).where(eq(productionOrders.id, (entity as any).productionOrderId));
        lineage.parents.push({ type: 'PRODUCTION_ORDER', entity: po[0] });
      }
    }

    return lineage;
  }

  static async deactivateQr(qrValue: string) {
    const [updated] = await db.update(qrCodes)
      .set({ status: 'DEACTIVATED' })
      .where(eq(qrCodes.qrValue, qrValue))
      .returning();
    return updated;
  }
}
