import os

api_code = """import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { pwrMaterials } from '@/db/schema';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, skuCode, category, unit } = body;
    
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

os.makedirs("src/app/api/pwr/materials", exist_ok=True)
with open("src/app/api/pwr/materials/route.ts", "w", encoding="utf-8") as f:
    f.write(api_code)

print("Created Materials API")