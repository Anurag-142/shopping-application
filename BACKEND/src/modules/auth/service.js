const pool = require('../../config/db');
const { hashPassword, comparePassword } = require('../../utils/passwordHelper');
const { signToken } = require('../../utils/jwtHelper');

/**
 * Register a new customer.
 * @param {{ name, email, password }} data
 * @returns {{ user, token }}
 */
async function register({ name, email, password }) {
  // Check for existing email
  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
  if (existing.rows.length > 0) {
    const err = new Error('An account with this email already exists.');
    err.status = 409;
    throw err;
  }

  const password_hash = await hashPassword(password);

  const result = await pool.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, 'customer')
     RETURNING id, name, email, role, created_at`,
    [name.trim(), email.toLowerCase(), password_hash]
  );

  const user = result.rows[0];
  const token = signToken({ userId: user.id, role: user.role, email: user.email });
  return { user, token };
}

/**
 * Log in an existing user.
 * @param {{ email, password }} credentials
 * @returns {{ user, token }}
 */
async function login({ email, password }) {
  const result = await pool.query(
    'SELECT id, name, email, password_hash, role FROM users WHERE email = $1',
    [email.toLowerCase()]
  );

  const user = result.rows[0];
  // Use a constant-time comparison path; give no hint about which field is wrong
  if (!user) {
    const err = new Error('Invalid email or password.');
    err.status = 401;
    throw err;
  }

  const valid = await comparePassword(password, user.password_hash);
  if (!valid) {
    const err = new Error('Invalid email or password.');
    err.status = 401;
    throw err;
  }

  const { password_hash: _, ...safeUser } = user;
  const token = signToken({ userId: safeUser.id, role: safeUser.role, email: safeUser.email });
  return { user: safeUser, token };
}

module.exports = { register, login };
