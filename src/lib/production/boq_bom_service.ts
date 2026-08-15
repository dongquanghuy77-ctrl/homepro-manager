import { db } from '@/db';
import { eq, and, sql, inArray } from 'drizzle-orm';
import {
  boqs, boqSections, boqItems,
  materials, boms, bomItems,
  productionOrders, workOrders, materialConversions, inventoryBalances
} from '@/db/schema';
import { InventoryService } from '@/lib/inventory/services';

export class BoqBomService {
  // ==========================================
  // BOQ MANAGEMENT
  // ==========================================
  static async createBoq(data: any) {
    return await db.transaction(async (tx) => {
      const [boq] = await tx.insert(boqs).values({
        code: data.code,
        projectId: data.projectId,
        version: data.version || '1.0',
        status: 'DRAFT',
        createdBy: data.userId
      }).returning();
      return boq;
    });
  }

  static async approveBoq(boqId: number, userId: number) {
    const [boq] = await db.update(boqs)
      .set({ status: 'APPROVED', approvedBy: userId })
      .where(eq(boqs.id, boqId))
      .returning();
    return boq;
  }

  // ==========================================
  // BOM MANAGEMENT
  // ==========================================
  static async createBom(data: any) {
    return await db.transaction(async (tx) => {
      // Deactivate older active version if needed
      if (data.status === 'ACTIVE') {
        await tx.update(boms)
          .set({ status: 'OBSOLETE' })
          .where(and(eq(boms.productId, data.productId), eq(boms.status, 'ACTIVE')));
      }

      const [bom] = await tx.insert(boms).values({
        productId: data.productId,
        name: data.name,
        version: data.version || '1.0',
        status: data.status || 'DRAFT',
        createdBy: data.userId
      }).returning();

      if (data.items && data.items.length > 0) {
        // Validate circular dependency
        for (const item of data.items) {
          await this.validateCircularDependency(tx, data.productId, item.materialId);
        }

        const itemsToInsert = data.items.map((i: any) => ({
          bomId: bom.id,
          materialId: i.materialId,
          quantity: i.quantity,
          unit: i.unit,
          scrapPercentage: i.scrapPercentage || 0,
          wastePercentage: i.wastePercentage || 0,
          isRequired: i.isRequired !== false,
          position: i.position
        }));
        await tx.insert(bomItems).values(itemsToInsert);
      }
      return bom;
    });
  }

  static async validateCircularDependency(tx: any, parentId: number, childId: number) {
    if (parentId === childId) throw new Error('Circular dependency detected');
    
    // Check if child has a BOM
    const childBoms = await tx.select().from(boms)
      .where(and(eq(boms.productId, childId), eq(boms.status, 'ACTIVE')));
    
    if (childBoms.length === 0) return; // Leaf node

    const childBomItems = await tx.select().from(bomItems).where(eq(bomItems.bomId, childBoms[0].id));
    for (const item of childBomItems) {
      await this.validateCircularDependency(tx, parentId, item.materialId);
    }
  }

  // ==========================================
  // BOM EXPLOSION & CALCULATION
  // ==========================================
  
  // Explode BOM recursively
  static async explodeBom(productId: number, requiredQty: number, currentList: Map<number, number> = new Map()) {
    // Get ACTIVE BOM for this product
    const activeBoms = await db.select().from(boms)
      .where(and(eq(boms.productId, productId), eq(boms.status, 'ACTIVE')));
    
    if (activeBoms.length === 0) {
      // It's a leaf material
      currentList.set(productId, (currentList.get(productId) || 0) + requiredQty);
      return currentList;
    }

    const bom = activeBoms[0];
    const items = await db.select().from(bomItems).where(eq(bomItems.bomId, bom.id));

    for (const item of items) {
      // Quantity logic with Scrap/Waste
      const grossQtyPerUnit = Number(item.quantity) * (1 + (Number(item.scrapPercentage) / 100)) * (1 + (Number(item.wastePercentage) / 100));
      const totalItemQty = grossQtyPerUnit * requiredQty;
      
      // Recursively explode
      await this.explodeBom(item.materialId, totalItemQty, currentList);
    }

    return currentList;
  }

  // Check Inventory Availability against exploded BOM
  static async checkAvailability(explodedMaterials: Map<number, number>, warehouseId: number) {
    const materialIds = Array.from(explodedMaterials.keys());
    if (materialIds.length === 0) return [];

    const balances = await db.select({
      material_id: inventoryBalances.materialId,
      available: sql<number>`SUM(${inventoryBalances.availableQuantity})`
    })
    .from(inventoryBalances)
    .where(and(
      inArray(inventoryBalances.materialId, materialIds),
      eq(inventoryBalances.warehouseId, warehouseId)
    ))
    .groupBy(inventoryBalances.materialId);

    const balanceMap = new Map();
    balances.forEach((r: any) => balanceMap.set(r.material_id, Number(r.available)));

    const results = [];
    for (const [matId, reqQty] of explodedMaterials.entries()) {
      const avail = balanceMap.get(matId) || 0;
      results.push({
        materialId: matId,
        required: reqQty,
        available: avail,
        shortage: Math.max(0, reqQty - avail)
      });
    }
    return results;
  }

  // ==========================================
  // COSTING
  // ==========================================
  static async calculateBomStandardCost(productId: number): Promise<number> {
    const exploded = await this.explodeBom(productId, 1);
    const materialIds = Array.from(exploded.keys());
    if (materialIds.length === 0) return 0;

    const mats = await db.select().from(materials).where(inArray(materials.id, materialIds));
    const costMap = new Map();
    mats.forEach(m => costMap.set(m.id, Number(m.unitPrice)));

    let totalCost = 0;
    for (const [matId, qty] of exploded.entries()) {
      totalCost += qty * (costMap.get(matId) || 0);
    }

    // In a real scenario, we also add Routing/Labor costs here
    return totalCost;
  }
}
