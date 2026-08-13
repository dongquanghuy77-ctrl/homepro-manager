import { db } from '@/db';
import { eq, sql } from 'drizzle-orm';
import {
  projectCosts,
  projectSchedules,
  leads,
  quotes,
  quoteItems,
  salesOrders,
  inspections,
  handovers,
  deliveryNotes,
  deliveryNoteItems
} from '@/db/schema';

export class ERPService {
  
  // ==========================================
  // P6: PROJECT COSTING & SCHEDULING
  // ==========================================
  static async recordProjectCost(data: any) {
    const [cost] = await db.insert(projectCosts).values({
      projectId: data.projectId,
      costCategory: data.costCategory,
      amount: data.amount,
      referenceType: data.referenceType,
      referenceId: data.referenceId,
      notes: data.notes
    }).returning();
    return cost;
  }

  // ==========================================
  // P7: SALES & CRM CORE
  // ==========================================
  static async createLead(data: any) {
    const [lead] = await db.insert(leads).values({
      name: data.name,
      phone: data.phone,
      email: data.email,
      source: data.source,
      assignedTo: data.userId
    }).returning();
    return lead;
  }

  static async createSalesOrder(data: any) {
    const [so] = await db.insert(salesOrders).values({
      orderNumber: data.orderNumber,
      customerId: data.customerId,
      projectId: data.projectId,
      totalAmount: data.totalAmount
    }).returning();
    return so;
  }

  // ==========================================
  // P8: QUALITY CONTROL & ACCEPTANCE
  // ==========================================
  static async recordInspection(data: any) {
    const [insp] = await db.insert(inspections).values({
      referenceType: data.referenceType,
      referenceId: data.referenceId,
      inspectorId: data.inspectorId,
      status: data.status,
      notes: data.notes
    }).returning();
    return insp;
  }

  // ==========================================
  // P9: ADVANCED MRP & LOGISTICS
  // ==========================================
  static async createDeliveryNote(data: any) {
    return await db.transaction(async (tx) => {
      const [dn] = await tx.insert(deliveryNotes).values({
        deliveryNumber: data.deliveryNumber,
        salesOrderId: data.salesOrderId,
        projectId: data.projectId,
        driverId: data.driverId,
        vehicleDetails: data.vehicleDetails
      }).returning();

      if (data.items && data.items.length > 0) {
        const items = data.items.map((i: any) => ({ ...i, deliveryNoteId: dn.id }));
        await tx.insert(deliveryNoteItems).values(items);
      }
      return dn;
    });
  }

}
