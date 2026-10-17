const rateLimit = require('express-rate-limit');

// 1. Brute-Force Protection on Login Endpoint
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60, // 60 attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please wait a moment and try again.'
  }
});

// 2. Global API Rate Limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5000, // Generous limit for real-time polling and multi-tab use
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please try again shortly.'
  }
});

// 3. XSS and Malicious Script Injection Sanitizer Middleware
function sanitizeInputs(req, res, next) {
  function sanitizeValue(value) {
    if (typeof value === 'string') {
      return value
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript\s*:/gi, '')
        .replace(/vbscript\s*:/gi, '')
        .replace(/data\s*:\s*text\/html/gi, '')
        .replace(/on(load|click|mouseover|error|focus|blur)\s*=\s*["'][^"']*["']/gi, '');
    } else if (typeof value === 'object' && value !== null) {
      for (const key of Object.keys(value)) {
        value[key] = sanitizeValue(value[key]);
      }
    }
    return value;
  }

  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeValue(req.body);
  }

  next();
}

module.exports = {
  loginLimiter,
  apiLimiter,
  sanitizeInputs
};
