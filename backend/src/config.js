/**
 * Centralised configuration. Reads the environment once, fails fast on missing
 * required secrets in production, and never ships a usable default for a secret.
 */

const isProd = process.env.NODE_ENV === 'production';

function required(name) {
  const value = process.env[name];
  if (value && value.trim() !== '') return value;
  if (isProd) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  // Dev-only placeholder so `npm run dev` works without a full .env.
  console.warn(`[config] ${name} is not set — using an INSECURE development default.`);
  return `dev-only-${name.toLowerCase()}`;
}

function optional(name) {
  const value = process.env[name];
  return value && value.trim() !== '' ? value : null;
}

const config = {
  isProd,
  port: parseInt(process.env.PORT || '5001', 10),

  jwtSecret: required('JWT_SECRET'),

  // Comma-separated allowlist, e.g. "https://pulsegrid.vercel.app,https://www.pulsegrid.app".
  // Falls back to "*" only outside production.
  corsOrigins: (process.env.CORS_ORIGINS || (isProd ? '' : '*'))
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  // Carto is optional: when unset, the /api/carto routes return 503 and the
  // frontend falls back to keyless OSM tiles.
  carto: {
    accountId: optional('CARTO_ACCOUNT_ID'),
    accessToken: optional('CARTO_API_ACCESS_TOKEN'),
    get enabled() {
      return Boolean(this.accountId && this.accessToken);
    },
  },

  // The GPS simulator should run in exactly one process. Off by default.
  simulatorEnabled: process.env.ENABLE_SIMULATOR === 'true',
};

module.exports = config;
