import http from 'http';

const ROUTES_TO_TEST = [
  // PRODUCTION
  '/production',
  '/production/plans',
  '/production/orders',
  '/production/boms',
  '/production/routing',
  '/production/work-centers',
  '/production/machines',
  '/production/job-cards',
  '/production/receipts',
  '/production/scrap',
  '/qc',
  '/production/issues',
  '/production/products',
  '/production/costing',
  '/production/dashboard',
  // INVENTORY
  '/inventory/materials',
  '/inventory/suppliers',
  '/inventory/warehouses',
  '/inventory/counts',
  '/inventory/transactions',
  '/inventory/reservations',
  '/inventory/dashboard'
];

async function checkRoutes() {
  console.log('--- STARTING LOCAL ACCEPTANCE TESTS ---');
  let hasError = false;
  
  for (const route of ROUTES_TO_TEST) {
    try {
      const res = await new Promise<{statusCode: number, data: string}>((resolve, reject) => {
        const req = http.get(`http://127.0.0.1:3000${route}`, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => resolve({ statusCode: res.statusCode || 500, data }));
        });
        req.on('error', reject);
      });

      if (res.statusCode !== 200) {
        console.error(`❌ [FAIL] ${route} returned status ${res.statusCode}`);
        if (res.statusCode === 500) {
           console.error(`   Body snippet: ${res.data.substring(0, 500)}`);
        }
        hasError = true;
      } else {
        console.log(`✅ [PASS] ${route} (200 OK)`);
      }
    } catch (e: any) {
      console.error(`❌ [FAIL] ${route} network error: ${e.message}`);
      hasError = true;
    }
  }

  if (hasError) {
    console.error('--- TESTS FAILED ---');
    process.exit(1);
  } else {
    console.log('--- ALL ROUTES PASSED ---');
    process.exit(0);
  }
}

checkRoutes();
