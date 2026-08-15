import { db } from '@/db';
import { eq, and, sql } from 'drizzle-orm';
import {
  warehouses
} from '@/db/schema';

export class WarehouseService {
  // ==========================================
  // WAREHOUSES
  // ==========================================
  static async createWarehouse(data: any) {
    const [wh] = await db.insert(warehouses).values(data).returning();
    return wh;
  }

  static async updateWarehouse(id: number, data: any) {
    const [updated] = await db.update(warehouses).set(data).where(eq(warehouses.id, id)).returning();
    return updated;
  }

}
