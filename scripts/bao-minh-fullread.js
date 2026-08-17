const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(process.cwd(), 'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx');
const wb = XLSX.readFile(filePath);
const ws = wb.Sheets['NT'];
const range = XLSX.utils.decode_range(ws['!ref']);

console.log('=== ALL ROWS (1-123) ===\n');

for (let r = 0; r <= range.e.r; r++) {
  const cols = [];
  for (let c = 0; c <= range.e.c; c++) {
    const cellAddr = XLSX.utils.encode_cell({ r, c });
    const cell = ws[cellAddr];
    const val = cell ? (cell.v !== undefined ? String(cell.v) : '') : '';
    cols.push(val);
  }
  
  // Skip completely empty rows
  if (!cols.some(v => v.trim())) continue;
  
  // Print with column labels A-H
  const formatted = cols.map((v, i) => {
    const col = String.fromCharCode(65 + i);
    return `${col}:"${v.replace(/\n/g, '\\n').replace(/\r/g, '').substring(0, 60)}"`;
  }).filter(s => !s.endsWith('""'));
  
  console.log(`R${String(r+1).padStart(3,'0')}: ${formatted.join('  |  ')}`);
}
