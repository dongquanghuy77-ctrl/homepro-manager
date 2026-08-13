import { db } from '@/db';
import { eq, sql, and } from 'drizzle-orm';
import {
  suppliers,
  purchaseRequests,
  purchaseRequestItems,
  purchaseOrders,
  purchaseOrderItems,
  goodsReceipts,
  goodsReceiptItems,
  supplierInvoices,
  supplierInvoiceItems,
  accounts
} from '@/db/schema';
import { AccountingService } from '@/lib/accounting/services';

export class ProcurementService {
  
  // ==========================================
  // PURCHASE REQUESTS
  // ==========================================
  
  static async createPurchaseRequest(data: any) {
    return await db.transaction(async (tx) => {
      const [pr] = await tx.insert(purchaseRequests).values({
        requestNumber: data.requestNumber,
        requestDate: data.requestDate,
        requesterId: data.requesterId,
        departmentId: data.departmentId,
        projectId: data.projectId,
        reason: data.reason,
        status: 'DRAFT',
      }).returning();

      if (data.items && data.items.length > 0) {
        const prItems = data.items.map((i: any) => ({
          ...i,
          requestId: pr.id
        }));
        await tx.insert(purchaseRequestItems).values(prItems);
      }
      return pr;
    });
  }

  static async submitPurchaseRequest(id: number, userId: number) {
    return await db.update(purchaseRequests)
      .set({ status: 'SUBMITTED', submittedBy: userId, submittedAt: new Date() })
      .where(and(eq(purchaseRequests.id, id), eq(purchaseRequests.status, 'DRAFT')));
  }

  static async approvePurchaseRequest(id: number, userId: number) {
    return await db.update(purchaseRequests)
      .set({ status: 'APPROVED', approvedBy: userId, approvedAt: new Date() })
      .where(and(eq(purchaseRequests.id, id), eq(purchaseRequests.status, 'SUBMITTED')));
  }
  
  static async rejectPurchaseRequest(id: number, userId: number) {
    return await db.update(purchaseRequests)
      .set({ status: 'REJECTED', rejectedBy: userId, rejectedAt: new Date() })
      .where(and(eq(purchaseRequests.id, id), eq(purchaseRequests.status, 'SUBMITTED')));
  }

  // ==========================================
  // PURCHASE ORDERS
  // ==========================================
  
  static async createPurchaseOrder(data: any) {
    return await db.transaction(async (tx) => {
      // Validate PR is approved if linking
      if (data.requestId) {
        const prs = await tx.select().from(purchaseRequests).where(eq(purchaseRequests.id, data.requestId));
        if (prs.length === 0 || prs[0].status !== 'APPROVED') {
          throw new Error('Linked Purchase Request must be APPROVED');
        }
      }

      const [po] = await tx.insert(purchaseOrders).values({
        poNumber: data.poNumber,
        supplierId: data.supplierId,
        requestId: data.requestId,
        projectId: data.projectId,
        costCenterId: data.costCenterId,
        orderDate: data.orderDate,
        expectedDate: data.expectedDate,
        status: 'DRAFT',
        currency: data.currency || 'VND',
        subtotal: data.subtotal,
        tax: data.tax,
        total: data.total,
        notes: data.notes,
        createdBy: data.createdBy
      }).returning();

      if (data.items && data.items.length > 0) {
        const poItems = data.items.map((i: any) => ({
          ...i,
          poId: po.id
        }));
        await tx.insert(purchaseOrderItems).values(poItems);
      }
      return po;
    });
  }

  static async submitPurchaseOrder(id: number) {
    return await db.update(purchaseOrders)
      .set({ status: 'SUBMITTED' })
      .where(and(eq(purchaseOrders.id, id), eq(purchaseOrders.status, 'DRAFT')));
  }

  static async approvePurchaseOrder(id: number, userId: number) {
    return await db.update(purchaseOrders)
      .set({ status: 'APPROVED', approvedBy: userId, approvedAt: new Date() })
      .where(and(eq(purchaseOrders.id, id), eq(purchaseOrders.status, 'SUBMITTED')));
  }

  // ==========================================
  // GOODS RECEIPTS
  // ==========================================

