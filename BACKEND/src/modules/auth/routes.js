const { Router } = require('express');
const { body } = require('express-validator');
const controller = require('./controller');
const jwtVerify = require('../../middleware/jwtVerify');

const router = Router();

// Signup validation rules
const signupRules = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2–100 characters.'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required.'),
  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be 8–128 characters.')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter.')
    .matches(/[a-z]/)
    .withMessage('Password must contain at least one lowercase letter.')
    .matches(/\d/)
    .withMessage('Password must contain at least one digit.'),
];

// Login validation rules
const loginRules = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required.'),
  body('password').notEmpty().withMessage('Password is required.'),
];

router.post('/signup', signupRules, controller.signup);
router.post('/login', loginRules, controller.login);
router.post('/logout', jwtVerify, controller.logout);
router.get('/me', jwtVerify, controller.getMe);

module.exports = router;
