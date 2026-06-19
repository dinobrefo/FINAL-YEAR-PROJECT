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

// Update full hospital metadata
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { total_general_beds, occupied_general_beds, total_icu_beds, occupied_icu_beds, specialists, equipment } = req.body;
  
  if (
    total_general_beds < 0 || occupied_general_beds < 0 ||
    total_icu_beds < 0 || occupied_icu_beds < 0 ||
    occupied_general_beds > total_general_beds ||
    occupied_icu_beds > total_icu_beds
  ) {
    return res.status(400).json({ error: 'Invalid bed capacity figures. Occupied beds cannot exceed total beds, and negative numbers are not allowed.' });
  }

  try {
    const result = await db.query(
      `UPDATE hospitals 
       SET total_general_beds = $1, occupied_general_beds = $2, total_icu_beds = $3, occupied_icu_beds = $4, specialists = $5, equipment = $6, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $7 RETURNING *`,
      [total_general_beds, occupied_general_beds, total_icu_beds, occupied_icu_beds, specialists || [], equipment || {}, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Hospital not found' });
    }
    
    // Broadcast capacity update
    req.io.emit('hospital_capacity_update', result.rows[0]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update hospital static profile
router.put('/:id/profile', async (req, res) => {
  const { id } = req.params;
  const { name, latitude, longitude } = req.body;
  
  const numLat = parseFloat(latitude);
  const numLng = parseFloat(longitude);
  
  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Hospital name cannot be empty.' });
  }
  if (isNaN(numLat) || numLat < -90 || numLat > 90 || isNaN(numLng) || numLng < -180 || numLng > 180) {
    return res.status(400).json({ error: 'Invalid geographical coordinates.' });
  }

  try {
    const result = await db.query(
      `UPDATE hospitals 
       SET name = $1, latitude = $2, longitude = $3, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $4 RETURNING *`,
      [name, latitude, longitude, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Hospital not found' });
    }
    
    // Broadcast generic update so clients can refresh name
    req.io.emit('hospital_capacity_update', result.rows[0]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
