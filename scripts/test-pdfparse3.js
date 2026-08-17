const pp = require('pdf-parse');
const fs = require('fs');
const pdfBuf = fs.readFileSync('D:\\XƯỞNG HOMEPRO SG\\9. THÁNG 08.2026\\3. VĂN PHÒNG BẢO MINH\\060826_TKNT_VP BAO MINH.pdf');

// Check PDFParse prototype
const PDFParse = pp.PDFParse;
console.log('PDFParse prototype methods:', Object.getOwnPropertyNames(PDFParse.prototype).join(','));

// Try with VerbosityLevel
const vl = pp.VerbosityLevel;
console.log('VerbosityLevel:', JSON.stringify(vl));

try {
  const inst = new PDFParse({ verbosity: 0 });
  console.log('inst methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(inst)).join(','));
  const result = inst.parse ? inst.parse(pdfBuf) : null;
  if (result && result.then) {
    result.then(r => console.log('parse() pages:', r.numpages)).catch(e => console.log('parse err:', e.message));
  }
} catch(e) {
  console.log('err with verbosity:0 :', e.message);
  // Try with the VerbosityLevel enum
  try {
    const inst2 = new PDFParse({ verbosity: vl ? vl.ERRORS : 0 });
    const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(inst2));
    console.log('inst2 methods:', methods.join(','));
  } catch(e2) {
    console.log('err2:', e2.message);
  }
}
