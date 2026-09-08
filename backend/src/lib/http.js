/**
 * Small HTTP helpers: a typed error the global handler understands, plus
 * request-validation helpers that throw it.
 */

class ApiError extends Error {
  constructor(status, message, { code, expose = true } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.expose = expose; // whether `message` is safe to send to the client
  }
}

const badRequest = (msg, code) => new ApiError(400, msg, { code });
const notFound = (msg = 'Not found', code) => new ApiError(404, msg, { code });

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v) => typeof v === 'string' && UUID_REGEX.test(v);

/** Throw a 400 unless `value` is a UUID. Returns the value for chaining. */
function assertUuid(value, label = 'id') {
  if (!isUuid(value)) throw badRequest(`Invalid ${label} format`, 'invalid_uuid');
  return value;
}

/** Throw a 400 unless `value` is one of `allowed`. */
function assertEnum(value, allowed, label = 'value') {
  if (!allowed.includes(value)) {
    throw badRequest(`Invalid ${label}: expected one of ${allowed.join(', ')}`, 'invalid_enum');
  }
  return value;
}

/** Throw a 400 unless `value` is a non-empty string. */
function assertString(value, label = 'value', { min = 1, max = 10000 } = {}) {
  if (typeof value !== 'string' || value.length < min || value.length > max) {
    throw badRequest(`${label} must be a string between ${min} and ${max} characters`, 'invalid_string');
  }
  return value;
}

module.exports = { ApiError, badRequest, notFound, isUuid, assertUuid, assertEnum, assertString, UUID_REGEX };
