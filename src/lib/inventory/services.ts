import { db } from '@/db';
import { eq, and, sql } from 'drizzle-orm';
import {
  warehouses,
  inventoryBalances,
  inventoryTransactions,
  inventoryReservations,
  materials,
  accounts,
  inventoryCounts,
  inventoryCountItems,
  suppliers
} from '@/db/schema';
import { AccountingService } from '@/lib/accounting/services';

export class InventoryService {
  


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
    const existing = await tx.select().from(inventoryTransactions).where(eq(inventoryTransactions.movementNumber, data.movementNumber));
    if (existing.length > 0) throw new Error('Movement already exists');

    if (data.quantity === 0) throw new Error('Quantity cannot be zero');
    const isOut = data.movementType === 'ISSUE' || data.movementType === 'TRANSFER_OUT' || data.movementType === 'ADJUSTMENT_OUT';
    if (isOut && data.quantity > 0) data.quantity = -data.quantity;
    const isIn = data.movementType === 'RECEIPT' || data.movementType === 'TRANSFER_IN' || data.movementType === 'RETURN' || data.movementType === 'ADJUSTMENT_IN';
    if (isIn && data.quantity < 0) data.quantity = Math.abs(data.quantity);

    // 2. Lock Balance row
    let balanceQuery;
    if (data.locationId) {
      balanceQuery = await tx.execute(sql`SELECT * FROM inventory_balances WHERE material_id = ${data.materialId} AND warehouse_id = ${data.warehouseId} AND location_id = ${data.locationId} FOR UPDATE`);
    } else {
      balanceQuery = await tx.execute(sql`SELECT * FROM inventory_balances WHERE material_id = ${data.materialId} AND warehouse_id = ${data.warehouseId} AND location_id IS NULL FOR UPDATE`);
    }

    let bal = balanceQuery.rows[0];
    if (!bal) {
      if (isOut) throw new Error('Insufficient stock for this movement');
      const [newBal] = await tx.insert(inventoryBalances).values({
        materialId: data.materialId,
        warehouseId: data.warehouseId,
        locationId: data.locationId || null,
        quantity: 0,
        reservedQuantity: 0,
        availableQuantity: 0,
        unitCost: 0
      }).returning();
      bal = newBal as any;
      // Re-lock to ensure Atomicity
      const rbQuery = await tx.execute(sql`SELECT * FROM inventory_balances WHERE id = ${bal.id} FOR UPDATE`);
      bal = rbQuery.rows[0];
    }

    // 3. Validation
    if (isOut && ((bal.quantity || 0) + data.quantity < 0)) { // quantity is negative for OUT
      throw new Error('Insufficient stock for this movement');
    }

    // 4. Weighted Average Cost Valuation
    let unitCost = bal.unit_cost;
    let totalCost = 0;

