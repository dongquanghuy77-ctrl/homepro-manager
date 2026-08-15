import { db } from '@/db';
import { eq } from 'drizzle-orm';
import { materials } from '@/db/schema';

export class MaterialService {
  // ==========================================
  // MATERIALS
  // ==========================================
  static async createMaterial(data: any) {
    const [mat] = await db.insert(materials).values(data).returning();
    return mat;
  }

  static async updateMaterial(id: number, data: any) {
    const [updated] = await db.update(materials).set(data).where(eq(materials.id, id)).returning();
    return updated;
  }

  static async deleteMaterial(id: number) {
    await db.delete(materials).where(eq(materials.id, id));
    return true;
  }
}
