import XLSX from 'xlsx';
import fs from 'fs';

const filePath = 'd:\\DỰ ÁN QUẢN LÝ XƯỞNG\\KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx';
const buffer = fs.readFileSync(filePath);
const workbook = XLSX.read(buffer, { type: 'buffer' });

console.log('=== SHEET NAMES ===');
console.log(workbook.SheetNames);

for (const sheetName of workbook.SheetNames) {
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  const nonEmp = data.filter(r => Array.isArray(r) && r.some(c => String(c).trim() !== ''));
  console.log(`\n--- SHEET: ${sheetName} (Total Rows: ${data.length}, Non-empty: ${nonEmp.length}) ---`);
  console.log('Sample non-empty rows (first 15):');
  nonEmp.slice(0, 15).forEach((r, idx) => console.log(`Row ${idx+1}:`, JSON.stringify(r.slice(0, 12))));
}
