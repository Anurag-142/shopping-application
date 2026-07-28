const { Router } = require('express');
const pool = require('../../config/db');

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const result = await pool.query('SELECT id, name FROM categories ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
