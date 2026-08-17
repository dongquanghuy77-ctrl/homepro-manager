const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_dbPWisDQA8F6@ep-floral-union-az31v0st.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
});

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('Creating ENUM types...');
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE source_category AS ENUM (
          'BOQ_EXCEL', 'BOQ_PDF', 'DESIGN_PDF', 'DESIGN_SKETCHUP',
          'SURVEY_IMAGE', 'MATERIAL_IMAGE', 'PROCUREMENT_DOCUMENT',
          'PRODUCTION_EVIDENCE', 'QC_EVIDENCE', 'DELIVERY_DOCUMENT',
          'INSTALLATION_DOCUMENT', 'FINANCIAL_DOCUMENT', 'CONTRACT',
          'MANUAL_ENTRY', 'OTHER'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE source_status AS ENUM (
          'RAW', 'INGESTING', 'PARSED', 'CLASSIFIED', 'NORMALIZED',
          'STAGED', 'MATCHED', 'APPROVED', 'REJECTED', 'ARCHIVED'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    console.log('Creating tables...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS source_documents (
        id SERIAL PRIMARY KEY,
        source_id TEXT NOT NULL UNIQUE,
        source_name TEXT NOT NULL,
        source_type TEXT NOT NULL,
        file_name TEXT NOT NULL,
        original_path TEXT,
        storage_path TEXT,
        file_size INTEGER,
        checksum TEXT,
        mime_type TEXT,
        version INTEGER NOT NULL DEFAULT 1,
        parent_source_id INTEGER,
        uploaded_by INTEGER REFERENCES users(id),
        uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        project_id INTEGER REFERENCES projects(id),
        document_category TEXT NOT NULL,
        source_status TEXT NOT NULL DEFAULT 'RAW',
        auto_routed_to TEXT,
        classification_confidence NUMERIC(5,4),
        extracted_at TIMESTAMPTZ,
        staged_at TIMESTAMPTZ,
        approved_at TIMESTAMPTZ,
        approved_by INTEGER REFERENCES users(id),
        rejection_reason TEXT,
        notes TEXT,
        tags TEXT[],
        metadata JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS source_document_lines (
        id SERIAL PRIMARY KEY,
        line_id TEXT NOT NULL UNIQUE,
        source_doc_id INTEGER NOT NULL REFERENCES source_documents(id) ON DELETE CASCADE,
        line_number INTEGER NOT NULL,
        raw_value TEXT,
        parsed_value TEXT,
        normalized_value TEXT,
        field_type TEXT,
        confidence TEXT NOT NULL DEFAULT 'LOW',
        needs_review BOOLEAN NOT NULL DEFAULT FALSE,
        review_note TEXT,
        linked_material_id INTEGER REFERENCES materials(id),
        linked_supplier_id INTEGER REFERENCES suppliers(id),
        linked_boq_item_id INTEGER REFERENCES boq_items(id),
        staged_record_type TEXT,
        staged_record_id TEXT,
        erp_record_type TEXT,
        erp_record_id TEXT,
        metadata JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS source_versions (
        id SERIAL PRIMARY KEY,
        source_doc_id INTEGER NOT NULL REFERENCES source_documents(id),
        version INTEGER NOT NULL,
        change_type TEXT NOT NULL,
        changed_by INTEGER REFERENCES users(id),
        changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        change_summary TEXT,
        diff_data JSONB,
        snapshot_path TEXT
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS staging_records (
        id SERIAL PRIMARY KEY,
        staging_id TEXT NOT NULL UNIQUE,
        source_doc_id INTEGER NOT NULL REFERENCES source_documents(id),
        source_line_id INTEGER REFERENCES source_document_lines(id),
        target_module TEXT NOT NULL,
        target_entity_type TEXT NOT NULL,
        staging_status TEXT NOT NULL DEFAULT 'PENDING',
        raw_data JSONB NOT NULL,
        normalized_data JSONB,
        final_data JSONB,
        validation_errors JSONB,
        match_result JSONB,
        confidence TEXT NOT NULL DEFAULT 'LOW',
        reviewed_by INTEGER REFERENCES users(id),
        reviewed_at TIMESTAMPTZ,
        review_note TEXT,
        posted_by INTEGER REFERENCES users(id),
        posted_at TIMESTAMPTZ,
        erp_record_type TEXT,
        erp_record_id TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS data_lineage (
        id SERIAL PRIMARY KEY,
        lineage_id TEXT NOT NULL UNIQUE,
        erp_record_type TEXT NOT NULL,
        erp_record_id TEXT NOT NULL,
        staging_id TEXT,
        source_doc_id INTEGER REFERENCES source_documents(id),
        source_line_id INTEGER REFERENCES source_document_lines(id),
        source_file TEXT,
        lineage_chain JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS source_audit_log (
        id SERIAL PRIMARY KEY,
        action TEXT NOT NULL,
        user_id INTEGER REFERENCES users(id),
        source_doc_id INTEGER REFERENCES source_documents(id),
        staging_id TEXT,
        erp_record_id TEXT,
        module TEXT,
        before_data JSONB,
        after_data JSONB,
        ip_address TEXT,
        user_agent TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    console.log('Creating indexes...');
    await client.query(`CREATE INDEX IF NOT EXISTS idx_source_documents_project ON source_documents(project_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_source_documents_status ON source_documents(source_status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_source_documents_category ON source_documents(document_category);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_source_document_lines_doc ON source_document_lines(source_doc_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_staging_records_source ON staging_records(source_doc_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_staging_records_module ON staging_records(target_module);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_staging_records_status ON staging_records(staging_status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_data_lineage_erp ON data_lineage(erp_record_type, erp_record_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_source_audit_log_doc ON source_audit_log(source_doc_id);`);

    await client.query('COMMIT');
    console.log('Migration completed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
    throw err;
  } finally {
    client.release();
    pool.end();
  }
}

migrate();
