import XLSX from 'xlsx';
import fs from 'fs';

const filePath = 'd:\\DỰ ÁN QUẢN LÝ XƯỞNG\\KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx';
const buffer = fs.readFileSync(filePath);
const workbook = XLSX.read(buffer, { type: 'buffer' });
const sheet = workbook.Sheets['NT'];
const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][];

console.log(`Total rows: ${rows.length}`);

let currentSection = 'Hạng mục chung';
let currentSubSection = '';
const items: any[] = [];

let totalContractValue = 0;

rows.forEach((r, idx) => {
  if (idx < 3) return; // Skip title header

  const col0 = String(r[0] || '').trim();
  const col1 = String(r[1] || '').trim();
  const col3 = String(r[3] || '').trim(); // ĐVT
  const col4 = r[4]; // Khối lượng
  const col5 = r[5]; // Đơn giá
  const col6 = r[6]; // Thành tiền
  const col7 = String(r[7] || '').trim(); // Ghi chú

  // Check section headers (A, B, C, D... or I, II...)
  if (/^[A-Z]$/.test(col0) && col1) {
    currentSection = col1;
    currentSubSection = '';
    return;
  }
  if (/^(I|II|III|IV|V|VI|VII|VIII|IX|X)$/.test(col0) && col1) {
    currentSubSection = col1;
    return;
  }

  // Check item row (STT is number or has description & unit)
  if (col1 && (typeof col0 === 'number' || /^\d+$/.test(col0) || col3)) {
    const qty = typeof col4 === 'number' ? col4 : parseFloat(String(col4)) || 0;
    const price = typeof col5 === 'number' ? col5 : parseFloat(String(col5)) || 0;
    const amount = typeof col6 === 'number' ? col6 : parseFloat(String(col6)) || (qty * price) || 0;

    totalContractValue += amount;

    items.push({
      stt: col0,
      section: currentSection,
      subSection: currentSubSection,
      title: col1.replace(/\r?\n/g, ' '),
      unit: col3,
      qty,
      price,
      amount,
      notes: col7,
    });
  }
});

console.log(`\nFound ${items.length} items across sections!`);
console.log(`Total Contract Value calculated: ${totalContractValue.toLocaleString('vi-VN')} VND`);

console.log('\nSample items:');
items.slice(0, 10).forEach((item, i) => {
  console.log(`${i + 1}. [${item.section} - ${item.subSection}] ${item.title} (${item.qty} ${item.unit}) -> Notes: ${item.notes}`);
});
