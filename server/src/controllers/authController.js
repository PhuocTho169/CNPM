const authService = require('../services/authService');
const { success, created } = require('../utils/errors');
const { requireFields, isValidEmail } = require('../validators');

async function login(req, res, next) {
  try {
    requireFields(req.body, ['email', 'password']);
    if (!isValidEmail(req.body.email)) {
      const err = new Error('Invalid email format.');
      err.code = 'VALIDATION_ERROR';
      err.statusCode = 400;
      throw err;
    }
    const result = await authService.login(req.body.email, req.body.password);
    return success(res, result);
  } catch (err) {
    const { ApiError } = require('../utils/errors');
    if (!(err instanceof ApiError) && err.code) {
      return next(new ApiError(401, err.code, err.message));
    }
    return next(err);
  }
}

async function me(req, res, next) {
  try {
    return success(res, await authService.getMe(req.user.sub));
  } catch (err) {
    return next(err);
  }
}

async function listUsers(req, res, next) {
  try { return success(res, await authService.listUsers()); } catch (err) { return next(err); }
}

async function createUser(req, res, next) {
  try {
    requireFields(req.body, ['email', 'password', 'role']);
    if (!isValidEmail(req.body.email)) {
      return next(new (require('../utils/errors').ApiError)(400, 'VALIDATION_ERROR', 'Invalid email format.'));
    }
    return created(res, await authService.createUser(req.body));
  } catch (err) { return next(err); }
}

async function updateUser(req, res, next) {
  try { return success(res, await authService.updateUser(req.params.id, req.body)); } catch (err) { return next(err); }
}

async function resetPassword(req, res, next) {
  try {
    requireFields(req.body, ['password']);
    await authService.resetPassword(req.params.id, req.body.password);
    return success(res, { id: Number(req.params.id), password_reset: true });
  } catch (err) { return next(err); }
}

async function deleteUser(req, res, next) {
  try {
    if (Number(req.params.id) === req.user.sub) {
      return next(new (require('../utils/errors').ApiError)(400, 'CANNOT_DELETE_SELF', 'You cannot delete your own account.'));
    }
    await authService.deleteUser(req.params.id);
    return success(res, { id: Number(req.params.id), deleted: true });
  } catch (err) { return next(err); }
}

async function listRoles(req, res, next) {
  try { return success(res, await authService.listRoles()); } catch (err) { return next(err); }
}

async function listPermissions(req, res, next) {
  try { return success(res, await authService.listPermissions()); } catch (err) { return next(err); }
}

async function setRolePermissions(req, res, next) {
  try {
    requireFields(req.body, ['permission_ids']);
    return success(res, await authService.setRolePermissions(req.params.id, req.body.permission_ids));
  } catch (err) { return next(err); }
}

module.exports = { login, me, listUsers, createUser, updateUser, resetPassword, deleteUser, listRoles, listPermissions, setRolePermissions };
