const fs = require('fs');
let code = fs.readFileSync('src/db/schema.ts', 'utf8');

// Find the first index of suppliers export
const firstIndex = code.indexOf('export const suppliers = pgTable(\'suppliers\'');
if (firstIndex !== -1) {
  // Find the second index of suppliers export
  const secondIndex = code.indexOf('export const suppliers = pgTable(\'suppliers\'', firstIndex + 1);
  if (secondIndex !== -1) {
    console.log('Found duplicate suppliers! Removing from index', secondIndex);
    // Find the end of that block: '});' after secondIndex
    const endBlock = code.indexOf('});', secondIndex);
    
    // Also remove the preceding comment block
    const commentBlock = '// ============================================================================\r\n// SUPPLIERS MODULE\r\n// ============================================================================\r\n';
    let startIndexToRemove = secondIndex;
    
    const beforeBlock = code.substring(secondIndex - commentBlock.length, secondIndex);
    if (beforeBlock === commentBlock || code.substring(secondIndex - commentBlock.length + 1, secondIndex) === commentBlock.replace(/\r/g, '')) {
       startIndexToRemove -= commentBlock.length;
    }

    code = code.substring(0, startIndexToRemove) + code.substring(endBlock + 4);
    fs.writeFileSync('src/db/schema.ts', code);
    console.log('Fixed!');
  } else {
    console.log('No duplicate found.');
  }
}
