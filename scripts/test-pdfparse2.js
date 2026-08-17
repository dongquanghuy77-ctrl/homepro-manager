const pp = require('pdf-parse');
const fs = require('fs');
// Try all exported keys
console.log('All keys:', JSON.stringify(Object.keys(pp)));
// Try calling parse function directly
const pdfBuf = fs.readFileSync('D:\\XƯỞNG HOMEPRO SG\\9. THÁNG 08.2026\\3. VĂN PHÒNG BẢO MINH\\060826_TKNT_VP BAO MINH.pdf');
// Try different API patterns
if (typeof pp.parse === 'function') {
  pp.parse(pdfBuf).then(r => { console.log('parse() worked, pages:', r.numpages); }).catch(e => console.log('parse() err:', e.message));
} else if (typeof pp.default === 'function') {
  pp.default(pdfBuf).then(r => { console.log('default() worked, pages:', r.numpages); }).catch(e => console.log('default() err:', e.message));
} else {
  // Try creating with options object
  try {
    const inst = new pp.PDFParse({});
    inst.pdf(pdfBuf).then(r => { console.log('PDFParse({}) worked, pages:', r.numpages); }).catch(e => console.log('inst.pdf err:', e.message));
  } catch(e2) {
    console.log('PDFParse({}) err:', e2.message);
  }
}
