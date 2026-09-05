const fs = require('fs');
let code = fs.readFileSync('src/app/api/pwr/station/tasks/route.ts', 'utf8');

// Find: .orderBy(pwrTasks.priority)
// Replace with raw SQL sorting weight
code = code.replace(
  /\.orderBy\(pwrTasks\.priority\)/,
  `.orderBy(sql\`CASE 
          WHEN \${pwrTasks.priority} = 'CRITICAL' THEN 1 
          WHEN \${pwrTasks.priority} = 'HIGH' THEN 2 
          WHEN \${pwrTasks.priority} = 'MEDIUM' THEN 3 
          WHEN \${pwrTasks.priority} = 'LOW' THEN 4 
          ELSE 5 END ASC, \${pwrTasks.createdAt} ASC\`)`
);

// We need to import sql if not already imported
if (!code.includes('sql } from "drizzle-orm"')) {
  code = code.replace(/import \{ eq, and, isNull, inArray \} from "drizzle-orm";/, 'import { eq, and, isNull, inArray, sql } from "drizzle-orm";');
}

fs.writeFileSync('src/app/api/pwr/station/tasks/route.ts', code, 'utf8');
