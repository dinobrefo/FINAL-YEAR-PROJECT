const { Pool } = require('pg');

// Use environment variables or fallback for local development
const pool = new Pool({
  user: process.env.POSTGRES_USER || 'ierbms_user',
  host: process.env.POSTGRES_HOST || 'localhost',
  database: process.env.POSTGRES_DB || 'ierbms',
  password: process.env.POSTGRES_PASSWORD || 'ierbms_password',
  port: process.env.POSTGRES_PORT || 5433,
  
  // connection-pooling best practice configuration
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