  static async createGoodsReceipt(data: any) {
    return await db.transaction(async (tx) => {
      // Idempotency / Duplicate protection
      const existing = await tx.select().from(goodsReceipts).where(eq(goodsReceipts.receiptNumber, data.receiptNumber));
      if (existing.length > 0) throw new Error('Receipt already exists');

      // Create Receipt
      const [gr] = await tx.insert(goodsReceipts).values({
        receiptNumber: data.receiptNumber,
        poId: data.poId,
        supplierId: data.supplierId,
        receiptDate: data.receiptDate,
        receivedBy: data.receivedBy,
        status: 'POSTED',
        notes: data.notes
      }).returning();

      let allReceived = true;
      let anyReceived = false;

      // Handle items
      if (data.items && data.items.length > 0) {
        const grItems = [];
        for (const i of data.items) {
          // Lock PO Item for concurrency
          const poItemsQuery = await tx.execute(sql`SELECT * FROM purchase_order_items WHERE id = ${i.poItemId} FOR UPDATE`);
          const poItem = poItemsQuery.rows[0] as any;
          if (!poItem) throw new Error('PO Item not found');
          
          if (i.receivedQuantity > (poItem.quantity - poItem.received_quantity)) {
            throw new Error('Received quantity exceeds remaining PO quantity');
          }

          grItems.push({
            receiptId: gr.id,
            poItemId: i.poItemId,
            materialId: poItem.material_id,
            orderedQuantity: poItem.quantity,
            receivedQuantity: i.receivedQuantity,
            acceptedQuantity: i.acceptedQuantity,
            rejectedQuantity: i.rejectedQuantity,
            warehouseLocation: i.warehouseLocation
          });

          // Update PO item
          const newReceived = poItem.received_quantity + i.receivedQuantity;
          await tx.execute(sql`UPDATE purchase_order_items SET received_quantity = ${newReceived} WHERE id = ${i.poItemId}`);
          
          if (newReceived < poItem.quantity) {
            allReceived = false;
          }
          if (newReceived > 0) {
            anyReceived = true;
          }
        }
        await tx.insert(goodsReceiptItems).values(grItems);
      }

      // Update PO Status
      const poStatus = allReceived ? 'RECEIVED' : (anyReceived ? 'PARTIALLY_RECEIVED' : 'APPROVED');
      await tx.update(purchaseOrders).set({ status: poStatus }).where(eq(purchaseOrders.id, data.poId));

      return gr;
    });
  }

  // ==========================================
  // SUPPLIER INVOICE & 3-WAY MATCH
  // ==========================================

  static async createSupplierInvoice(data: any) {
    return await db.transaction(async (tx) => {
      // Idempotency
      const existing = await tx.select().from(supplierInvoices).where(eq(supplierInvoices.invoiceNumber, data.invoiceNumber));
      if (existing.length > 0) throw new Error('Invoice already exists');

      // 3-way match
      for (const i of data.items) {
        const poItemsQuery = await tx.execute(sql`SELECT * FROM purchase_order_items WHERE id = ${i.poItemId} FOR UPDATE`);
        const poItem = poItemsQuery.rows[0] as any;
        
        if (i.quantity > poItem.received_quantity - poItem.invoiced_quantity) {
          throw new Error('Invoice quantity exceeds received but not invoiced quantity');
        }
        
        // Price Variance Check (Exact match for P3)
        if (i.unitPrice !== poItem.unit_price) {
          throw new Error('Price variance detected. Rejecting invoice.');
        }

        // Update PO item invoiced quantity
        await tx.execute(sql`UPDATE purchase_order_items SET invoiced_quantity = ${poItem.invoiced_quantity + i.quantity} WHERE id = ${i.poItemId}`);
      }

      // Create Invoice
      const [inv] = await tx.insert(supplierInvoices).values({
        invoiceNumber: data.invoiceNumber,
        supplierId: data.supplierId,
        poId: data.poId,
        receiptId: data.receiptId,
        invoiceDate: data.invoiceDate,
        dueDate: data.dueDate,
        subtotal: data.subtotal,
        tax: data.tax,
        total: data.total,
        status: 'POSTED',
        createdBy: data.createdBy,
        postedBy: data.createdBy,
        postedAt: new Date()
      }).returning();

      const invItems = data.items.map((i: any) => ({
        ...i,
        invoiceId: inv.id
      }));
      await tx.insert(supplierInvoiceItems).values(invItems);
      
      // Update PO Status if fully invoiced
      const poItemsCheck = await tx.execute(sql`SELECT * FROM purchase_order_items WHERE po_id = ${data.poId}`);
      let fullyInvoiced = true;
      for(const row of poItemsCheck.rows) {
        if((row as any).invoiced_quantity < (row as any).quantity) fullyInvoiced = false;
      }
      if (fullyInvoiced) {
        await tx.update(purchaseOrders).set({ status: 'INVOICED' }).where(eq(purchaseOrders.id, data.poId));
      } else {
        await tx.update(purchaseOrders).set({ status: 'PARTIALLY_INVOICED' }).where(eq(purchaseOrders.id, data.poId));
      }

      // Accounting Integration
      if (data.periodId) {
        // We assume 152 for Inventory, 1331 for VAT, 331 for AP
        const getAccount = async (code: string) => {
          const accs = await tx.select().from(accounts).where(eq(accounts.code, code));
          if (accs.length === 0) throw new Error(`Account ${code} missing`);
          return accs[0].id;
        };

        const accInventory = await getAccount('152');
        const accVAT = await getAccount('1331');
        const accPayable = await getAccount('331');
        
        const lines = [];
        lines.push({ accountId: accInventory, debit: data.subtotal, credit: 0 });
        if (data.tax > 0) {
          lines.push({ accountId: accVAT, debit: data.tax, credit: 0 });
        }
        lines.push({ accountId: accPayable, debit: 0, credit: data.total });

        await AccountingService.createJournalEntry({
          entryNo: `JV-INV-${inv.id}`,
          postingDate: data.invoiceDate.toISOString().split('T')[0],
          periodId: data.periodId,
          referenceType: 'SUPPLIER_INVOICE',
          referenceId: inv.id,
          description: `Invoice ${data.invoiceNumber}`,
          lines
        });
      }

      return inv;
    });
  }
}
