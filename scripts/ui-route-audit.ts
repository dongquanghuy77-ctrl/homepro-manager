import * as fs from 'fs';
import * as path from 'path';

// Parse navigation.ts to extract all routes
const navFilePath = path.join(process.cwd(), 'src/config/navigation.ts');
const navContent = fs.readFileSync(navFilePath, 'utf8');

const regex = /href:\s*'([^']+)'/g;
let match;
const routes: string[] = [];
while ((match = regex.exec(navContent)) !== null) {
  if (match[1] !== '#' && match[1].startsWith('/')) {
    routes.push(match[1]);
  }
}

// Remove duplicates
const uniqueRoutes = [...new Set(routes)];

console.log(`Found ${uniqueRoutes.length} unique routes in navigation.ts`);

let passed = 0;
let failed = 0;
const missingRoutes: string[] = [];

for (const route of uniqueRoutes) {
  // Mapping route to app directory
  let dirRoute = route === '/' ? '' : route;
  let pagePath = path.join(process.cwd(), 'src/app', dirRoute, 'page.tsx');
  
  if (fs.existsSync(pagePath)) {
    passed++;
  } else {
    // Check if it has a dynamic route or just missing
    failed++;
    missingRoutes.push(route);
  }
}

console.log('--- UI ROUTE AUDIT RESULT ---');
console.log(`TOTAL ROUTES: ${uniqueRoutes.length}`);
console.log(`PASS: ${passed}`);
console.log(`FAIL: ${failed}`);

if (failed > 0) {
  console.log('Missing pages for routes:');
  missingRoutes.forEach(r => console.log(` - ${r}`));
} else {
  console.log('✅ ALL ROUTES HAVE CORRESPONDING page.tsx!');
}
