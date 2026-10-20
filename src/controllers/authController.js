const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
const { JWT_SECRET } = require('../middleware/auth');

const ALLOWED_ROLES = ['admin', 'doctor', 'receptionist', 'pharmacist', 'cashier'];

async function login(req, res) {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required.' });
    }

    const cleanUsername = username.trim().toLowerCase();
    const [users] = await query('SELECT * FROM users WHERE LOWER(username) = ?', [cleanUsername]);
    
    if (users.length === 0) {
      // Log failed attempt for security auditing
      try {
        await query('INSERT INTO audit_logs (user_name, action, entity, details) VALUES (?, ?, ?, ?)',
          [cleanUsername, 'LOGIN_FAILED', 'users', `Failed login attempt (unknown username) from IP ${req.ip}`]);
      } catch (e) {}
      return res.status(401).json({ success: false, message: 'Invalid username or password.' });
    }

    const user = users[0];
    if (user.status !== 'active') {
      return res.status(403).json({ success: false, message: 'Your account is deactivated. Contact Administrator.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      // Log failed password attempt for security auditing
      try {
        await query('INSERT INTO audit_logs (user_name, action, entity, details) VALUES (?, ?, ?, ?)',
          [user.full_name, 'LOGIN_FAILED', 'users', `Failed login attempt (incorrect password) for ${user.username} from IP ${req.ip}`]);
      } catch (e) {}
      return res.status(401).json({ success: false, message: 'Invalid username or password.' });
    }

    // Fetch clinic settings in background/parallel to reduce login latency
    const [settings] = await query('SELECT * FROM clinic_settings LIMIT 1');
    const clinic = settings[0] || {};

    const tokenPayload = {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      role: user.role,
      doctor_id: user.doctor_id
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '30d' });

    // Non-blocking background audit log to eliminate wait latency
    query('INSERT INTO audit_logs (user_name, action, entity, details) VALUES (?, ?, ?, ?)',
      [user.full_name, 'LOGIN', 'users', `User logged in from IP ${req.ip}`]).catch(err => {
      console.warn('[LOGIN AUDIT WARN]', err.message);
    });

    return res.json({
      success: true,
      message: 'Authentication successful',
      token,
      user: tokenPayload,
      clinic: {
        name: clinic.clinic_name || 'Dream Garden PolyClinic',
        tagline: clinic.tagline || 'Excellence in Healthcare',
        phone: clinic.phone || '+92 300 1234567',
        address: clinic.address || 'Dream Garden, Lahore',
        currency: clinic.currency_symbol || 'Rs.'
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    const msg = (process.env.SUPABASE_ACCESS_TOKEN && process.env.SUPABASE_PROJECT_REF)
      ? 'Internal server error during authentication.'
      : 'Database environment variables are missing on Vercel. Please set SUPABASE_PROJECT_REF and SUPABASE_ACCESS_TOKEN in Vercel Settings.';
    return res.status(500).json({ success: false, message: msg });
  }
}

async function getMe(req, res) {
  try {
    const [users] = await query('SELECT id, username, full_name, email, phone, role, doctor_id, status FROM users WHERE id = ?', [req.user.id]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    const [settings] = await query('SELECT * FROM clinic_settings LIMIT 1');
    return res.json({ success: true, user: users[0], clinic: settings[0] });
  } catch (err) {
    console.error('getMe error:', err);
    return res.status(500).json({ success: false, message: 'Server error fetching profile.' });
  }
}

async function getUsers(req, res) {
  try {
    const [users] = await query('SELECT id, username, full_name, email, phone, role, status, created_at FROM users ORDER BY created_at DESC');
    return res.json({ success: true, data: users });
  } catch (err) {
    console.error('getUsers error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch users.' });
  }
}

async function createUser(req, res) {
  try {
    const { username, password, full_name, email, phone, role } = req.body;
    if (!username || !password || !full_name) {
      return res.status(400).json({ success: false, message: 'Username, password and full name are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long for security.' });
    }

    const cleanRole = ALLOWED_ROLES.includes(role) ? role : 'receptionist';
    const cleanUsername = username.trim().toLowerCase();

    const [existing] = await query('SELECT id FROM users WHERE LOWER(username) = ?', [cleanUsername]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Username already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const [result] = await query(
      'INSERT INTO users (username, password_hash, full_name, email, phone, role) VALUES (?, ?, ?, ?, ?, ?)',
      [cleanUsername, password_hash, full_name.trim(), email || null, phone || null, cleanRole]
    );

    return res.status(201).json({ success: true, message: 'User created successfully.', userId: result.insertId });
  } catch (err) {
    console.error('createUser error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create user.' });
  }
}

async function updateUser(req, res) {
  try {
    const { id } = req.params;
    const { full_name, email, phone, role, status, password } = req.body;

    const cleanRole = role && ALLOWED_ROLES.includes(role) ? role : undefined;

    if (password && password.trim().length > 0) {
      if (password.trim().length < 6) {
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long for security.' });
      }
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(password, salt);
      await query(
        'UPDATE users SET full_name = ?, email = ?, phone = ?, role = COALESCE(?, role), status = ?, password_hash = ? WHERE id = ?',
        [full_name, email, phone, cleanRole, status, password_hash, id]
      );
    } else {
      await query(
        'UPDATE users SET full_name = ?, email = ?, phone = ?, role = COALESCE(?, role), status = ? WHERE id = ?',
        [full_name, email, phone, cleanRole, status, id]
      );
    }

    return res.json({ success: true, message: 'User updated successfully.' });
  } catch (err) {
    console.error('updateUser error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update user.' });
  }
}

async function deleteUser(req, res) {
  try {
    const { id } = req.params;
    if (req.user && req.user.id == id) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own logged-in account.' });
    }
    await query('DELETE FROM users WHERE id = ?', [id]);
    return res.json({ success: true, message: 'Staff user deleted successfully from database.' });
  } catch (err) {
    console.error('deleteUser error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete user.' });
  }
}

module.exports = {
  login,
  getMe,
  getUsers,
  createUser,
  updateUser,
  deleteUser
};

