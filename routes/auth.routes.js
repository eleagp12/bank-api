const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db');

const router = express.Router();

/* ======================
   LOGIN
====================== */
router.post('/login', async (req, res) => {
  const { username, pin } = req.body;

  if (!username || !pin) {
    return res.status(400).json({ error: 'Missing credentials' });
  }

  try {
    const userRes = await pool.query(
      `SELECT id, pin_hash, role FROM users WHERE username = $1`,
      [username.trim()],
    );

    if (userRes.rowCount === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = userRes.rows[0];
    const valid = await bcrypt.compare(pin.trim(), user.pin_hash);

    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' },
    );

    res.json({
      userId: user.id,
      role: user.role,
      token,
    });
  } catch (err) {
    console.error('LOGIN ERROR:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

/* ======================
   REGISTER
====================== */
router.post('/register', async (req, res) => {
  const { name, lastName, username, email, password, confirmPassword } =
    req.body;

  if (
    !name ||
    !lastName ||
    !username ||
    !email ||
    !password ||
    !confirmPassword
  ) {
    return res.status(400).json({ error: 'All fields required' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match' });
  }

  try {
    const exists = await pool.query(
      `SELECT 1 FROM users WHERE username = $1 OR email = $2`,
      [username.trim(), email.trim()],
    );

    if (exists.rowCount > 0) {
      return res.status(409).json({ error: 'User already exists' });
    }

    const hash = await bcrypt.hash(password.trim(), 10);
    const fullName = `${name.trim()} ${lastName.trim()}`;

    const userRes = await pool.query(
      `
      INSERT INTO users (username, full_name, email, pin_hash, role)
      VALUES ($1, $2, $3, $4, 'user')
      RETURNING id
      `,
      [username.trim(), fullName, email.trim(), hash],
    );

    await pool.query(`INSERT INTO accounts (user_id, balance) VALUES ($1, 0)`, [
      userRes.rows[0].id,
    ]);

    res.status(201).json({ message: 'User created' });
  } catch (err) {
    console.error('REGISTER ERROR:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

module.exports = router;
