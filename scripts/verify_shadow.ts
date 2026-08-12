// scripts/verify_shadow.ts
import fs from 'fs';

const before = JSON.parse(fs.readFileSync('shadow_before_counts.json', 'utf8'));
const after = JSON.parse(fs.readFileSync('shadow_after_counts.json', 'utf8'));

let pass = true;

for (const table of Object.keys(before)) {
  const bCount = before[table];
  const aCount = after[table] || 0;
  if (bCount !== aCount) {
    if (['leave_types'].includes(table)) {
      console.log(`Expected difference in ${table}: ${bCount} -> ${aCount}`);
    } else {
      console.error(`DATA INTEGRITY FAIL: ${table} count changed from ${bCount} to ${aCount}`);
      pass = false;
    }
  }
}
if (after['leave_types']) {
   console.log(`leave_types count: ${after['leave_types']}`);
}

if (pass) {
  console.log("DATA INTEGRITY VERIFIED");
} else {
  console.log("DATA INTEGRITY FAILED");
}
