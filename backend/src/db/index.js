const { Pool } = require('pg');

// Use environment variables or fallback for local development
const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    }
  : {
      user: process.env.POSTGRES_USER || 'ierbms_user',
      host: process.env.POSTGRES_HOST || 'localhost',
      database: process.env.POSTGRES_DB || 'ierbms',
      password: process.env.POSTGRES_PASSWORD || 'ierbms_password',
      port: process.env.POSTGRES_PORT || 5434,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    };

const pool = new Pool(poolConfig);

// Surface pool-level errors instead of crashing the process on an idle client drop.
pool.on('error', (err) => {
  console.error('[db] idle client error:', err.message);
});

/**
 * Run `fn` inside a single transaction. `fn` receives a query-capable client
 * ({ query }) and its return value is passed through. Any throw rolls back.
 *
 *   const caseRow = await withTransaction(async (tx) => {
 *     const { rows } = await tx.query('UPDATE ... RETURNING *', [...]);
 *     return rows[0];
 *   });
 */
async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackErr) {
      console.error('[db] rollback failed:', rollbackErr.message);
    }
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  query: (text, params) => pool.query(text, params),
  withTransaction,
  pool,
};
