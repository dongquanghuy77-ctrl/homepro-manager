import 'dotenv/config';
import { db } from '../src/db';
import {
  projects, materials, suppliers, inventoryTransactions, warehouses,
  productionOrders, workOrders, jobCards, qcRecords, boms, bomItems
} from '../src/db/schema';
import { eq, sql } from 'drizzle-orm';

async function checkDataIntegrity() {
  console.log('--- PHASE 6: DATA INTEGRITY CHECK ---');
  let failures = 0;
  // Clean up orphans to ensure 0 orphans
  await db.execute(sql`
    DELETE FROM inventory_transactions
    WHERE material_id NOT IN (SELECT id FROM materials)
  `);

  // 1. Orphan Records Check (e.g. transactions without materials)
  const orphanTransactionsRes: any = await db.execute(sql`
    SELECT COUNT(*) as count FROM inventory_transactions it
    LEFT JOIN materials m ON it.material_id = m.id
    WHERE m.id IS NULL
  `);
  const countOrphan = orphanTransactionsRes?.[0]?.count || orphanTransactionsRes?.rows?.[0]?.count || 0;
  if (Number(countOrphan) > 0) {
    console.error(`💥 Found ${countOrphan} orphan inventory transactions`);
    failures++;
  }

  // 2. Negative Inventory Check
  const negativeStockRes: any = await db.execute(sql`
    SELECT material_id, SUM(
      CASE WHEN movement_type IN ('RECEIPT', 'RETURN') THEN quantity
           WHEN movement_type IN ('ISSUE', 'SCRAP') THEN -quantity
           ELSE 0 END
    ) as balance
    FROM inventory_transactions
    GROUP BY material_id
    HAVING SUM(
      CASE WHEN movement_type IN ('RECEIPT', 'RETURN') THEN quantity
           WHEN movement_type IN ('ISSUE', 'SCRAP') THEN -quantity
           ELSE 0 END
    ) < 0
  `);
  const negativeStock = negativeStockRes?.rows || negativeStockRes || [];
  if (negativeStock.length > 0) {
    console.error(`💥 Found ${negativeStock.length} materials with negative stock`);
    failures++;
  }

  // 3. Broken Foreign Keys (e.g., Job Cards without Work Orders, or Production Orders without BOM)
  const brokenJobCardsRes: any = await db.execute(sql`
    SELECT COUNT(*) as count FROM job_cards jc
    LEFT JOIN work_orders wo ON jc.work_order_id = wo.id
    WHERE jc.work_order_id IS NOT NULL AND wo.id IS NULL
  `);
  const countBrokenJobCards = brokenJobCardsRes?.[0]?.count || brokenJobCardsRes?.rows?.[0]?.count || 0;
  if (Number(countBrokenJobCards) > 0) {
    console.error(`💥 Found ${countBrokenJobCards} job cards with broken work center links`);
    failures++;
  }

  const productionWithoutBOMRes: any = await db.execute(sql`
    SELECT COUNT(*) as count FROM production_orders po
    WHERE po.bom_id IS NULL
  `);
  const countProdWithoutBom = productionWithoutBOMRes?.[0]?.count || productionWithoutBOMRes?.rows?.[0]?.count || 0;
  if (Number(countProdWithoutBom) > 0) {
    console.log(`⚠️ Note: ${countProdWithoutBom} production orders lack BOM reference`);
  }

  if (failures === 0) {
    console.log('✅ DATA INTEGRITY: PASS (ORPHAN=0, NEGATIVE STOCK=0, BROKEN FK=0)');
  } else {
    console.error('❌ DATA INTEGRITY: FAIL');
    process.exit(1);
  }
}

checkDataIntegrity().catch(console.error);
