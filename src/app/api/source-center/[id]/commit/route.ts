import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { 
  sourceDocuments, 
  sourceDocumentLines, 
  boqs, 
  boqItems,
  projects,
  sourceAuditLog
} from '@/db/schema';
import { eq, and, ne } from 'drizzle-orm';
import { requireAuth, MANAGER_AND_ABOVE } from '@/lib/auth';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { session, error } = await requireAuth(req as any, MANAGER_AND_ABOVE);
    if (error) return error;

    const docId = parseInt(params.id);
    if (isNaN(docId)) return NextResponse.json({ error: 'Invalid document ID' }, { status: 400 });

    // 1. Fetch document
    const [doc] = await db.select().from(sourceDocuments).where(eq(sourceDocuments.id, docId));
    if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 });

    if (!doc.projectId) {
      return NextResponse.json({ error: 'Tài liệu phải được gán vào một Dự án trước khi lưu BOQ' }, { status: 400 });
    }

    if (doc.sourceStatus === 'COMMITTED' || doc.sourceStatus === 'APPROVED') {
      return NextResponse.json({ error: 'Tài liệu này đã được chốt (Committed) trước đó' }, { status: 400 });
    }

    // 2. Fetch lines
    const lines = await db.select().from(sourceDocumentLines).where(eq(sourceDocumentLines.sourceDocId, docId));
    if (lines.length === 0) {
      return NextResponse.json({ error: 'Không tìm thấy dòng dữ liệu nào để lưu' }, { status: 400 });
    }

    // 3. Find or create BOQ for this project
    let [boq] = await db.select()
      .from(boqs)
      .where(and(eq(boqs.projectId, doc.projectId), ne(boqs.status, 'LOCKED')))
      .limit(1);

    if (!boq) {
      const [proj] = await db.select().from(projects).where(eq(projects.id, doc.projectId));
      const code = `BOQ-${proj?.code || doc.projectId}-${new Date().getTime().toString().slice(-6)}`;
      const [newBoq] = await db.insert(boqs).values({
        code,
        projectId: doc.projectId,
        version: '1.0',
        status: 'DRAFT',
        createdBy: session?.user?.id
      }).returning();
      boq = newBoq;
    }

    // 4. Insert lines into boq_items
    let itemsToInsert = [];
    for (const line of lines) {
      if (!line.normalizedValue) continue;
      
      try {
        const data = JSON.parse(line.normalizedValue);
        // data has: ten, soLuong, donVi, donGia, thanhTien, ghiChu
        if (!data.ten || data.ten.startsWith('__')) continue; 

        // Bỏ qua dòng có dạng tiêu đề (chứa STT, TÊN HÀNG, v.v)
        if (String(data.ten).toLowerCase().includes('tên mã sản phẩm') || String(data.ten).toLowerCase() === 'tên hàng hoá') continue;

        itemsToInsert.push({
          boqId: boq.id,
          projectId: doc.projectId,
          materialName: String(data.ten).substring(0, 255), // Max length
          unit: data.donVi || 'cái',
          unitPrice: data.donGia ? String(data.donGia) : '0',
          qtyRequired: data.soLuong ? String(data.soLuong) : '0',
          notes: data.ghiChu || null,
        });
      } catch (err) {
        console.warn(`Failed to parse normalized_value for line ${line.id}`);
      }
    }

    if (itemsToInsert.length > 0) {
      await db.insert(boqItems).values(itemsToInsert);
    }

    // 5. Update document status
    const [updatedDoc] = await db.update(sourceDocuments)
      .set({ sourceStatus: 'COMMITTED', updatedAt: new Date() })
      .where(eq(sourceDocuments.id, docId))
      .returning();

    // 6. Audit log
    await db.insert(sourceAuditLog).values({
      action: 'COMMIT_TO_BOQ',
      userId: session?.user?.id || 0,
      sourceDocId: docId,
      module: 'source-center',
      beforeData: JSON.stringify({ status: doc.sourceStatus }),
      afterData: JSON.stringify({ status: 'COMMITTED', boqId: boq.id, itemsCount: itemsToInsert.length }),
    });

    return NextResponse.json({ 
      success: true, 
      count: itemsToInsert.length,
      boqCode: boq.code 
    });

  } catch (error: any) {
    console.error('Commit BOQ error:', error);
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}
