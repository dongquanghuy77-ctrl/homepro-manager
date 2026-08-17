const libs = ['xlsx', 'exceljs'];
for (const lib of libs) {
  try { require(lib); console.log(lib + ' OK'); } catch(e) { console.log(lib + ' MISSING'); }
}
