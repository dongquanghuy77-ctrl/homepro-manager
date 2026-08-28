import * as xlsx from 'xlsx';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { pwrMaterials } from '@/db/schema';

// Chuẩn hóa tên (Xóa khoảng trắng, chuyển in hoa)
function normalize(str: string) {
  if (!str) return '';
  return str.toString().replace(/\s+/g, '').toUpperCase();
}

// Phân loại vật tư dựa trên Đơn vị tính (unit) hoặc Tên
function parseItemName(rawName: string, rawUnit: string) {
  let name = rawName.toString();
  let type = 'OTHER';
  const unit = (rawUnit || '').toLowerCase().trim();
  
  if (unit === 'tấm' || unit === 'tam') {
    type = 'BOARD';
  } else if (unit === 'm' || unit === 'mét' || unit === 'met') {
    type = 'EDGE_BAND';
  } else if (unit === 'cái' || unit === 'bộ' || unit === 'chiếc') {
    type = 'HARDWARE';
  }
  
  // Xử lý nẹp (ví dụ: Nẹp dán cạnh~AC 631 17.5~Chỉ 2P)
  if (name.toLowerCase().includes('nẹp') || name.includes('~')) {
    type = 'EDGE_BAND';
    // Bóc tách tên thật của Nẹp, ví dụ lấy phần ở giữa
    const parts = name.split('~');
    if (parts.length >= 2) {
      name = parts[1].trim(); // AC 631 17.5
    }
  }

  // Fallback nếu không có ĐVT rõ ràng nhưng tên có chữ Ván
  if (type === 'OTHER' && (name.toLowerCase().includes('ván') || name.toLowerCase().includes('mdf') || name.toLowerCase().includes('mfc'))) {
    type = 'BOARD';
  }

  return { name, type };
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Đọc Excel bằng xlsx
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    
    // Tìm Sheet BOM
    const bomSheetName = workbook.SheetNames.find(n => n.toUpperCase() === 'BOM');
    if (!bomSheetName) {
      return NextResponse.json({ error: 'Không tìm thấy Sheet mang tên BOM trong file.' }, { status: 400 });
    }

    const worksheet = workbook.Sheets[bomSheetName];
    // parse thành json, dạng array of arrays để dễ xử lý header
    const rawData = xlsx.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    
    // Tìm dòng header
    let headerRowIdx = -1;
    let colNameIdx = -1;
    let colQtyIdx = -1;
    let colUnitIdx = -1;

    for (let i = 0; i < Math.min(10, rawData.length); i++) {
      const row = rawData[i];
      if (!row) continue;
      
      const rowStr = row.map(c => String(c || '').toLowerCase());
      if (rowStr.some(c => c.includes('hạng mục') || c.includes('tên'))) {
        headerRowIdx = i;
        colNameIdx = rowStr.findIndex(c => c.includes('hạng mục') || c.includes('vật liệu') || c.includes('tên'));
        colQtyIdx = rowStr.findIndex(c => c.includes('số lượng') || c.includes('sl'));
        colUnitIdx = rowStr.findIndex(c => c.includes('đơn vị') || c.includes('đvt'));
        break;
      }
    }

    if (headerRowIdx === -1 || colNameIdx === -1) {
      return NextResponse.json({ error: 'Không nhận diện được cấu trúc cột. Cần các cột: Hạng mục, Số lượng, Đơn vị' }, { status: 400 });
    }

    // Lấy toàn bộ Master Data hiện có từ DB
    const masterData = await db.select().from(pwrMaterials);

    const parsedItems = [];

    // Duyệt dữ liệu
    for (let i = headerRowIdx + 1; i < rawData.length; i++) {
      const row = rawData[i];
      if (!row || !row[colNameIdx]) continue; // Skip dòng rỗng

      const rawItemName = String(row[colNameIdx]);
      if (rawItemName.toLowerCase().includes('tổng cộng')) continue; // Skip dòng tổng

      const rawQty = row[colQtyIdx] ? parseFloat(String(row[colQtyIdx])) : 0;
      const rawUnit = row[colUnitIdx] ? String(row[colUnitIdx]).trim() : '';
      
      const { name, type } = parseItemName(rawItemName, rawUnit);
      const normalizedName = normalize(name);

      // Thuật toán đối chiếu (Fuzzy Match cơ bản)
      const exactMatch = masterData.find(m => normalize(m.name) === normalizedName || normalize(m.skuCode) === normalizedName);
      
      parsedItems.push({
        rawName: rawItemName,
        parsedName: name,
        type: type,
        quantity: rawQty,
        unit: rawUnit,
        status: exactMatch ? 'MATCHED' : 'MISSING',
        dbMaterialId: exactMatch ? exactMatch.id : null,
        dbMaterialName: exactMatch ? exactMatch.name : null
      });
    }

    return NextResponse.json({ 
      fileName: file.name,
      items: parsedItems,
      totalMatched: parsedItems.filter(i => i.status === 'MATCHED').length,
      totalMissing: parsedItems.filter(i => i.status === 'MISSING').length,
    });

  } catch (error: any) {
    console.error('PARSE ERR:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
