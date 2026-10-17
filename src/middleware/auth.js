const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'DreamGardenPolyClinic_SecretKey_2026_SecureJWT';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access denied. No authentication token provided.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(401).json({ success: false, message: 'Invalid or expired authentication session.' });
    }
    req.user = user;
    next();
  });
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    if (req.user.role === 'admin' || roles.includes(req.user.role)) {
      return next();
    }
    return res.status(403).json({ success: false, message: `Permission denied. Requires one of: ${roles.join(', ')}` });
  };
}

module.exports = {
  authenticateToken,
  requireRole,
  JWT_SECRET
};
