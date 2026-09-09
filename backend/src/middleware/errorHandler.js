const { ApiError } = require('../lib/http');

const isProd = process.env.NODE_ENV === 'production';

// 404 for unmatched routes.
function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Route not found', path: req.originalUrl });
}

/**
 * Central error handler. Sends a clean message for known ApiErrors and
 * validation failures; hides internal details (SQL, stack traces) for
 * everything else in production while always logging the full error.
 */
function errorHandler(err, req, res, _next) {
  // Postgres unique-violation -> 409 regardless of where it was thrown.
  if (err && err.code === '23505') {
    return res.status(409).json({ error: 'That record already exists', code: 'duplicate' });
  }
  // Postgres check-violation / not-null / fk -> 400.
  if (err && ['23514', '23502', '23503'].includes(err.code)) {
    return res.status(400).json({ error: 'Request violates a data constraint', code: 'constraint' });
  }

  if (err instanceof ApiError) {
    return res.status(err.status).json({
      error: err.expose ? err.message : 'Request could not be processed',
      ...(err.code ? { code: err.code } : {}),
    });
  }

  console.error(`[error] ${req.method} ${req.originalUrl}`, err);

  res.status(err.status || 500).json({
    error: isProd ? 'Internal server error' : String(err && err.message || err),
    ...(isProd ? {} : { stack: err && err.stack }),
  });
}

module.exports = { notFoundHandler, errorHandler };
