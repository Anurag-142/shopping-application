const { validationResult } = require('express-validator');
const authService = require('./service');

async function signup(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }
    const { name, email, password } = req.body;
    const { user, token } = await authService.register({ name, email, password });
    res.status(201).json({ token, user });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }
    const { email, password } = req.body;
    const { user, token } = await authService.login({ email, password });
    res.json({ token, user });
  } catch (err) {
    next(err);
  }
}

function logout(req, res) {
  // Stateless JWT: client removes token. We confirm here.
  res.json({ message: 'Logged out successfully.' });
}

function getMe(req, res) {
  // req.user is set by jwtVerify middleware
  res.json({ user: req.user });
}

module.exports = { signup, login, logout, getMe };
