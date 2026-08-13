import { db } from '@/db';
import { eq, and, sql } from 'drizzle-orm';
import {
  warehouses,
  stockBalances,
  stockLedgers,
  materials,
  accounts
} from '@/db/schema';
import { AccountingService } from '@/lib/accounting/services';

export class InventoryService {
  
  // ==========================================
  // WAREHOUSE
  // ==========================================
  static async createWarehouse(data: any) {
    const [wh] = await db.insert(warehouses).values(data).returning();
    return wh;
  }

  // ==========================================
  // CORE MOVEMENT ENGINE
  // ==========================================
  static async processMovement(tx: any, data: {
    movementNumber: string;
    movementType: 'RECEIPT' | 'ISSUE' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'RETURN' | 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT';
    materialId: number;
    warehouseId: number;
    locationId?: string | null;
    quantity: number; // positive for IN, negative for OUT
    referenceType?: string | null;
    referenceId?: number | null;
    projectId?: number | null;
    userId?: number | null;
    notes?: string | null;
    costOverride?: number | null;
  }) {
    // 1. Idempotency Check
    const existing = await tx.select().from(stockLedgers).where(eq(stockLedgers.movementNumber, data.movementNumber));
    if (existing.length > 0) throw new Error('Movement already exists');

    if (data.quantity === 0) throw new Error('Quantity cannot be zero');
    const isOut = data.movementType === 'ISSUE' || data.movementType === 'TRANSFER_OUT' || data.movementType === 'ADJUSTMENT_OUT';
    if (isOut && data.quantity > 0) data.quantity = -data.quantity;
    const isIn = data.movementType === 'RECEIPT' || data.movementType === 'TRANSFER_IN' || data.movementType === 'RETURN' || data.movementType === 'ADJUSTMENT_IN';
    if (isIn && data.quantity < 0) data.quantity = Math.abs(data.quantity);

    // 2. Lock Balance row
    let balanceQuery;
    if (data.locationId) {
      balanceQuery = await tx.execute(sql`SELECT * FROM stock_balances WHERE material_id = ${data.materialId} AND warehouse_id = ${data.warehouseId} AND location_id = ${data.locationId} FOR UPDATE`);
    } else {
      balanceQuery = await tx.execute(sql`SELECT * FROM stock_balances WHERE material_id = ${data.materialId} AND warehouse_id = ${data.warehouseId} AND location_id IS NULL FOR UPDATE`);
    }

    let bal = balanceQuery.rows[0];
    if (!bal) {
      if (isOut) throw new Error('Insufficient stock for this movement');
      const [newBal] = await tx.insert(stockBalances).values({
        materialId: data.materialId,
        warehouseId: data.warehouseId,
        locationId: data.locationId || null,
        onHand: 0,
        reserved: 0,
        available: 0,
        unitCost: 0
      }).returning();
      bal = newBal as any;
      // Re-lock to ensure Atomicity
      const rbQuery = await tx.execute(sql`SELECT * FROM stock_balances WHERE id = ${bal.id} FOR UPDATE`);
      bal = rbQuery.rows[0];
    }

    // 3. Validation
    if (isOut && (bal.on_hand + data.quantity < 0)) { // quantity is negative for OUT
      throw new Error('Insufficient stock for this movement');
    }

    // 4. Weighted Average Cost Valuation
    let unitCost = bal.unit_cost;
    let totalCost = 0;

    if (isIn) {
      // Input cost determines valuation
      const incomingCost = data.costOverride ?? bal.unit_cost; // Use override or existing
      const currentTotalValue = bal.on_hand * bal.unit_cost;
      const incomingValue = data.quantity * incomingCost;
      const newQuantity = bal.on_hand + data.quantity;
      
      if (newQuantity > 0) {
        unitCost = (currentTotalValue + incomingValue) / newQuantity;
      } else {
        unitCost = incomingCost;
      }
      totalCost = incomingValue;
    } else {
      // Outbound cost is always current unitCost
      totalCost = Math.abs(data.quantity) * unitCost;
    }

    // 5. Update Balance
    const newOnHand = bal.on_hand + data.quantity;
    const newAvailable = bal.available + data.quantity;
    
    await tx.execute(sql`
      UPDATE stock_balances 
      SET on_hand = ${newOnHand}, 
          available = ${newAvailable}, 
          unit_cost = ${unitCost},
          last_updated = NOW()
      WHERE id = ${bal.id}
    `);

    // 6. Create Ledger Entry
    const [ledger] = await tx.insert(stockLedgers).values({
      movementNumber: data.movementNumber,
      movementType: data.movementType,
      materialId: data.materialId,
      warehouseId: data.warehouseId,
      locationId: data.locationId,
      quantity: data.quantity,
      unitCost: isIn ? (data.costOverride ?? bal.unit_cost) : unitCost,
      totalCost: totalCost,
      referenceType: data.referenceType,
      referenceId: data.referenceId,
      projectId: data.projectId,
      userId: data.userId,
      notes: data.notes
    }).returning();

    return { ledger, newBalance: { onHand: newOnHand, available: newAvailable, unitCost } };
  }

