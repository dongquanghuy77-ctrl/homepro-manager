import * as dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';
import * as fs from 'fs';

async function verifyUAT() {
  if (!fs.existsSync('.env.uat')) {
    console.error('FAIL: .env.uat does not exist.');
    process.exit(1);
  }

  // Parse .env.uat explicitly
  const envUAT = dotenv.parse(fs.readFileSync('.env.uat'));
  const uatDbUrl = envUAT.DATABASE_URL;

  if (!uatDbUrl) {
    console.error('FAIL: DATABASE_URL not found in .env.uat.');
    process.exit(1);
  }

  // Parse .env.local for comparison
  const envProd = dotenv.parse(fs.readFileSync('.env.local'));
  const prodDbUrl = envProd.DATABASE_URL;

  // Function to extract safe parts of URL
  function getSafeUrlInfo(urlStr: string) {
    try {
      const u = new URL(urlStr);
      return {
        host: u.hostname,
        database: u.pathname.slice(1),
        user: u.username,
        search: u.search
      };
    } catch {
      return null;
    }
  }

  const uatInfo = getSafeUrlInfo(uatDbUrl);
  const prodInfo = getSafeUrlInfo(prodDbUrl);

  if (!uatInfo || !prodInfo) {
    console.error('FAIL: Could not parse DATABASE_URL.');
    process.exit(1);
  }

  console.log(`[PRODUCTION INFO] Host: ${prodInfo.host}, DB: ${prodInfo.database}, Options: ${prodInfo.search}`);
  console.log(`[UAT INFO] Host: ${uatInfo.host}, DB: ${uatInfo.database}, Options: ${uatInfo.search}`);

  if (uatInfo.host === prodInfo.host && uatInfo.database === prodInfo.database && uatInfo.search === prodInfo.search) {
    console.error('FAIL: UAT connection is exactly the same as Production.');
    process.exit(1);
  }

  // Test Connection to UAT
  try {
    const sql = neon(uatDbUrl);
    
    const dbRes = await sql`SELECT current_database() as current_db`;
    const schemaRes = await sql`SELECT current_schema() as current_schema`;
    const userRes = await sql`SELECT current_user as current_user`;

    console.log(`[UAT CONNECTION RESULT]`);
    console.log(`current_database: ${dbRes[0].current_db}`);
    console.log(`current_schema: ${schemaRes[0].current_schema}`);
    console.log(`current_user: ${userRes[0].current_user}`);

    console.log('PASS: UAT Database connected and isolated from Production.');
  } catch (err: any) {
    console.error('FAIL: Could not connect to UAT Database or execute query:', err.message);
    process.exit(1);
  }
}

verifyUAT().catch(console.error);
