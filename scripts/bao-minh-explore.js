const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const filePath = path.join(process.cwd(), 'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx');
console.log('File:', filePath);
console.log('Exists:', fs.existsSync(filePath));

const wb = XLSX.readFile(filePath, { cellStyles: true, cellNF: true });

console.log('\n=== SHEETS ===');
console.log('Sheet count:', wb.SheetNames.length);
wb.SheetNames.forEach((name, i) => {
  const ws = wb.Sheets[name];
  const range = ws['!ref'];
  console.log(`[${i}] "${name}" range: ${range}`);
});

// Read first sheet in detail
const firstSheet = wb.SheetNames[0];
const ws = wb.Sheets[firstSheet];
console.log('\n=== FIRST SHEET: ' + firstSheet + ' ===');

// Get all cells with content - first 200 rows
const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:Z1');
console.log('Range rows:', range.e.r + 1, 'cols:', range.e.c + 1);

// Print first 30 rows raw
console.log('\n=== FIRST 30 ROWS RAW ===');
for (let r = 0; r <= Math.min(29, range.e.r); r++) {
  const rowData = [];
  for (let c = 0; c <= Math.min(20, range.e.c); c++) {
    const cellAddr = XLSX.utils.encode_cell({ r, c });
    const cell = ws[cellAddr];
    rowData.push(cell ? (cell.v !== undefined ? String(cell.v).substring(0, 30) : '') : '');
  }
  // Only print rows with content
  if (rowData.some(v => v.trim())) {
    console.log(`R${r + 1}: ${rowData.join(' | ')}`);
  }
}
