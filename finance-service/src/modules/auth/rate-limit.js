// ponytail: in-memory rate limiter, lru_cache would be overkill here
const rateLimitMap = new Map();

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_EMAIL_REQUESTS = 3; // max 3 email requests per minute
const MAX_VERIFY_ATTEMPTS = 5; // max 5 verify attempts per minute

/**
 * Check if user exceeded rate limit
 * @param {string} key - WA number or IP
 * @param {number} maxRequests
 * @param {number} windowMs
 * @returns {boolean} - true if rate limited
 */
function isRateLimited(key, maxRequests = MAX_EMAIL_REQUESTS, windowMs = RATE_LIMIT_WINDOW_MS) {
  const now = Date.now();
  const record = rateLimitMap.get(key) || { count: 0, resetAt: now + windowMs };

  if (now > record.resetAt) {
    // reset window
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  if (record.count >= maxRequests) {
    return true; // rate limited
  }

  record.count++;
  rateLimitMap.set(key, record);
  return false;
}

/**
 * Clean up expired entries (run periodically)
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    if (now > record.resetAt) {
      rateLimitMap.delete(key);
    }
  }
}, RATE_LIMIT_WINDOW_MS);

module.exports = { isRateLimited, MAX_EMAIL_REQUESTS, MAX_VERIFY_ATTEMPTS };
