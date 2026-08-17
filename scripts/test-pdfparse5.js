const fs = require('fs');
const src = fs.readFileSync('node_modules/pdf-parse/dist/pdf-parse/cjs/index.cjs', 'utf8');
// Find load method
const idx = src.indexOf('load(');
if (idx >= 0) {
  process.stdout.write('LOAD SOURCE:\n' + src.substring(idx, idx + 600) + '\n\n');
}
// Find getDocument usage
const gdi = src.indexOf('getDocument');
process.stdout.write('GETDOCUMENT:\n' + src.substring(gdi, gdi+400) + '\n\n');
// Find url parameter
const urli = src.indexOf('"url"');
if (urli >= 0) process.stdout.write('URL USAGE:\n' + src.substring(urli-100, urli+200) + '\n');
const urli2 = src.indexOf("'url'");
if (urli2 >= 0) process.stdout.write('URL2 USAGE:\n' + src.substring(urli2-100, urli2+200) + '\n');
