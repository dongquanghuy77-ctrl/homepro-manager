const { PDFParse, VerbosityLevel } = require('pdf-parse');
const filePath = 'D:\\XƯỞNG HOMEPRO SG\\9. THÁNG 08.2026\\3. VĂN PHÒNG BẢO MINH\\060826_TKNT_VP BAO MINH.pdf';

async function test() {
  // Approach: load with string path directly
  const parser = new PDFParse({ verbosity: VerbosityLevel.ERRORS });
  
  try {
    // Pass raw path string
    await parser.load(filePath);
    const text = await parser.getText();
    console.log('SUCCESS with string path!');
    console.log('keys:', Object.keys(text).join(','));
    console.log('totalPage:', text.totalPage);
    if (text.content) {
      console.log('content type:', typeof text.content, Array.isArray(text.content));
      if (Array.isArray(text.content)) {
        console.log('content[0] keys:', Object.keys(text.content[0]||{}).join(','));
        console.log('content[0] sample:', JSON.stringify(text.content[0]).substring(0,200));
      }
    }
    if (text.pages) {
      console.log('pages type:', typeof text.pages, Array.isArray(text.pages));
    }
    return;
  } catch(e) {
    console.log('String path failed:', e.message.substring(0,100));
  }

  // Try URL-encoded path  
  try {
    const url = require('url').pathToFileURL(filePath).href;
    console.log('Trying fileURL:', url.substring(0,80));
    const parser2 = new PDFParse({ verbosity: VerbosityLevel.ERRORS });
    await parser2.load(url);
    const text = await parser2.getText();
    console.log('SUCCESS with fileURL! totalPage:', text.totalPage);
  } catch(e2) {
    console.log('fileURL failed:', e2.message.substring(0,100));
  }
}

test().catch(e => console.error('TOP:', e.message));
