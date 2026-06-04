const express = require('express');
const router = express.Router();
const db = require('../db');

// Get all hospitals and capacities
router.get('/', async (req, res) => {
  const result = await db.query('SELECT * FROM hospitals');
  res.json(result.rows);
});

// Add a new hospital
router.post('/', async (req, res) => {
  const { name, latitude, longitude, total_general_beds, total_icu_beds } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO hospitals (name, latitude, longitude, total_general_beds, occupied_general_beds, total_icu_beds, occupied_icu_beds) VALUES ($1, $2, $3, $4, 0, $5, 0) RETURNING *',
      [name, latitude, longitude, total_general_beds, total_icu_beds]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update hospital bed capacity
router.put('/:id/capacity', async (req, res) => {
  const { id } = req.params;
  const { occupied_general_beds, occupied_icu_beds } = req.body;
  
  const result = await db.query(
    'UPDATE hospitals SET occupied_general_beds = $1, occupied_icu_beds = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
    [occupied_general_beds, occupied_icu_beds, id]
  );
  
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Hospital not found' });
  }
  
  // Broadcast capacity update to command center and active ambulances
  req.io.emit('hospital_capacity_update', result.rows[0]);
  res.json(result.rows[0]);
});

module.exports = router;
