api_code = """import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { pwrMaterials } from '@/db/schema';
import { eq, or } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, skuCode, category, unit } = body;
    
    // [UAT FIX] Check trùng lặp trước khi Insert
    const existing = await db.select().from(pwrMaterials).where(or(eq(pwrMaterials.name, name), eq(pwrMaterials.skuCode, skuCode || name)));
    if (existing.length > 0) {
      return NextResponse.json(existing[0]); // Trả về luôn mã cũ nếu đã tồn tại (Chống lỗi click 2 lần)
    }

    const [newMat] = await db.insert(pwrMaterials).values({
      name,
      skuCode: skuCode || name,
      category: category || 'VÁN',
      unit: unit || 'TẤM',
      stockLevel: 0
    }).returning();
    
    return NextResponse.json(newMat);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
"""

with open("src/app/api/pwr/materials/route.ts", "w", encoding="utf-8") as f:
    f.write(api_code)

print("Safely rewritten Materials API to prevent duplication")