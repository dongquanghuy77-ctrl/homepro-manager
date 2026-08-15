import 'dotenv/config';
import { db } from '../src/db';
import { 
  projects, boqItems, materials, purchaseOrders, purchaseOrderItems,
  goodsReceipts, goodsReceiptItems, inventoryBalances, inventoryTransactions,
  productionOrders, productionOutputs, qcIssues, costs, tasks
} from '../src/db/schema';
import { eq, sql, inArray, and } from 'drizzle-orm';

async function auditProjectFlow() {
  console.log("=== BẮT ĐẦU MASTER E2E BUSINESS FLOW AUDIT ===");
  const projectCode = 'BV-HUE-15B-SIM';

  const [project] = await db.select().from(projects).where(eq(projects.code, projectCode));
  if (!project) {
    console.error(`❌ LỖI: Không tìm thấy Project ${projectCode}`);
    process.exit(1);
  }
  console.log(`✅ [PROJECT] Tồn tại ID: ${project.id}, Name: ${project.name}, Value: ${project.contractValue}`);
  
  if (project.contractValue !== 15000000000) {
    console.error(`❌ LỖI: Giá trị hợp đồng không phải 15 tỷ VND. Thực tế: ${project.contractValue}`);
    process.exit(1);
  }

  // BOQ
  const boqs = await db.select().from(boqItems).where(eq(boqItems.projectId, project.id));
  if (boqs.length === 0) {
    console.error(`❌ LỖI: Không có BOQ cho dự án ${projectCode}`);
    process.exit(1);
  }
  const totalBoq = boqs.reduce((sum, item) => sum + ((item.unitPrice || 0) * (item.qtyRequired || 0)), 0);
  console.log(`✅ [BOQ] Số lượng hạng mục: ${boqs.length}. Tổng giá trị BOQ: ${totalBoq}`);
  
  // Materials
  const materialIds = boqs.map(b => b.materialId).filter(id => id !== null) as number[];
  if (materialIds.length === 0) {
    console.log(`⚠️ CẢNH BÁO: BOQ không map tới bất kỳ Material ID nào.`);
  } else {
    const mats = await db.select().from(materials).where(inArray(materials.id, materialIds));
    console.log(`✅ [MATERIAL] Map được ${mats.length} vật tư từ BOQ.`);
  }

  // Purchase Orders
  const pos = await db.select().from(purchaseOrders).where(eq(purchaseOrders.projectId, project.id));
  console.log(`✅ [PROCUREMENT] Có ${pos.length} Purchase Orders.`);
  
  if (pos.length > 0) {
    const poIds = pos.map(p => p.id);
    const poItems = await db.select().from(purchaseOrderItems).where(inArray(purchaseOrderItems.poId, poIds));
    const totalPOValue = pos.reduce((sum, po) => sum + po.total, 0);
    console.log(`   └─ Tổng giá trị PO: ${totalPOValue}. Số lượng PO Items: ${poItems.length}`);
    
    // Goods Receipts
    const grs = await db.select().from(goodsReceipts).where(inArray(goodsReceipts.poId, poIds));
    console.log(`✅ [INVENTORY] Có ${grs.length} Goods Receipts từ các PO này.`);
  }

  // Inventory Transactions
  const txs = await db.select().from(inventoryTransactions).where(eq(inventoryTransactions.projectId, project.id));
  console.log(`✅ [INVENTORY TX] Có ${txs.length} giao dịch kho thuộc dự án.`);

  // Production Orders
  const prods = await db.select().from(productionOrders).where(eq(productionOrders.projectId, project.id));
  console.log(`✅ [PRODUCTION] Có ${prods.length} lệnh sản xuất.`);

  // QC Issues
  const qcs = await db.select().from(qcIssues).where(eq(qcIssues.projectId, project.id));
  console.log(`✅ [QC] Có ${qcs.length} QC issues.`);

  // Costing
  const costRecords = await db.select().from(costs).where(eq(costs.projectId, project.id));
  const totalCost = costRecords.reduce((sum, c) => sum + c.amount, 0);
  console.log(`✅ [COSTING] Có ${costRecords.length} record chi phí. Tổng cộng: ${totalCost}`);

  // Progress (Tasks)
  const projectTasks = await db.select().from(tasks).where(eq(tasks.projectId, project.id));
  console.log(`✅ [PROGRESS] Có ${projectTasks.length} task tiến độ.`);

  console.log("\n=== CROSS-MODULE TRACEABILITY VERIFICATION ===");
  let traceErrors = 0;
  
  // Verify PO -> GR -> Inventory
  if (pos.length > 0) {
     for (const po of pos) {
        const grs = await db.select().from(goodsReceipts).where(eq(goodsReceipts.poId, po.id));
        if (grs.length === 0) {
            console.log(`⚠️ PO ${po.poNumber} không có Goods Receipt.`);
        } else {
            for (const gr of grs) {
                const grTxs = await db.select().from(inventoryTransactions).where(and(eq(inventoryTransactions.referenceId, gr.id), eq(inventoryTransactions.referenceType, 'GR')));
                if (grTxs.length === 0) {
                    console.error(`❌ GR ${gr.receiptNumber} không tạo Inventory Transaction!`);
                    traceErrors++;
                }
            }
        }
     }
  }

  // Verify Production -> Inventory Issue
  if (prods.length > 0) {
     for (const prod of prods) {
         const issueTxs = await db.select().from(inventoryTransactions).where(and(eq(inventoryTransactions.referenceId, prod.id), eq(inventoryTransactions.referenceType, 'PRODUCTION')));
         if (issueTxs.length === 0) {
             console.error(`❌ Lệnh SX ${prod.code} không có xuất kho (Inventory Transaction type PRODUCTION)!`);
             traceErrors++;
         }
     }
  }

  console.log("\n=== TỔNG KẾT BÁO CÁO ===");
  if (traceErrors > 0) {
      console.error(`❌ PHÁT HIỆN ${traceErrors} LỖI ĐỨT GÃY LIÊN KẾT (BROKEN TRACEABILITY)!`);
      process.exit(1);
  } else {
      console.log(`🎉 PROJECT FLOW CHẠY XUYÊN SUỐT KHÔNG ĐỨT GÃY! (0 LỖI)`);
      process.exit(0);
  }
}

auditProjectFlow().catch(err => {
  console.error("❌ LỖI E2E AUDIT:", err);
  process.exit(1);
});
