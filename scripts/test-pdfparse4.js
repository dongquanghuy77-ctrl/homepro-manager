const { PDFParse, VerbosityLevel } = require('pdf-parse');

async function test() {
  const parser = new PDFParse({ verbosity: VerbosityLevel.ERRORS });

  // Test with URL approach
  const filePath = 'D:\\XƯỞNG HOMEPRO SG\\9. THÁNG 08.2026\\3. VĂN PHÒNG BẢO MINH\\060826_TKNT_VP BAO MINH.pdf';
  const fileUrl = 'file:///' + filePath.replace(/\\/g, '/').replace(/ /g, '%20');

  console.log('Trying URL:', fileUrl.substring(0, 80));
  try {
    await parser.load({ url: fileUrl });
    const text = await parser.getText();
    console.log('SUCCESS via URL. Keys:', Object.keys(text).join(','));
    console.log('totalPage:', text.totalPage);
  } catch(e) {
    console.log('URL failed:', e.message.substring(0, 100));
  }

  // Test with data approach  
  try {
    const fs = require('fs');
    const buf = fs.readFileSync(filePath);
    // Try as Uint8Array
    const uint8 = new Uint8Array(buf);
    await parser.load({ data: uint8 });
    const text = await parser.getText();
    console.log('SUCCESS via data:Uint8Array. totalPage:', text.totalPage);
    console.log('text keys:', Object.keys(text).join(','));
    if (text.pages) console.log('pages type:', typeof text.pages, Array.isArray(text.pages));
    if (text.content) console.log('content type:', typeof text.content, Array.isArray(text.content));
  } catch(e2) {
    console.log('data:Uint8Array failed:', e2.message.substring(0, 100));

    try {
      const fs = require('fs');
      const buf = fs.readFileSync(filePath);
      await parser.load({ data: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) });
      const text = await parser.getText();
      console.log('SUCCESS via data:ArrayBuffer. totalPage:', text.totalPage);
    } catch(e3) {
      console.log('data:ArrayBuffer failed:', e3.message.substring(0, 100));
    }
  }
}

test().catch(e => console.error('TOP:', e.message));
