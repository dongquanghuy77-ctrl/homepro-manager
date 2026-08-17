const fs = require('fs');
const path = require('path');

const API_DIR = path.join(__dirname, '../src/app/api');

// Function to recursively find all route.ts files
function findRouteFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      findRouteFiles(fullPath, fileList);
    } else if (file === 'route.ts') {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

function injectAuth(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let changed = false;

  // 1. Check if requireAuth is imported
  if (!content.includes('requireAuth')) {
    // Add import statement after the last import
    const importMatch = content.match(/import.*?;?\n/g);
    let importStatement = `import { requireAuth, ALL_ROLES, MANAGER_AND_ABOVE, ADMIN_ONLY } from '@/lib/auth';\nimport { NextRequest, NextResponse } from 'next/server';\n`;
    
    // Sometimes NextResponse is already imported, we'll just rely on standard imports.
    // Let's just do a simple replacement if NextRequest isn't there.
    if (!content.includes('NextRequest')) {
      content = content.replace(/import { NextResponse } from 'next\/server';/g, "import { NextRequest, NextResponse } from 'next/server';");
    }

    if (importMatch && importMatch.length > 0) {
      const lastImport = importMatch[importMatch.length - 1];
      content = content.replace(lastImport, lastImport + `import { requireAuth, ALL_ROLES, MANAGER_AND_ABOVE } from '@/lib/auth';\n`);
      changed = true;
    } else {
      content = `import { requireAuth, ALL_ROLES, MANAGER_AND_ABOVE } from '@/lib/auth';\n` + content;
      changed = true;
    }
  }

  // 2. Inject auth check into each handler
  methods.forEach(method => {
    // Regex to find export async function GET(req...) or POST(req...)
    // This is a naive regex and might need refinement
    const regex = new RegExp(`export async function ${method}\\s*\\(([^)]*)\\)\\s*\\{`, 'g');
    
    content = content.replace(regex, (match, args) => {
      // If it already has requireAuth, skip
      const methodBodyStart = content.indexOf(match) + match.length;
      const methodBodySnippet = content.substring(methodBodyStart, methodBodyStart + 100);
      if (methodBodySnippet.includes('requireAuth')) {
        return match;
      }
      changed = true;

      // Make sure req is available
      let newArgs = args;
      let reqName = 'req';
      
      if (!args.trim()) {
        newArgs = 'req: NextRequest';
      } else {
        // extract req name
        const firstArg = args.split(',')[0].trim();
        if (firstArg.includes(':')) {
           reqName = firstArg.split(':')[0].trim();
        } else if (firstArg === 'req' || firstArg === 'request') {
           reqName = firstArg;
        } else {
           // It's probably { params }
           newArgs = `req: NextRequest, ${args}`;
        }
      }

      // Determine role based on method
      const role = (method === 'GET') ? 'ALL_ROLES' : 'MANAGER_AND_ABOVE';
      
      return `export async function ${method}(${newArgs}) {\n  const authResult = await requireAuth(${reqName} as any, ${role});\n  if (authResult.error) return authResult.error;\n`;
    });
  });

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`Secured: ${filePath}`);
  }
}

const allRoutes = findRouteFiles(API_DIR);
console.log(`Found ${allRoutes.length} route files. Scanning...`);

const insecureDirs = ['crm', 'engineering', 'finance', 'installation', 'qc', 'materials', 'customers', 'boq', 'settings', 'tasks'];

let count = 0;
for (const file of allRoutes) {
  // Only process if it belongs to one of the insecure dirs
  if (insecureDirs.some(dir => file.includes(`\\api\\${dir}\\`) || file.includes(`/api/${dir}/`))) {
    try {
      injectAuth(file);
      count++;
    } catch (err) {
      console.error(`Failed to inject into ${file}: ${err.message}`);
    }
  }
}

console.log(`Done processing ${count} insecure files.`);
