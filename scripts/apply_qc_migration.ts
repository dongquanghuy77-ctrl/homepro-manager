import * as dotenv from 'dotenv';
dotenv.config();
import { db } from '@/db';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('🚀 Starting QC/QMS database migration...');

  try {
    // 1. QC Standards
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS qc_standards (
        id SERIAL PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        group_name TEXT,
        description TEXT,
        unit TEXT,
        standard_value TEXT,
        tolerance TEXT,
        pass_criteria TEXT,
        warning_criteria TEXT,
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. QC Control Points
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS qc_control_points (
        id SERIAL PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        stage TEXT NOT NULL, -- RAW_MATERIAL, CUTTING, EDGE_BANDING, DRILLING, ASSEMBLY, FINISHING, PACKAGING, INSTALLATION
        description TEXT,
        is_mandatory BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. QC Control Point Standards (Many-to-Many)
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS qc_control_point_standards (
        id SERIAL PRIMARY KEY,
        control_point_id INTEGER NOT NULL REFERENCES qc_control_points(id) ON DELETE CASCADE,
        standard_id INTEGER NOT NULL REFERENCES qc_standards(id) ON DELETE CASCADE
      );
    `);

    // 4. QC Inspections
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS qc_inspections (
        id SERIAL PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES materials(id),
        boq_item_id INTEGER REFERENCES boq_items(id),
        bom_id INTEGER REFERENCES boms(id),
        production_order_id INTEGER REFERENCES production_orders(id) ON DELETE CASCADE,
        work_order_id INTEGER REFERENCES work_orders(id),
        routing_step_id INTEGER REFERENCES routing_steps(id),
        control_point_id INTEGER REFERENCES qc_control_points(id),
        inspector_id INTEGER REFERENCES users(id),
        inspection_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        result TEXT NOT NULL, -- PASS, FAIL, PASS_WITH_CONDITIONS, PENDING
        evidence_url TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 5. Link qc_issues to qc_inspections (Modify existing table)
    // We already have inspection_id in qc_issues, let's add the FK
    await db.execute(sql`
      ALTER TABLE qc_issues 
      ADD CONSTRAINT fk_qc_issues_inspection 
      FOREIGN KEY (inspection_id) REFERENCES qc_inspections(id) ON DELETE SET NULL;
    `).catch(e => console.log('Notice: fk_qc_issues_inspection might already exist or table does not match exactly.', e.message));

    // 6. QC NCRs (Non-Conformance Reports)
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS qc_ncrs (
        id SERIAL PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
        issue_id INTEGER REFERENCES qc_issues(id),
        source TEXT, -- INSPECTION, CUSTOMER_COMPLAINT, INTERNAL_AUDIT
        description TEXT NOT NULL,
        root_cause TEXT,
        responsibility TEXT,
        corrective_action TEXT,
        preventive_action TEXT,
        deadline TIMESTAMP,
        assignee_id INTEGER REFERENCES users(id),
        status TEXT NOT NULL DEFAULT 'OPEN', -- OPEN, INVESTIGATING, ACTION_TAKEN, CLOSED
        closed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ QC Tables created or verified.');

    console.log('🎉 Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

main();
