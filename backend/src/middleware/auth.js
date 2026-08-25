const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { ApiError } = require('./errorHandler');

function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw new ApiError(401, 'Missing or malformed Authorization header');
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    req.user = payload; // { id, role, name, ... }
    next();
  } catch (err) {
    throw new ApiError(401, 'Invalid or expired token');
  }
}

function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      throw new ApiError(401, 'Not authenticated');
    }
    if (!allowedRoles.includes(req.user.role)) {
      throw new ApiError(403, `Role '${req.user.role}' is not permitted to perform this action`);
    }
    next();
  };
}

module.exports = { authenticate, authorize };
