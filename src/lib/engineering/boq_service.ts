import { db } from '@/db';
import { boqs, boqItems, materialRequirements, materials, inventoryBalances, boms } from '@/db/schema';
import { eq, inArray, sql, and } from 'drizzle-orm';
import { BomService, FlattenedBomItem } from './bom_service';

export class BoqService {
  /**
   * Run Material Requirement Planning (MRP) for a given BOQ.
   * This calculates the gross and net requirements for all raw materials needed by the BOQ Items.
   */
  static async runMrpForBoq(boqId: number, projectId: number): Promise<void> {
    const items = await db.select({
      id: boqItems.id,
      productId: boqItems.productId,
      qtyRequired: boqItems.qtyRequired
    })
    .from(boqItems)
    .where(eq(boqItems.boqId, boqId));

    const totalRawMaterials = new Map<number, FlattenedBomItem>();

    // 1. Calculate Gross Requirements across all BOQ Items
    for (const item of items) {
      if (!item.productId) continue;
      
      // Find the active BOM for this product
      const activeBom = await db.select()
        .from(boms)
        .where(and(eq(boms.productId, item.productId), eq(boms.status, 'ACTIVE')))
        .limit(1);
        
      if (activeBom.length === 0) continue; // No BOM defined for this product

      const flatBom = await BomService.getFlattenedBom(activeBom[0].id, Number(item.qtyRequired));
      
      for (const req of flatBom) {
        if (totalRawMaterials.has(req.materialId)) {
          const existing = totalRawMaterials.get(req.materialId)!;
          existing.requiredQuantity += req.requiredQuantity;
          existing.grossQuantity += req.grossQuantity;
        } else {
          totalRawMaterials.set(req.materialId, { ...req });
        }
      }
    }

    // 2. Fetch current Inventory levels to calculate Net Requirements (Shortage)
    const materialIds = Array.from(totalRawMaterials.keys());
    if (materialIds.length === 0) return;

    // Aggregate inventory across all warehouses (or a specific one if needed)
    const inventoryQuery = await db.select({
      materialId: inventoryBalances.materialId,
      totalStock: sql<number>`SUM(${inventoryBalances.quantity})`
    })
    .from(inventoryBalances)
    .where(inArray(inventoryBalances.materialId, materialIds))
    .groupBy(inventoryBalances.materialId);

    const stockMap = new Map<number, number>();
    for (const inv of inventoryQuery) {
      stockMap.set(inv.materialId, Number(inv.totalStock));
    }

    // 3. Clear old MRP for this BOQ and insert new ones
    await db.delete(materialRequirements).where(eq(materialRequirements.boqId, boqId));

    const mrpInserts = [];
    for (const [matId, req] of totalRawMaterials.entries()) {
      const currentStock = stockMap.get(matId) || 0;
      const shortage = req.grossQuantity > currentStock ? req.grossQuantity - currentStock : 0;

      mrpInserts.push({
        projectId: projectId,
        boqId: boqId,
        materialId: matId,
        requiredQty: req.grossQuantity, // using gross quantity as the final requirement
        stockAtCalculation: currentStock,
        shortageQty: shortage,
        status: shortage > 0 ? 'PENDING' : 'RECEIVED'
      });
    }

    if (mrpInserts.length > 0) {
      await db.insert(materialRequirements).values(mrpInserts);
    }
  }
}
