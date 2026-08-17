const fs = require('fs');
const path = require('path');
// Use a Node.js approach to list directory with Unicode
const dirPath = 'D:\\XƯỞNG HOMEPRO SG\\9. THÁNG 08.2026\\3. VĂN PHÒNG BẢO MINH';
try {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  entries.forEach(e => {
    const fp = path.join(dirPath, e.name);
    let size = 0;
    try { size = e.isFile() ? fs.statSync(fp).size : 0; } catch(err) {}
    console.log(`${e.isDirectory()?'DIR ':'FILE'} ${e.name} ${size}`);
  });
} catch(err) {
  console.error('ERROR:', err.message);
}
