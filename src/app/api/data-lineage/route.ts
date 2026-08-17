import { NextResponse } from 'next/server';
import { db } from '@/db';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const materialId = searchParams.get('materialId') || '1';
  
  try {
    const materialRes = await db.execute(sql`SELECT id, name, code FROM materials WHERE id = ${materialId} LIMIT 1`);
    const material = materialRes.rows[0] || null;

    if (!material) {
      return NextResponse.json({ lineage: [{ stage: 'Material', data: null, status: 'MISSING' }] });
    }

    const boqRes = await db.execute(sql`SELECT b.id, b.code, bi.qty_required FROM boq_items bi JOIN boqs b ON bi.boq_id = b.id WHERE bi.material_id = ${materialId} LIMIT 1`);
    const boq = boqRes.rows[0] || null;

    const prRes = await db.execute(sql`SELECT pr.id, pr.request_number as code FROM purchase_request_items pri JOIN purchase_requests pr ON pri.request_id = pr.id WHERE pri.material_id = ${materialId} LIMIT 1`);
    const pr = prRes.rows[0] || null;

    const poRes = await db.execute(sql`SELECT po.id, po.po_number as code FROM purchase_order_items poi JOIN purchase_orders po ON poi.po_id = po.id WHERE poi.material_id = ${materialId} LIMIT 1`);
    const po = poRes.rows[0] || null;

    let grn = null;
    if (poRes.rows.length > 0) {
      const grnRes = await db.execute(sql`SELECT gr.id, gr.receipt_number as code FROM goods_receipt_items gri JOIN goods_receipts gr ON gri.receipt_id = gr.id WHERE gri.material_id = ${materialId} OR gri.po_item_id IN (SELECT id FROM purchase_order_items WHERE material_id = ${materialId}) LIMIT 1`);
      grn = grnRes.rows[0] || null;
    } else {
      const grnRes = await db.execute(sql`SELECT gr.id, gr.receipt_number as code FROM goods_receipt_items gri JOIN goods_receipts gr ON gri.receipt_id = gr.id WHERE gri.material_id = ${materialId} LIMIT 1`);
      grn = grnRes.rows[0] || null;
    }

    const invRes = await db.execute(sql`SELECT id, quantity as qty, available_quantity FROM inventory_balances WHERE material_id = ${materialId} LIMIT 1`);
    const inventory = invRes.rows[0] || null;

    const prodRes = await db.execute(sql`SELECT po.id, po.code FROM material_consumptions mc JOIN production_orders po ON mc.production_order_id = po.id WHERE mc.material_id = ${materialId} LIMIT 1`);
    const prod = prodRes.rows[0] || null;

    const lineage = [
      { stage: 'Material', data: material, status: material ? 'ACTIVE' : 'MISSING' },
      { stage: 'BOQ', data: boq, status: boq ? 'ACTIVE' : 'PENDING' },
      { stage: 'Purchase Request', data: pr, status: pr ? 'ACTIVE' : 'PENDING' },
      { stage: 'Purchase Order', data: po, status: po ? 'ACTIVE' : 'PENDING' },
      { stage: 'Goods Receipt', data: grn, status: grn ? 'ACTIVE' : 'PENDING' },
      { stage: 'Inventory', data: inventory, status: inventory ? 'ACTIVE' : 'PENDING' },
      { stage: 'Production', data: prod, status: prod ? 'ACTIVE' : 'PENDING' }
    ];

    return NextResponse.json({ lineage });
  } catch (error: any) {
    return NextResponse.json({ error: String(error?.message || error) || 'Internal Server Error' }, { status: 500 });
  }
}
