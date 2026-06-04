const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
  user: process.env.POSTGRES_USER || 'ierbms_user',
  host: process.env.POSTGRES_HOST || 'localhost',
  database: process.env.POSTGRES_DB || 'ierbms',
  password: process.env.POSTGRES_PASSWORD || 'ierbms_password',
  port: process.env.POSTGRES_PORT || 5433,
});

async function seedUsers() {
  console.log('Seeding initial users...');
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('password123', salt);

  const users = [
    { email: 'admin@ierbms.gov', role: 'admin' },
    { email: 'hospital@ierbms.gov', role: 'hospital' },
    { email: 'doctor@ierbms.gov', role: 'doctor' },
    { email: 'ambulance@ierbms.gov', role: 'ambulance' }
  ];

  try {
    for (const u of users) {
      await pool.query(
        'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING',
        [u.email, passwordHash, u.role]
      );
    }
    console.log('Users seeded successfully! Default password is "password123" for all users.');
  } catch (err) {
    console.error('Error seeding users:', err);
  } finally {
    await pool.end();
  }
}

seedUsers();
