const jwt = require('jsonwebtoken');
const env = require('../config/env');

function signAccessToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, name: user.name, phone: user.phone, email: user.email },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
}

function signRefreshToken(user) {
  return jwt.sign({ id: user.id, type: 'refresh' }, env.jwtSecret, {
    expiresIn: env.jwtRefreshExpiresIn
  });
}

function verifyToken(token) {
  return jwt.verify(token, env.jwtSecret);
}

module.exports = { signAccessToken, signRefreshToken, verifyToken };
