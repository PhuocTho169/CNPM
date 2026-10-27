const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../db');
const { ApiError } = require('../utils/errors');

// The roles/permissions tables were dropped in the consolidation — role is now a
// VARCHAR column on users ('ADMIN' | 'STAFF' | 'VISITOR') and permissions are
// built-in constants served statically so the admin UI keeps working unchanged.

const ROLE_DEFS = [
  { id: 1, code: 'ADMIN', name: 'Administrator', description: 'Full access', permissions: ['places.write', 'dishes.write', 'languages.write', 'users.manage', 'routes.write', 'stats.read'] },
  { id: 2, code: 'STAFF', name: 'Staff', description: 'Content editing', permissions: ['places.write', 'dishes.write', 'routes.write', 'stats.read'] },
  { id: 3, code: 'VISITOR', name: 'Visitor', description: 'Read-only', permissions: [] },
];

function requireRole(role) {
  if (!ROLE_DEFS.some((r) => r.code === role)) {
    throw new ApiError(400, 'ROLE_NOT_FOUND', `Role "${role}" is not a valid role.`);
  }
}

function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role, name: user.full_name },
    config.jwtSecret,
    { expiresIn: '12h' }
  );
}

async function login(email, password) {
  // RBAC được rút gọn còn một cột `role` VARCHAR trên users.
  const row = await db.getOne(
    `SELECT id, email, password_hash, full_name, is_active, role
     FROM users
     WHERE lower(email) = lower($1)`,
    [email]
  );
  if (!row || !bcrypt.compareSync(password, row.password_hash)) {
    const err = new Error('Email or password is incorrect.');
    err.code = 'INVALID_CREDENTIALS';
    throw err;
  }
  if (!row.is_active) {
    const err = new Error('This account has been deactivated.');
    err.code = 'ACCOUNT_DISABLED';
    throw err;
  }
  await db.query('UPDATE users SET last_login_at = now() WHERE id = $1', [row.id]);
  const token = signToken(row);
  return {
    token,
    user: { id: row.id, email: row.email, full_name: row.full_name, role: row.role },
  };
}

async function getMe(userId) {
  return db.getOne(
    `SELECT id, email, full_name, is_active, last_login_at, role
     FROM users
     WHERE id = $1`,
    [userId]
  );
}

async function listUsers() {
  return db.getMany(
    `SELECT id, email, full_name, is_active, last_login_at, role
     FROM users ORDER BY id`
  );
}

async function createUser({ email, password, full_name, role }) {
  requireRole(role);
  return db.getOne(
    `INSERT INTO users (email, password_hash, full_name, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, full_name, role`,
    [email.toLowerCase(), bcrypt.hashSync(password, 10), full_name, role]
  );
}

async function updateUser(id, { full_name, role, is_active }) {
  if (role) requireRole(role);
  return db.getOne(
    `UPDATE users SET
       full_name = COALESCE($2, full_name),
       role = COALESCE($3, role),
       is_active = COALESCE($4, is_active)
     WHERE id = $1
     RETURNING id, email, full_name, role, is_active`,
    [id, full_name ?? null, role ?? null, is_active ?? null]
  );
}

async function resetPassword(id, newPassword) {
  await db.query('UPDATE users SET password_hash = $2 WHERE id = $1', [
    id,
    bcrypt.hashSync(newPassword, 10),
  ]);
}

async function deleteUser(id) {
  await db.query('DELETE FROM users WHERE id = $1', [id]);
}

async function listRoles() {
  return ROLE_DEFS.map(({ id, code, name, permissions }) => ({ id, code, name, permissions }));
}

async function listPermissions() {
  const seen = new Map();
  for (const role of ROLE_DEFS) {
    for (const code of role.permissions) {
      if (!seen.has(code)) seen.set(code, { id: seen.size + 1, code, description: code });
    }
  }
  return [...seen.values()];
}

// Permissions are constants now; keep the endpoint for UI compatibility but
// persist nothing.
async function setRolePermissions() {
  return { updated: false, static_permissions: true };
}

module.exports = {
  login, getMe, listUsers, createUser, updateUser,
  resetPassword, deleteUser, listRoles, listPermissions, setRolePermissions,
};
