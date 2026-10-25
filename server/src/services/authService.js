const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../db');
const { ApiError } = require('../utils/errors');

function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role, name: user.full_name },
    config.jwtSecret,
    { expiresIn: '12h' }
  );
}


async function login(email, password) {
  const user = await db.getOne(
    `SELECT u.id, u.email, u.password_hash, u.full_name, u.is_active, r.code AS role
     FROM users u JOIN roles r ON r.id = u.role_id
     WHERE lower(u.email) = lower($1)`,
    [email]
  );
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    const err = new Error('Email or password is incorrect.');
    err.code = 'INVALID_CREDENTIALS';
    throw err;
  }
  if (!user.is_active) {
    const err = new Error('This account has been deactivated.');
    err.code = 'ACCOUNT_DISABLED';
    throw err;
  }
  await db.query('UPDATE users SET last_login_at = now() WHERE id = $1', [user.id]);
  const token = signToken(user);
  return {
    token,
    user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role },
  };
}

async function getMe(userId) {
  return db.getOne(
    `SELECT u.id, u.email, u.full_name, u.is_active, u.last_login_at, r.code AS role, r.name AS role_name
     FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = $1`,
    [userId]
  );
}

async function listUsers() {
  return db.getMany(
    `SELECT u.id, u.email, u.full_name, u.is_active, u.last_login_at, r.code AS role, r.name AS role_name
     FROM users u JOIN roles r ON r.id = u.role_id ORDER BY u.id`
  );
}

async function createUser({ email, password, full_name, role }) {
  const roleRow = await db.getOne('SELECT id FROM roles WHERE code = $1', [role]);
  if (!roleRow) {
    const err = new Error('Role not found.');
    err.code = 'ROLE_NOT_FOUND';
    throw err;
  }
  const row = await db.getOne(
    `INSERT INTO users (email, password_hash, full_name, role_id)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, full_name, role_id`,
    [email.toLowerCase(), bcrypt.hashSync(password, 10), full_name, roleRow.id]
  );
  return row;
}

async function updateUser(id, { full_name, role, is_active }) {
  let roleId = null;
  if (role) {
    const roleRow = await db.getOne('SELECT id FROM roles WHERE code = $1', [role]);
    if (!roleRow) {
      const err = new Error('Role not found.');
      err.code = 'ROLE_NOT_FOUND';
      throw err;
    }
    roleId = roleRow.id;
  }
  return db.getOne(
    `UPDATE users SET
       full_name = COALESCE($2, full_name),
       role_id = COALESCE($3, role_id),
       is_active = COALESCE($4, is_active)
     WHERE id = $1
     RETURNING id, email, full_name, is_active`,
    [id, full_name ?? null, roleId, is_active ?? null]
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
  return db.getMany(
    `SELECT r.id, r.code, r.name, r.description,
            COALESCE(json_agg(p.code) FILTER (WHERE p.code IS NOT NULL), '[]') AS permissions
     FROM roles r
     LEFT JOIN role_permissions rp ON rp.role_id = r.id
     LEFT JOIN permissions p ON p.id = rp.permission_id
     GROUP BY r.id ORDER BY r.id`
  );
}

async function listPermissions() {
  return db.getMany('SELECT id, code, description FROM permissions ORDER BY id');
}

async function setRolePermissions(roleId, permissionIds) {
  await db.query('DELETE FROM role_permissions WHERE role_id = $1', [roleId]);
  for (const pid of permissionIds) {
    await db.query('INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [roleId, pid]);
  }
}

module.exports = {
  login, getMe, listUsers, createUser, updateUser,
  resetPassword, deleteUser, listRoles, listPermissions, setRolePermissions,
};
