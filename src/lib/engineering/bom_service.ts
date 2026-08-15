import { db } from '@/db';
import { boms, bomItems, materials } from '@/db/schema';
import { eq, inArray, and } from 'drizzle-orm';

export interface FlattenedBomItem {
  materialId: number;
  materialCode: string;
  materialName: string;
  materialType: string | null;
  unit: string;
  unitPrice: number;
  requiredQuantity: number;
  grossQuantity: number; // Including scrap/waste
  totalCost: number;
  level: number;
  path: string;
}

export class BomService {
  /**
   * Recursively flatten a multi-level BOM down to Raw Materials.
   */
  static async getFlattenedBom(bomId: number, multiplier: number = 1, currentLevel: number = 0, currentPath: string = 'ROOT'): Promise<FlattenedBomItem[]> {
    const itemsQuery = await db.select({
      id: bomItems.id,
      materialId: bomItems.materialId,
      quantity: bomItems.quantity,
      scrapPercentage: bomItems.scrapPercentage,
      wastePercentage: bomItems.wastePercentage,
      materialCode: materials.code,
      materialName: materials.name,
      materialType: materials.type,
      unit: materials.unit,
      unitPrice: materials.unitPrice
    })
    .from(bomItems)
    .innerJoin(materials, eq(bomItems.materialId, materials.id))
    .where(eq(bomItems.bomId, bomId));

    let flatList: FlattenedBomItem[] = [];

    for (const item of itemsQuery) {
      const baseQty = Number(item.quantity) * multiplier;
      const scrapFactor = 1 + (Number(item.scrapPercentage) / 100);
      const wasteFactor = 1 + (Number(item.wastePercentage) / 100);
      const grossQty = baseQty * scrapFactor * wasteFactor;
      
      const itemPath = `${currentPath} > ${item.materialCode}`;

      // Check if this material is a Sub-Assembly with its own ACTIVE BOM
      if (item.materialType === 'SUB_ASSEMBLY' || item.materialType === 'FINISHED_GOOD') {
        const subBomQuery = await db.select()
          .from(boms)
          .where(and(eq(boms.productId, item.materialId), eq(boms.status, 'ACTIVE')))
          .limit(1);

        if (subBomQuery.length > 0) {
          // Recursively resolve
          const subItems = await this.getFlattenedBom(subBomQuery[0].id, grossQty, currentLevel + 1, itemPath);
          flatList = flatList.concat(subItems);
          continue; // We don't add the sub-assembly itself to the flat raw material list, unless required
        }
      }

      // It's a RAW_MATERIAL or a Sub-assembly without a BOM (treated as leaf)
      flatList.push({
        materialId: item.materialId,
        materialCode: item.materialCode,
        materialName: item.materialName,
        materialType: item.materialType,
        unit: item.unit,
        unitPrice: Number(item.unitPrice),
        requiredQuantity: baseQty,
        grossQuantity: grossQty,
        totalCost: grossQty * Number(item.unitPrice),
        level: currentLevel,
        path: itemPath
      });
    }

    // Consolidate duplicates (e.g. screws used in multiple sub-assemblies)
    if (currentLevel === 0) {
      const consolidated = new Map<number, FlattenedBomItem>();
      for (const item of flatList) {
        if (consolidated.has(item.materialId)) {
          const existing = consolidated.get(item.materialId)!;
          existing.requiredQuantity += item.requiredQuantity;
          existing.grossQuantity += item.grossQuantity;
          existing.totalCost += item.totalCost;
          existing.path = existing.path + ' | ' + item.path;
        } else {
          consolidated.set(item.materialId, { ...item });
        }
      }
      return Array.from(consolidated.values());
    }

    return flatList;
  }

  /**
   * Calculate Standard Cost of a Product based on its active BOM.
   */
  static async calculateStandardCost(productId: number): Promise<number> {
    const bomQuery = await db.select()
      .from(boms)
      .where(and(eq(boms.productId, productId), eq(boms.status, 'ACTIVE')))
      .limit(1);

    if (bomQuery.length === 0) {
      // If no BOM, return the material's own unitPrice
      const mat = await db.select().from(materials).where(eq(materials.id, productId)).limit(1);
      return mat.length > 0 ? Number(mat[0].unitPrice) : 0;
    }

    const flatList = await this.getFlattenedBom(bomQuery[0].id);
    return flatList.reduce((acc, item) => acc + item.totalCost, 0);
  }

  /**
   * Create a new revision of a BOM to enforce immutability of older versions.
   */
  static async createBomRevision(oldBomId: number, newVersion: string, userId: number, revisionReason?: string): Promise<number> {
    return await db.transaction(async (tx) => {
      // 1. Fetch old BOM
      const oldBomResult = await tx.select().from(boms).where(eq(boms.id, oldBomId));
      if (oldBomResult.length === 0) throw new Error("Old BOM not found");
      const oldBom = oldBomResult[0];

      // 2. Mark old BOM as OBSOLETE if it was ACTIVE
      if (oldBom.status === 'ACTIVE') {
        await tx.update(boms).set({ status: 'OBSOLETE' }).where(eq(boms.id, oldBomId));
      }

      // 3. Create new BOM entry
      const newBomInsert = await tx.insert(boms).values({
        productId: oldBom.productId,
        name: oldBom.name,
        version: newVersion,
        status: 'ACTIVE',
        revisionReason: revisionReason,
        createdBy: userId
      }).returning({ id: boms.id });
      const newBomId = newBomInsert[0].id;

      // 4. Duplicate BOM Items
      const oldItems = await tx.select().from(bomItems).where(eq(bomItems.bomId, oldBomId));
      if (oldItems.length > 0) {
        const newItems = oldItems.map(item => ({
          bomId: newBomId,
          materialId: item.materialId,
          quantity: item.quantity,
          unit: item.unit,
          scrapPercentage: item.scrapPercentage,
          wastePercentage: item.wastePercentage,
          isRequired: item.isRequired,
          position: item.position,
          notes: item.notes,
          workCenterId: item.workCenterId
        }));
        await tx.insert(bomItems).values(newItems);
      }

      return newBomId;
    });
  }
}