  // ==========================================
  // SPECIFIC MOVEMENTS
  // ==========================================

  static async receiveGoods(data: any) {
    return await db.transaction(async (tx) => {
      const res = await this.processMovement(tx, {
        movementNumber: `RCP-${Date.now()}-${data.materialId}`,
        movementType: 'RECEIPT',
        materialId: data.materialId,
        warehouseId: data.warehouseId,
        locationId: data.locationId,
        quantity: data.quantity,
        referenceType: data.referenceType,
        referenceId: data.referenceId,
        userId: data.userId,
        costOverride: data.unitCost, // PO unit price
        notes: data.notes
      });
      return res;
    });
  }

  static async issueMaterial(data: any) {
    return await db.transaction(async (tx) => {
      const res = await this.processMovement(tx, {
        movementNumber: `ISS-${Date.now()}-${data.materialId}`,
        movementType: 'ISSUE',
        materialId: data.materialId,
        warehouseId: data.warehouseId,
        locationId: data.locationId,
        quantity: data.quantity,
        referenceType: data.referenceType,
        referenceId: data.referenceId,
        projectId: data.projectId,
        userId: data.userId,
        notes: data.notes
      });

      // Accounting Boundary
      if (data.periodId) {
        const getAccount = async (code: string) => {
          const accs = await tx.select().from(accounts).where(eq(accounts.code, code));
          if (accs.length === 0) throw new Error(`Account ${code} missing`);
          return accs[0].id;
        };
        const accInventory = await getAccount('152');
        const accProjectMaterial = await getAccount('621'); // 621 - Chi phí nguyên liệu trực tiếp

        await AccountingService.createJournalEntry({
          entryNo: `JV-ISS-${res.ledger.id}`,
          postingDate: new Date().toISOString().split('T')[0],
          periodId: data.periodId,
          referenceType: 'MATERIAL_ISSUE',
          referenceId: res.ledger.id,
          description: `Material Issue to Project ${data.projectId}`,
          lines: [
            { accountId: accProjectMaterial, debit: res.ledger.totalCost, credit: 0, projectId: data.projectId },
            { accountId: accInventory, debit: 0, credit: res.ledger.totalCost }
          ]
        });
      }
      return res;
    });
  }

  static async transferStock(data: any) {
    return await db.transaction(async (tx) => {
      const movementId = `TRF-${Date.now()}`;
      
      const outRes = await this.processMovement(tx, {
        movementNumber: `${movementId}-OUT`,
        movementType: 'TRANSFER_OUT',
        materialId: data.materialId,
        warehouseId: data.fromWarehouseId,
        locationId: data.fromLocationId,
        quantity: data.quantity,
        userId: data.userId
      });

      const inRes = await this.processMovement(tx, {
        movementNumber: `${movementId}-IN`,
        movementType: 'TRANSFER_IN',
        materialId: data.materialId,
        warehouseId: data.toWarehouseId,
        locationId: data.toLocationId,
        quantity: data.quantity,
        costOverride: outRes.ledger.unitCost, // Preserve cost
        userId: data.userId
      });

      return { outRes, inRes };
    });
  }

  static async reconcileStock(data: any) {
    return await db.transaction(async (tx) => {
      // Find current stock
      const balanceQuery = await tx.execute(sql`SELECT on_hand FROM stock_balances WHERE material_id = ${data.materialId} AND warehouse_id = ${data.warehouseId} FOR UPDATE`);
      const bal = balanceQuery.rows[0];
      const current = (bal ? bal.on_hand : 0) as number;
      
      const difference = data.physicalQuantity - current;
      if (difference === 0) return { message: 'No difference' };

      const movType = difference > 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT';
      
      return await this.processMovement(tx, {
        movementNumber: `ADJ-${Date.now()}-${data.materialId}`,
        movementType: movType,
        materialId: data.materialId,
        warehouseId: data.warehouseId,
        locationId: data.locationId,
        quantity: Math.abs(difference),
        userId: data.userId,
        notes: data.reason
      });
    });
  }
}
