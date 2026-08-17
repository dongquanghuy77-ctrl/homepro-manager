require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const projectId = 108;

    const requests = [
      {
        reqNum: 'PR-BM-HN-001',
        reason: 'Source: phiếu nhập vật tư [SOURCE-02] | BD-06 pending human confirmation | ERP staging only',
        items: [
          { matId: 1914, qty: 65, unit: 'Tấm', desc: 'MAT-HN-111G-175' },
          { matId: 1915, qty: 26, unit: 'Tấm', desc: 'MAT-HN-111G-10' }
        ]
      },
      {
        reqNum: 'PR-BM-BT-001',
        reason: 'Source: phiếu nhập vật tư [SOURCE-04] | BD-06 pending human confirmation | ERP staging only',
        items: [
          { matId: 1916, qty: 67, unit: 'Tấm', desc: 'MAT-BT-SC010MW-175' },
          { matId: 1917, qty: 21, unit: 'Tấm', desc: 'MAT-BT-SC010MW-10' },
          { matId: 1918, qty: 6, unit: 'Tấm', desc: 'MAT-BT-200T-175' }
        ]
      },
      {
        reqNum: 'PR-BM-AC-001',
        reason: 'Source: phiếu nhập vật tư [SOURCE-03] | BD-06 pending human confirmation | ERP staging only',
        items: [
          { matId: 1919, qty: 4, unit: 'Tấm', desc: 'MAT-AC-9205S-175' }
        ]
      }
    ];

    let createdPRs = 0;
    let createdItems = 0;

    for (const pr of requests) {
      const checkRes = await client.query('SELECT id FROM purchase_requests WHERE request_number = $1', [pr.reqNum]);
      let prId;

      if (checkRes.rows.length === 0) {
        const insertRes = await client.query(
          `INSERT INTO purchase_requests (request_number, request_date, project_id, status, reason, created_at, updated_at) 
           VALUES ($1, NOW(), $2, 'DRAFT', $3, NOW(), NOW()) RETURNING id`,
          [pr.reqNum, projectId, pr.reason]
        );
        prId = insertRes.rows[0].id;
        createdPRs++;

        for (const item of pr.items) {
          await client.query(
            `INSERT INTO purchase_request_items (request_id, material_id, description, quantity, unit, project_id) 
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [prId, item.matId, item.desc, item.qty, item.unit, projectId]
          );
          createdItems++;
        }
        console.log(`Created PR: ${pr.reqNum} with ${pr.items.length} items`);
      } else {
        console.log(`PR already exists: ${pr.reqNum}`);
      }
    }

    await client.query('COMMIT');
    console.log(`\nSeed completed: Created ${createdPRs} PRs and ${createdItems} items.`);

  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Error seeding PRs:', e);
  } finally {
    client.release();
    pool.end();
  }
}

main().catch(console.error);
