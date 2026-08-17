const fs = require('fs');
const path = require('path');

const API_DIR = path.join(__dirname, '../src/app/api');

const extraFiles = [
  'projects/[id]/bao-minh-dashboard/route.ts',
  'projects/[id]/boq-summary/route.ts',
  'projects/[id]/report/route.ts',
  'dashboard/route.ts',
  'purchasing/purchase_orders/[id]/route.ts',
  'purchasing/purchase_orders/route.ts',
  'purchasing/purchase_requests/[id]/route.ts',
  'demo/route.ts',
  'source-center/[id]/extract/route.ts'
];

const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

function injectAuth(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }
  let content = fs.readFileSync(filePath, 'utf-8');
  let changed = false;

  if (!content.includes('requireAuth')) {
    const importMatch = content.match(/import.*?;?\n/g);
    
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

  methods.forEach(method => {
    const regex = new RegExp(`export async function ${method}\\s*\\(([^)]*)\\)\\s*\\{`, 'g');
    
    content = content.replace(regex, (match, args) => {
      const methodBodyStart = content.indexOf(match) + match.length;
      const methodBodySnippet = content.substring(methodBodyStart, methodBodyStart + 100);
      if (methodBodySnippet.includes('requireAuth')) {
        return match;
      }
      changed = true;

      let newArgs = args;
      let reqName = 'req';
      
      if (!args.trim()) {
        newArgs = 'req: NextRequest';
      } else {
        const firstArg = args.split(',')[0].trim();
        if (firstArg.includes(':')) {
           reqName = firstArg.split(':')[0].trim();
        } else if (firstArg === 'req' || firstArg === 'request') {
           reqName = firstArg;
        } else {
           newArgs = `req: NextRequest, ${args}`;
        }
      }

      const role = (method === 'GET') ? 'ALL_ROLES' : 'MANAGER_AND_ABOVE';
      
      return `export async function ${method}(${newArgs}) {\n  const authResult = await requireAuth(${reqName} as any, ${role});\n  if (authResult.error) return authResult.error;\n`;
    });
  });

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`Secured: ${filePath}`);
  }
}

for (const relPath of extraFiles) {
  const fullPath = path.join(API_DIR, relPath);
  injectAuth(fullPath);
}

console.log(`Done processing extra files.`);