    if (isIn) {
      // Input cost determines valuation
      const incomingCost = data.costOverride ?? bal.unit_cost; // Use override or existing
      const currentTotalValue = (bal.quantity || 0) * (bal.unit_cost || 0);
      const incomingValue = data.quantity * incomingCost;
      const newQuantity = (bal.quantity || 0) + data.quantity;
      
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
    const [updated] = await tx.update(inventoryBalances)
      .set({
        quantity: Number(bal.quantity || 0) + Number(data.quantity),
        availableQuantity: Number(bal.available_quantity || 0) + Number(data.quantity),
        unitCost: unitCost
      })
      .where(eq(inventoryBalances.id, Number(bal.id)))
      .returning();

    // 6. Create Ledger Entry
    const [ledger] = await tx.insert(inventoryTransactions).values({
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

    return { ledger, newBalance: { quantity: Number(updated.quantity), available: Number(updated.availableQuantity), unitCost } };
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
      // If issuing from a reservation, handle reservation updates first
      if (data.reservationId) {
        const reservations = await tx.select().from(inventoryReservations).where(eq(inventoryReservations.id, data.reservationId));
        const resv = reservations[0];
        if (!resv || resv.status !== 'RESERVED') {
          throw new Error('Invalid or already processed reservation');
        }

        // Release reservation quantity
        const balanceQuery = await tx.execute(sql`SELECT * FROM inventory_balances WHERE material_id = ${data.materialId} AND warehouse_id = ${data.warehouseId} FOR UPDATE`);
        const bal = balanceQuery.rows[0];
        if (bal) {
          // Re-add to available quantity since processMovement will subtract it again
          await tx.update(inventoryBalances)
            .set({
              reservedQuantity: Number(bal.reserved_quantity || 0) - Number(data.quantity),
              availableQuantity: Number(bal.available_quantity || 0) + Number(data.quantity)
            })
            .where(eq(inventoryBalances.id, Number(bal.id)));
        }

        // Mark reservation as ISSUED or partially update it (assuming full issue for simplicity here)
        await tx.update(inventoryReservations)
          .set({ status: 'ISSUED' })
          .where(eq(inventoryReservations.id, data.reservationId));
      }

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

  // ==========================================
  // RESERVATIONS
  // ==========================================
  static async createReservation(data: {
    materialId: number;
    warehouseId: number;
    referenceType: string;
    referenceId: string;
    quantity: number;
    notes?: string;
  }) {
    return await db.transaction(async (tx) => {
      // Lock balance
      const balanceQuery = await tx.execute(sql`SELECT * FROM inventory_balances WHERE material_id = ${data.materialId} AND warehouse_id = ${data.warehouseId} AND location_id IS NULL FOR UPDATE`);
      const bal = balanceQuery.rows[0];

      if (!bal || Number(bal.available_quantity || 0) < data.quantity) {
        throw new Error('Insufficient available stock for reservation');
      }

      // Update balances
      await tx.update(inventoryBalances)
        .set({
          availableQuantity: Number(bal.available_quantity || 0) - data.quantity,
          reservedQuantity: Number(bal.reserved_quantity || 0) + data.quantity
        })
        .where(eq(inventoryBalances.id, Number(bal.id)));

      // Create reservation record
      const [resv] = await tx.insert(inventoryReservations).values({
        materialId: data.materialId,
        warehouseId: data.warehouseId,
        referenceType: data.referenceType,
        referenceId: data.referenceId,
        quantity: data.quantity,
        status: 'ACTIVE',
        notes: data.notes
      }).returning();

      return resv;
    });
  }

  static async cancelReservation(reservationId: number) {
    return await db.transaction(async (tx) => {
      const reservations = await tx.select().from(inventoryReservations).where(eq(inventoryReservations.id, reservationId));
      const resv = reservations[0];

      if (!resv || resv.status !== 'ACTIVE') {
        throw new Error('Invalid or already processed reservation');
      }

      // Lock balance
      const balanceQuery = await tx.execute(sql`SELECT * FROM inventory_balances WHERE material_id = ${resv.materialId} AND warehouse_id = ${resv.warehouseId} AND location_id IS NULL FOR UPDATE`);
      const bal = balanceQuery.rows[0];

      if (bal) {
        await tx.update(inventoryBalances)
          .set({
            availableQuantity: Number(bal.available_quantity || 0) + Number(resv.quantity),
            reservedQuantity: Math.max(0, Number(bal.reserved_quantity || 0) - Number(resv.quantity))
          })
          .where(eq(inventoryBalances.id, Number(bal.id)));
      }

      const [updated] = await tx.update(inventoryReservations)
        .set({ status: 'CANCELLED', notes: (resv.notes ? resv.notes + ' | ' : '') + 'Cancelled' })
        .where(eq(inventoryReservations.id, reservationId))
        .returning();

      return updated;
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
      const balanceQuery = await tx.execute(sql`SELECT quantity FROM inventory_balances WHERE material_id = ${data.materialId} AND warehouse_id = ${data.warehouseId} FOR UPDATE`);
      const bal = balanceQuery.rows[0];
      const current = (bal ? Number(bal.quantity) : 0);
      
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

export class InventoryCountService {
  static async createStocktake(data: any) {
    return await db.transaction(async (tx) => {
      const code = `ST-${Date.now()}`;
      const [count] = await tx.insert(inventoryCounts).values({
        code,
        warehouseId: data.warehouseId,
        assignedTo: data.userId,
        scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : new Date(),
        notes: data.notes
      }).returning();

      // Get current balances for this warehouse
      const balances = await tx.execute(sql`SELECT material_id, location_id, quantity FROM inventory_balances WHERE warehouse_id = ${data.warehouseId}`);
      
      for (const bal of balances.rows) {
        await tx.insert(inventoryCountItems).values({
          countId: count.id,
          materialId: Number(bal.material_id),
          locationId: bal.location_id ? String(bal.location_id) : null,
          systemQuantity: bal.quantity ? bal.quantity.toString() : "0"
        } as any);
      }

      return count;
    });
  }

  static async updateCountItem(itemId: number, countedQty: number, notes?: string) {
    const items = await db.select().from(require('@/db/schema').inventoryCountItems).where(eq(require('@/db/schema').inventoryCountItems.id, itemId));
    if (!items[0]) throw new Error('Item not found');
    const systemQty = Number(items[0].systemQuantity);
    const variance = countedQty - systemQty;

    await db.update(require('@/db/schema').inventoryCountItems)
      .set({ countedQuantity: countedQty, variance, status: 'COUNTED', notes })
      .where(eq(require('@/db/schema').inventoryCountItems.id, itemId));
  }

  static async completeStocktake(countId: number, userId: number) {
    return await db.transaction(async (tx) => {
      const countItems = await tx.select().from(require('@/db/schema').inventoryCountItems).where(eq(require('@/db/schema').inventoryCountItems.countId, countId));
      const counts = await tx.select().from(require('@/db/schema').inventoryCounts).where(eq(require('@/db/schema').inventoryCounts.id, countId));
      const count = counts[0];
      if (!count || count.status !== 'DRAFT') throw new Error('Invalid count');

      for (const item of countItems) {
        if (item.status === 'COUNTED' && item.variance !== null && Number(item.variance) !== 0) {
          const diff = Number(item.variance);
          const movType = diff > 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT';
          
          await InventoryService.processMovement(tx, {
            movementNumber: `ADJ-${count.code}-${item.id}`,
            movementType: movType,
            materialId: item.materialId,
            warehouseId: count.warehouseId,
            locationId: item.locationId ? item.locationId.toString() : null,
            quantity: Math.abs(diff),
            userId: userId,
            notes: `Kiểm kê kho ${count.code}`
          });
          
          await tx.update(require('@/db/schema').inventoryCountItems)
            .set({ status: 'ADJUSTED' })
            .where(eq(require('@/db/schema').inventoryCountItems.id, item.id));
        }
      }

      await tx.update(require('@/db/schema').inventoryCounts)
        .set({ status: 'COMPLETED', completedDate: new Date() })
        .where(eq(require('@/db/schema').inventoryCounts.id, countId));
      
      return count;
    });
  }
}

export class SupplierService {
  static async getSuppliers() {
    return await db.select().from(require('@/db/schema').suppliers);
  }

  static async createSupplier(data: any) {
    const [supplier] = await db.insert(suppliers).values(data).returning();
    return supplier;
  }

  static async updateSupplier(id: number, data: any) {
    const [supplier] = await db.update(require('@/db/schema').suppliers)
      .set(data)
      .where(eq(require('@/db/schema').suppliers.id, id))
      .returning();
    return supplier;
  }
}
