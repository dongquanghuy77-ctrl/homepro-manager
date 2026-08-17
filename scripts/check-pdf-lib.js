try { require('pdf-parse'); process.stdout.write('HAS_PDF_PARSE\n'); }
catch(e) { process.stdout.write('NO_PDF_PARSE: ' + e.message + '\n'); }
try { require('pdfjs-dist'); process.stdout.write('HAS_PDFJS\n'); }
catch(e) { process.stdout.write('NO_PDFJS: ' + e.message + '\n'); }
