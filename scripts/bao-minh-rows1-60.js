const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(process.cwd(), 'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx');
const wb = XLSX.readFile(filePath);
const ws = wb.Sheets['NT'];
const range = XLSX.utils.decode_range(ws['!ref']);

// Print ROWS 1-60 fully (no truncation)
for (let r = 0; r <= 59; r++) {
  const cols = [];
  for (let c = 0; c <= range.e.c; c++) {
    const cellAddr = XLSX.utils.encode_cell({ r, c });
    const cell = ws[cellAddr];
    const val = cell ? (cell.v !== undefined ? String(cell.v) : '') : '';
    cols.push(val);
  }
  if (!cols.some(v => v.trim())) continue;
  const colLabels = 'ABCDEFGH';
  const parts = cols.map((v, i) => `${colLabels[i]}:"${v.replace(/\n/g, '\\n').replace(/\r/g, '')}"`).filter(s => !s.endsWith('""'));
  console.log(`R${String(r+1).padStart(3,'0')}: ${parts.join('  |  ')}`);
}
