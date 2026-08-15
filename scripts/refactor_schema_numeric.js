const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '../src/db/schema.ts');
let content = fs.readFileSync(schemaPath, 'utf-8');

// Ensure numeric is imported
if (!content.includes('numeric')) {
  content = content.replace(/doublePrecision} from 'drizzle-orm\/pg-core';/, 'doublePrecision, numeric} from \'drizzle-orm/pg-core\';');
}

// Map column names to their types
const mappings = [
  // Monetary (20, 2)
  { regex: /doublePrecision\('contract_value'\)/g, replacement: "numeric('contract_value', { precision: 20, scale: 2, mode: 'number' })" },
  { regex: /doublePrecision\('target_material_cost'\)/g, replacement: "numeric('target_material_cost', { precision: 20, scale: 2, mode: 'number' })" },
  { regex: /doublePrecision\('target_labor_cost'\)/g, replacement: "numeric('target_labor_cost', { precision: 20, scale: 2, mode: 'number' })" },
  { regex: /doublePrecision\('unit_price'\)/g, replacement: "numeric('unit_price', { precision: 20, scale: 2, mode: 'number' })" },
  { regex: /doublePrecision\('amount'\)/g, replacement: "numeric('amount', { precision: 20, scale: 2, mode: 'number' })" },
  { regex: /doublePrecision\('total'\)/g, replacement: "numeric('total', { precision: 20, scale: 2, mode: 'number' })" },
  { regex: /doublePrecision\('official_salary'\)/g, replacement: "numeric('official_salary', { precision: 20, scale: 2, mode: 'number' })" },
  { regex: /doublePrecision\('basic_salary'\)/g, replacement: "numeric('basic_salary', { precision: 20, scale: 2, mode: 'number' })" },
  { regex: /doublePrecision\('attendance_allowance'\)/g, replacement: "numeric('attendance_allowance', { precision: 20, scale: 2, mode: 'number' })" },
  { regex: /doublePrecision\('gross_earnings'\)/g, replacement: "numeric('gross_earnings', { precision: 20, scale: 2, mode: 'number' })" },
  { regex: /doublePrecision\('total_deductions'\)/g, replacement: "numeric('total_deductions', { precision: 20, scale: 2, mode: 'number' })" },
  { regex: /doublePrecision\('net_salary'\)/g, replacement: "numeric('net_salary', { precision: 20, scale: 2, mode: 'number' })" },
  { regex: /doublePrecision\('bhxh_employee'\)/g, replacement: "numeric('bhxh_employee', { precision: 20, scale: 2, mode: 'number' })" },
  { regex: /doublePrecision\('bhxh_employer'\)/g, replacement: "numeric('bhxh_employer', { precision: 20, scale: 2, mode: 'number' })" },
  { regex: /doublePrecision\('price'\)/g, replacement: "numeric('price', { precision: 20, scale: 2, mode: 'number' })" },
  { regex: /doublePrecision\('debit'\)/g, replacement: "numeric('debit', { precision: 20, scale: 2, mode: 'number' })" },
  { regex: /doublePrecision\('credit'\)/g, replacement: "numeric('credit', { precision: 20, scale: 2, mode: 'number' })" },

  // Quantity / Rates (18, 4)
  { regex: /doublePrecision\('stock_qty'\)/g, replacement: "numeric('stock_qty', { precision: 18, scale: 4, mode: 'number' })" },
  { regex: /doublePrecision\('min_stock'\)/g, replacement: "numeric('min_stock', { precision: 18, scale: 4, mode: 'number' })" },
  { regex: /doublePrecision\('qty_required'\)/g, replacement: "numeric('qty_required', { precision: 18, scale: 4, mode: 'number' })" },
  { regex: /doublePrecision\('qty_ordered'\)/g, replacement: "numeric('qty_ordered', { precision: 18, scale: 4, mode: 'number' })" },
  { regex: /doublePrecision\('qty_received'\)/g, replacement: "numeric('qty_received', { precision: 18, scale: 4, mode: 'number' })" },
  { regex: /doublePrecision\('ordered_quantity'\)/g, replacement: "numeric('ordered_quantity', { precision: 18, scale: 4, mode: 'number' })" },
  { regex: /doublePrecision\('received_quantity'\)/g, replacement: "numeric('received_quantity', { precision: 18, scale: 4, mode: 'number' })" },
  { regex: /doublePrecision\('quantity'\)/g, replacement: "numeric('quantity', { precision: 18, scale: 4, mode: 'number' })" },
  { regex: /doublePrecision\('qty'\)/g, replacement: "numeric('qty', { precision: 18, scale: 4, mode: 'number' })" },
  
  // Note: All other doublePrecision() like hours, days, lat, lng will remain doublePrecision as they are not monetary!
];

for (const mapping of mappings) {
  content = content.replace(mapping.regex, mapping.replacement);
}

fs.writeFileSync(schemaPath, content);
console.log('Schema numeric migration completed.');
