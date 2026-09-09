const db = require('./index');

const isProd = process.env.NODE_ENV === 'production';
const CONNECTION_ERRORS = ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'EAI_AGAIN'];

// Run one statement, ignoring "object already exists" style errors so the
// migration stays idempotent across boots.
async function safe(label, sql) {
  try {
    await db.query(sql);
  } catch (err) {
    // 42710 duplicate_object, 42P07 duplicate_table, 42P16 invalid_table_definition,
    // 42701 duplicate_column — all benign here (constraint/trigger/column already there).
    if (['42710', '42P07', '42P16', '42701'].includes(err.code)) return;
    // Preserve connection errors verbatim so the caller can tell them apart.
    if (CONNECTION_ERRORS.includes(err.code)) throw err;
    const wrapped = new Error(`migration step "${label}" failed: ${err.message}`);
    wrapped.code = err.code;
    throw wrapped;
  }
}

async function runMigrations() {
  try {
    // --- Columns -------------------------------------------------------------
    await safe('emergency_cases columns', `
      ALTER TABLE emergency_cases
      ADD COLUMN IF NOT EXISTS emergency_type VARCHAR(100) DEFAULT 'General Emergency',
      ADD COLUMN IF NOT EXISTS triage_notes TEXT,
      ADD COLUMN IF NOT EXISTS bed_type_assigned VARCHAR(50) DEFAULT 'general';
    `);

    await safe('users columns', `
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS full_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
      ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) DEFAULT 'approved';
    `);

    await safe('hospitals columns', `
      ALTER TABLE hospitals
      ADD COLUMN IF NOT EXISTS region VARCHAR(100) DEFAULT 'Greater Accra',
      ADD COLUMN IF NOT EXISTS district VARCHAR(150) DEFAULT '',
      ADD COLUMN IF NOT EXISTS amenity_type VARCHAR(100) DEFAULT 'hospital',
      ADD COLUMN IF NOT EXISTS address TEXT DEFAULT '',
      ADD COLUMN IF NOT EXISTS reserved_general_beds INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS reserved_icu_beds INTEGER NOT NULL DEFAULT 0;
    `);

    // --- Data hygiene before adding constraints -----------------------------
    await safe('clamp bed counters', `
      UPDATE hospitals SET
        occupied_general_beds = LEAST(GREATEST(occupied_general_beds, 0), total_general_beds),
        reserved_general_beds = LEAST(GREATEST(reserved_general_beds, 0), total_general_beds),
        occupied_icu_beds     = LEAST(GREATEST(occupied_icu_beds, 0), total_icu_beds),
        reserved_icu_beds     = LEAST(GREATEST(reserved_icu_beds, 0), total_icu_beds)
      WHERE occupied_general_beds < 0 OR occupied_general_beds > total_general_beds
         OR reserved_general_beds < 0 OR reserved_general_beds > total_general_beds
         OR occupied_icu_beds < 0 OR occupied_icu_beds > total_icu_beds
         OR reserved_icu_beds < 0 OR reserved_icu_beds > total_icu_beds;
    `);

    // --- Constraints (NOT VALID: enforced for new writes, tolerant of any
    //     pre-existing rows so a live DB never fails to boot) -----------------
    await safe('chk emergency_cases.status', `
      ALTER TABLE emergency_cases ADD CONSTRAINT chk_ec_status
      CHECK (status IN ('active','in-transit','arrived','resolved','cancelled')) NOT VALID;
    `);
    await safe('chk emergency_cases.bed_type', `
      ALTER TABLE emergency_cases ADD CONSTRAINT chk_ec_bed_type
      CHECK (bed_type_assigned IN ('general','icu')) NOT VALID;
    `);
    await safe('chk emergency_cases.trauma_level', `
      ALTER TABLE emergency_cases ADD CONSTRAINT chk_ec_trauma_level
      CHECK (trauma_level IS NULL OR trauma_level BETWEEN 1 AND 5) NOT VALID;
    `);
    await safe('chk users.role', `
      ALTER TABLE users ADD CONSTRAINT chk_users_role
      CHECK (role IN ('admin','hospital','doctor','nurse','ambulance','authority')) NOT VALID;
    `);
    await safe('chk hospitals.bed_bounds', `
      ALTER TABLE hospitals ADD CONSTRAINT chk_hospitals_bed_bounds CHECK (
        occupied_general_beds >= 0 AND occupied_general_beds <= total_general_beds AND
        reserved_general_beds >= 0 AND reserved_general_beds <= total_general_beds AND
        occupied_icu_beds     >= 0 AND occupied_icu_beds     <= total_icu_beds AND
        reserved_icu_beds     >= 0 AND reserved_icu_beds     <= total_icu_beds
      ) NOT VALID;
    `);

    // --- updated_at trigger for hospitals ----------------------------------
    await safe('updated_at function', `
      CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
      BEGIN NEW.updated_at = CURRENT_TIMESTAMP; RETURN NEW; END;
      $$ LANGUAGE plpgsql;
    `);
    await safe('updated_at trigger', `
      DROP TRIGGER IF EXISTS hospitals_set_updated_at ON hospitals;
      CREATE TRIGGER hospitals_set_updated_at BEFORE UPDATE ON hospitals
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    `);

    // --- Reconcile stale "incoming" reservations from live cases -----------
    await safe('reconcile reservations', `
      UPDATE hospitals h SET
        reserved_general_beds = LEAST(r.general_count, h.total_general_beds),
        reserved_icu_beds     = LEAST(r.icu_count, h.total_icu_beds)
      FROM (
        SELECT
          hsp.id,
          COUNT(ec.id) FILTER (WHERE COALESCE(ec.bed_type_assigned, 'general') <> 'icu') AS general_count,
          COUNT(ec.id) FILTER (WHERE ec.bed_type_assigned = 'icu') AS icu_count
        FROM hospitals hsp
        LEFT JOIN emergency_cases ec
          ON ec.assigned_hospital_id = hsp.id
         AND ec.status NOT IN ('arrived', 'resolved', 'cancelled')
        GROUP BY hsp.id
      ) r
      WHERE h.id = r.id
        AND (h.reserved_general_beds <> LEAST(r.general_count, h.total_general_beds)
          OR h.reserved_icu_beds <> LEAST(r.icu_count, h.total_icu_beds));
    `);

    console.log('Database schema migrations applied successfully.');
  } catch (err) {
    if (!isProd && CONNECTION_ERRORS.includes(err.code)) {
      console.warn('[migrate] database unreachable — skipping migrations in dev:', err.message);
      return;
    }
    throw err;
  }
}

module.exports = runMigrations;
