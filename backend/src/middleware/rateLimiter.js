const attempts = new Map();

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of attempts) {
    if (now - entry.start > WINDOW_MS) {
      attempts.delete(key);
    }
  }
}, 60 * 1000);

function loginRateLimiter(req, res, next) {
  const key = req.ip;
  const now = Date.now();
  const entry = attempts.get(key);

  if (entry && now - entry.start > WINDOW_MS) {
    attempts.delete(key);
  }

  if (!attempts.has(key)) {
    attempts.set(key, { count: 1, start: now });
    return next();
  }

  const current = attempts.get(key);
  current.count++;

  if (current.count > MAX_ATTEMPTS) {
    const retryAfter = Math.ceil((WINDOW_MS - (now - current.start)) / 1000);
    res.set('Retry-After', String(retryAfter));
    return res.status(429).json({ success: false, message: 'Demasiados intentos. Intenta de nuevo más tarde.' });
  }

  next();
}

module.exports = { loginRateLimiter };
