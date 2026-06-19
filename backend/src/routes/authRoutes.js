const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-ierbms-key';

// Register user (in production this would be admin only)
router.post('/register', async (req, res) => {
  const { email, password, role } = req.body;
  
  try {
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);
    
    const result = await db.query(
      'INSERT INTO users (email, password_hash, role, hospital_id) VALUES ($1, $2, $3, $4) RETURNING id, email, role, hospital_id, created_at',
      [email, password_hash, role, req.body.hospital_id || null]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, hospital_id: user.hospital_id },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({
      token,
      user: { id: user.id, email: user.email, role: user.role, hospital_id: user.hospital_id }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get hospital logins (for demo purposes)
router.get('/hospital-logins', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT u.email, h.name as hospital_name 
      FROM users u 
      JOIN hospitals h ON u.hospital_id = h.id 
      WHERE u.role = 'hospital'
      ORDER BY h.name
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update account credentials
router.put('/account/:id', async (req, res) => {
  const { id } = req.params;
  const { email, password } = req.body;
  
  try {
    let query = 'UPDATE users SET email = $1 WHERE id = $2 RETURNING id, email, role, hospital_id';
    let values = [email, id];

    if (password) {
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(password, salt);
      query = 'UPDATE users SET email = $1, password_hash = $2 WHERE id = $3 RETURNING id, email, role, hospital_id';
      values = [email, password_hash, id];
    }

    const result = await db.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
