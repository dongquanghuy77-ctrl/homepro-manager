import 'dotenv/config';
import { db } from '../src/db';
import { qrCodes, materials } from '../src/db/schema';
import { eq, sql } from 'drizzle-orm';
import { QrService } from '../src/lib/tracking/qr_service';

async function main() {
  console.log("=== BẮT ĐẦU E2E QR TRACKING TEST ===");

  try {
    console.log("⏳ Cleanup old E2E data...");
    await db.delete(qrCodes).where(sql`metadata->>'test' = 'E2E_QR'`);

    // 1. Setup Data
    let mat = await db.select().from(materials).limit(1);
    if (!mat.length) throw new Error("No material found for testing");
    const testMat = mat[0];

    // 2. Generate QR
    console.log("✅ Test 01: Generate QR");
    const qr = await QrService.generateQr({
      entityType: 'MATERIAL',
      entityId: testMat.id,
      metadata: { test: 'E2E_QR', desc: 'Test QR Generation' }
    });
    console.log(`   -> Generated QR: ${qr.qrValue}`);

    // 3. Resolve QR
    console.log("✅ Test 02: Resolve QR");
    const resolved = await QrService.resolveQr(qr.qrValue);
    if (!resolved.entity || resolved.entity.id !== testMat.id) {
      throw new Error("Failed to resolve the correct entity from QR");
    }
    console.log(`   -> Resolved Entity Name: ${(resolved.entity as any).name}`);

    // 4. Trace QR
    console.log("✅ Test 03: Trace Lineage");
    const trace = await QrService.traceOrigins(qr.qrValue);
    if (trace.target.qr.qrValue !== qr.qrValue) {
      throw new Error("Trace failed");
    }
    console.log(`   -> Trace successful`);

    // 5. Invalid QR
    console.log("✅ Test 04: Invalid QR Handling");
    try {
      await QrService.resolveQr("FAKE_QR_12345");
      throw new Error("Should have thrown error for fake QR");
    } catch (e: any) {
      if (e.message !== 'QR Code not found') throw e;
      console.log(`   -> Correctly rejected invalid QR`);
    }

    // 6. Deactivate QR
    console.log("✅ Test 05: Deactivate QR");
    await QrService.deactivateQr(qr.qrValue);
    try {
      await QrService.resolveQr(qr.qrValue);
      throw new Error("Should have thrown error for deactivated QR");
    } catch (e: any) {
      if (!e.message.includes('QR Code is DEACTIVATED')) throw e;
      console.log(`   -> Correctly rejected deactivated QR`);
    }

    console.log("🎉 ALL QR TRACKING TESTS PASSED");
    process.exit(0);

  } catch (error) {
    console.error("❌ E2E Failed:", error);
    process.exit(1);
  }
}

main();
