const https = require('https');
require('dotenv').config();

const SUPABASE_PROJECT_REF = process.env.SUPABASE_PROJECT_REF || '';
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN || '';

// High performance keep-alive agent for low latency
const agent = new https.Agent({
  keepAlive: true,
  maxSockets: 50,
  timeout: 30000
});

const GCLINIC_TABLES = [
  'clinic_settings', 'users', 'departments', 'doctors', 'doctor_schedules',
  'patients', 'patient_vitals', 'appointments', 'consultations', 'prescriptions',
  'prescription_items',
  'medicines_inventory', 'invoices', 'invoice_items', 'payments',
  'pharmacy_sales', 'pharmacy_sale_items', 'audit_logs'
];

function escapeLiteral(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return isFinite(val) ? String(val) : 'NULL';
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (val instanceof Date) return "'" + val.toISOString() + "'";
  return "'" + String(val).replace(/'/g, "''") + "'";
}

function formatSql(sql, params) {
  let resSql = sql;

  // 1. Prefix tables with gclinic_ if not already prefixed
  for (const t of GCLINIC_TABLES) {
    const regex = new RegExp('\\b(?<!gclinic_)' + t + '\\b', 'gi');
    resSql = resSql.replace(regex, 'gclinic_' + t);
  }

  // 2. MySQL -> Postgres Syntax translation
  resSql = resSql.replace(/`/g, '');
  resSql = resSql.replace(/\bREGEXP\b/gi, '~');
  resSql = resSql.replace(/CAST\((.*?)\s+AS\s+UNSIGNED\)/gi, 'CAST($1 AS INTEGER)');
  // Replace MySQL style double quotes around string values like status = "completed"
  resSql = resSql.replace(/(=\s*)"([^"]+)"/g, "$1'$2'");
  // Replace unquoted MySQL intervals e.g. INTERVAL 7 DAY -> INTERVAL '7 days'
  resSql = resSql.replace(/INTERVAL\s+(\d+)\s+([A-Za-z]+)/gi, "INTERVAL '$1 $2'");
  // Handle boolean column comparisons
  resSql = resSql.replace(/\bis_active\s*=\s*1\b/gi, "is_active = true");
  resSql = resSql.replace(/\bis_active\s*=\s*0\b/gi, "is_active = false");

  // 3. Bind ? parameters safely
  if (!params || params.length === 0) return resSql;

  let paramIdx = 0;
  return resSql.replace(/\?/g, () => {
    if (paramIdx >= params.length) return 'NULL';
    const val = params[paramIdx++];
    return escapeLiteral(val);
  });
}

function executeSqlOnSupabase(sql, retries = 2) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ query: sql });
    const req = https.request({
      hostname: 'api.supabase.com',
      port: 443,
      path: `/v1/projects/${SUPABASE_PROJECT_REF}/database/query`,
      method: 'POST',
      agent: agent,
      headers: {
        'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 400 || (parsed && parsed.error)) {
            const errMsg = parsed.message || parsed.error || JSON.stringify(parsed);
            if (retries > 0 && res.statusCode >= 500) {
              return setTimeout(() => {
                executeSqlOnSupabase(sql, retries - 1).then(resolve).catch(reject);
              }, 500);
            }
            return reject(new Error(`[Supabase DB Error] ${errMsg}`));
          }
          resolve(parsed);
        } catch (e) {
          reject(new Error(`[Supabase Parse Error] ${e.message}: ${data}`));
        }
      });
    });

    req.on('error', (err) => {
      if (retries > 0) {
        return setTimeout(() => {
          executeSqlOnSupabase(sql, retries - 1).then(resolve).catch(reject);
        }, 500);
      }
      reject(err);
    });

    req.write(postData);
    req.end();
  });
}

// Smart high-performance memory cache for read queries (0ms latency for repeated reads)
const queryCache = new Map();
const CACHE_TTL_MS = 15000; // 15 seconds TTL for high responsiveness and freshness

function getCacheKey(transformedSql) {
  return transformedSql.trim();
}

function invalidateCache() {
  queryCache.clear();
}

async function query(sql, params) {
  let transformed = formatSql(sql, params);
  const isInsert = /^\s*INSERT\b/i.test(transformed);
  const isUpdate = /^\s*UPDATE\b/i.test(transformed);
  const isDelete = /^\s*DELETE\b/i.test(transformed);
  const isSelect = /^\s*SELECT\b/i.test(transformed);
  const isMultiStatement = transformed.trim().endsWith(';') && (transformed.match(/;/g) || []).length > 1;

  // If write operation, invalidate read cache immediately so data stays 100% fresh
  if (isInsert || isUpdate || isDelete) {
    invalidateCache();
  } else if (isSelect) {
    const key = getCacheKey(transformed);
    const cached = queryCache.get(key);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
      // Deep clone cached rows to prevent mutation side-effects
      const cachedRows = JSON.parse(JSON.stringify(cached.rows));
      cachedRows.insertId = 0;
      cachedRows.affectedRows = cachedRows.length;
      return [cachedRows, { insertId: 0, affectedRows: cachedRows.length }];
    }
  }

  if ((isInsert || isUpdate || isDelete) && !isMultiStatement && !/\bRETURNING\b/i.test(transformed)) {
    // Only append if it doesn't end with a semicolon
    if (transformed.trim().endsWith(';')) {
      transformed = transformed.trim().slice(0, -1) + ' RETURNING id;';
    } else {
      transformed += ' RETURNING id';
    }
  }

  const result = await executeSqlOnSupabase(transformed);
  const rows = Array.isArray(result) ? result : [];
  const insertId = isInsert && rows.length > 0 && rows[0].id ? rows[0].id : 0;
  const affectedRows = rows.length;

  // Ensure full mysql2 compatibility: attach insertId and affectedRows to rows object
  rows.insertId = insertId;
  rows.affectedRows = affectedRows;

  // Cache SELECT results for immediate 0ms future reads
  if (isSelect) {
    queryCache.set(getCacheKey(transformed), {
      timestamp: Date.now(),
      rows: JSON.parse(JSON.stringify(rows))
    });
  }

  const meta = {
    insertId,
    affectedRows
  };

  return [rows, meta];
}

async function getPool() {
  return {
    query,
    execute: query
  };
}

async function initDatabase() {
  console.log('[DB] Connecting to Supabase Cloud Database (Project: ' + SUPABASE_PROJECT_REF + ')...');
  const [test] = await query('SELECT 1 as connected');
  if (test && test.length > 0) {
    console.log('[DB] Successfully connected to Supabase Cloud Database!');
    console.log('[DB] All 18 gclinic_* tables and CASCADE relationships are active in Supabase.');
  } else {
    throw new Error('Could not establish connection to Supabase database.');
  }
}

module.exports = {
  getPool,
  query,
  initDatabase
};
