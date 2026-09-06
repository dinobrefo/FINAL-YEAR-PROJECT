const express = require('express');
const router = express.Router();
const db = require('../db');

// Get regional breakdown and statistics across Ghana
router.get('/regions', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        COALESCE(region, 'Greater Accra') AS region,
        COUNT(*) AS facility_count,
        SUM(total_general_beds) AS total_general_beds,
        SUM(occupied_general_beds) AS occupied_general_beds,
        SUM(total_icu_beds) AS total_icu_beds,
        SUM(occupied_icu_beds) AS occupied_icu_beds,
        ROUND(
          CASE 
            WHEN SUM(total_general_beds) > 0 
            THEN (SUM(occupied_general_beds)::DECIMAL / SUM(total_general_beds)::DECIMAL) * 100 
            ELSE 0 
          END, 1
        ) AS general_occupancy_rate
      FROM hospitals
      GROUP BY region
      ORDER BY facility_count DESC;
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching regional stats:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all hospitals with optional regional, amenity, and search filtering
router.get('/', async (req, res) => {
  try {
    const { region, amenity_type, search, limit, offset } = req.query;
    let query = 'SELECT * FROM hospitals WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (region && region !== 'all' && region !== 'All Regions') {
      query += ` AND LOWER(region) = LOWER($${paramIndex})`;
      params.push(region);
      paramIndex++;
    }

    if (amenity_type && amenity_type !== 'all') {
      query += ` AND LOWER(amenity_type) = LOWER($${paramIndex})`;
      params.push(amenity_type);
      paramIndex++;
    }

    if (search) {
      query += ` AND (LOWER(name) LIKE LOWER($${paramIndex}) OR LOWER(district) LIKE LOWER($${paramIndex}))`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += ' ORDER BY total_general_beds DESC, name ASC';

    if (limit) {
      query += ` LIMIT $${paramIndex}`;
      params.push(parseInt(limit, 10));
      paramIndex++;
      if (offset) {
        query += ` OFFSET $${paramIndex}`;
        params.push(parseInt(offset, 10));
        paramIndex++;
      }
    }

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching hospitals:', err);
    res.status(500).json({ error: 'Server error' });
  }
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
