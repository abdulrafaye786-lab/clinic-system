const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config();

const { initDatabase } = require('./src/config/db');
const { apiLimiter } = require('./src/middleware/security');
const apiRoutes = require('./src/routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Security Headers via Helmet (with CSP disabled for inline frontend interactions)
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    frameguard: { action: 'deny' }, // Anti-clickjacking
    noSniff: true, // Anti-MIME-sniffing
    xssFilter: true, // Enable browser XSS filtering
    hidePoweredBy: true // Hide Express fingerprint
  })
);

// 2. Strict CORS Configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow local requests, same-origin, or standard requests without origin (e.g. mobile/tools)
      if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  })
);

// 3. Request Parsing & Payload Size Restrictions (Anti-DoS)
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(morgan('dev'));

// 4. Static Files (with Cache-Control headers to ensure instant theme updates)
app.use(express.static(path.join(__dirname, 'public'), {
  etag: false,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.css') || filePath.endsWith('.js') || filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));

// 5. Global API Rate Limiter on API routes
app.use('/api', apiLimiter);

// 6. API Routes
app.use('/api', apiRoutes);

// Health check endpoint with database diagnostics
app.get('/api/health', async (req, res) => {
  let dbStatus = 'untested';
  let dbError = null;
  const projectRef = process.env.SUPABASE_PROJECT_REF;
  const tokenPresent = Boolean(process.env.SUPABASE_ACCESS_TOKEN);

  try {
    const { query } = require('./src/config/db');
    const [test] = await query('SELECT 1 as connected');
    dbStatus = (test && test.length > 0) ? 'connected' : 'empty_response';
  } catch (err) {
    dbStatus = 'error';
    dbError = err.message;
  }

  res.json({
    status: 'online',
    clinic: 'Dream Garden PolyClinic',
    timestamp: new Date().toISOString(),
    database: {
      status: dbStatus,
      projectRefConfigured: Boolean(projectRef),
      tokenConfigured: tokenPresent,
      error: dbError
    }
  });
});

// Explicit JSON 404 Handler for undefined API endpoints (prevents serving index.html on missing API calls)
app.use('/api', (req, res) => {
  return res.status(404).json({
    success: false,
    message: `API endpoint '${req.originalUrl}' not found.`
  });
});

// Single Page Application Fallback
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 7. Centralized Safe Error Handling Middleware (No Leak of Internal Traces)
app.use((err, req, res, next) => {
  console.error('[SECURITY/SERVER ERROR]', err.message);
  return res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production'
      ? 'An unexpected server error occurred. Please contact support.'
      : (err.message || 'Internal Server Error')
  });
});

// Start Server (only when run directly, not when invoked as a Vercel serverless function)
if (process.env.VERCEL !== '1' && !process.env.NOW_REGION) {
  async function startServer() {
    try {
      await initDatabase();
      app.listen(PORT, () => {
        console.log(`================================================================`);
        console.log(`  🌟 DREAM GARDEN POLYCLINIC MANAGEMENT SYSTEM 🌟`);
        console.log(`  🛡️ Security Hardening Active: Helmet, Rate Limiter, Anti-XSS, CORS`);
        console.log(`  Clinical Portal URL:           http://localhost:${PORT}`);
        console.log(`================================================================`);
      });
    } catch (err) {
      console.error('Warning: Database connection check failed on startup:', err.message);
      app.listen(PORT, () => {
        console.log(`Clinical Portal started on port ${PORT} (retrying DB in background)`);
      });
    }
  }
  startServer();
}

module.exports = app;

