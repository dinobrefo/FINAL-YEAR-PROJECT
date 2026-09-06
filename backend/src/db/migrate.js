const db = require('./index');

async function runMigrations() {
  try {
    // Add missing columns to emergency_cases if they don't already exist
    await db.query(`
      ALTER TABLE emergency_cases 
      ADD COLUMN IF NOT EXISTS emergency_type VARCHAR(100) DEFAULT 'General Emergency',
      ADD COLUMN IF NOT EXISTS triage_notes TEXT,
      ADD COLUMN IF NOT EXISTS bed_type_assigned VARCHAR(50) DEFAULT 'general';
    `);

    // Add missing columns to users if they don't already exist
    await db.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS full_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
      ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) DEFAULT 'approved';
    `);

    // Add missing columns to hospitals if they don't already exist
    await db.query(`
      ALTER TABLE hospitals 
      ADD COLUMN IF NOT EXISTS region VARCHAR(100) DEFAULT 'Greater Accra',
      ADD COLUMN IF NOT EXISTS district VARCHAR(150) DEFAULT '',
      ADD COLUMN IF NOT EXISTS amenity_type VARCHAR(100) DEFAULT 'hospital',
      ADD COLUMN IF NOT EXISTS address TEXT DEFAULT '';
    `);

    console.log('Database schema migrations applied successfully.');
  } catch (err) {
    console.warn('Migration note (database may be offline or already up to date):', err.message);
  }
}

module.exports = runMigrations;
