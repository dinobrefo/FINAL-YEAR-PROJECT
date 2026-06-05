const express = require('express');
const router = express.Router();
const db = require('../db');

// Get all ambulances
router.get('/', async (req, res) => {
  const result = await db.query('SELECT * FROM ambulances');
  res.json(result.rows);
});

// Add a new ambulance
router.post('/', async (req, res) => {
  const { call_sign, current_latitude, current_longitude } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO ambulances (call_sign, status, current_latitude, current_longitude) VALUES ($1, \'available\', $2, $3) RETURNING *',
      [call_sign, current_latitude, current_longitude]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Register new emergency case
router.post('/cases', async (req, res) => {
  let { ambulance_id, assigned_hospital_id, patient_identifier, trauma_level, patient_vitals, status = 'in-transit' } = req.body;
  
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  try {
    // Validate and clean up ambulance_id to prevent UUID format or foreign key constraint crashes
    if (ambulance_id) {
      if (!UUID_REGEX.test(ambulance_id)) {
        // Fallback for mock IDs like "AMB-101" to keep demo intakes functioning
        ambulance_id = null;
      } else {
        const ambCheck = await db.query('SELECT id FROM ambulances WHERE id = $1', [ambulance_id]);
        if (ambCheck.rows.length === 0) {
          return res.status(400).json({ error: 'The selected ambulance unit does not exist in the database. Please refresh your page.' });
        }
      }
    }

    // Validate and clean up assigned_hospital_id
    if (assigned_hospital_id) {
      if (!UUID_REGEX.test(assigned_hospital_id)) {
        return res.status(400).json({ error: 'Invalid hospital ID format. Please select a valid hospital.' });
      }
      const hospCheck = await db.query('SELECT id FROM hospitals WHERE id = $1', [assigned_hospital_id]);
      if (hospCheck.rows.length === 0) {
        return res.status(400).json({ error: 'The selected hospital does not exist in the database. Please refresh your page.' });
      }
    }

    const result = await db.query(
      'INSERT INTO emergency_cases (ambulance_id, assigned_hospital_id, patient_identifier, trauma_level, patient_vitals, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [ambulance_id, assigned_hospital_id, patient_identifier, trauma_level, patient_vitals || {}, status]
    );
    
    if (ambulance_id) {
      await db.query(
        "UPDATE ambulances SET status = 'transporting' WHERE id = $1",
        [ambulance_id]
      );
    }

    req.io.emit('new_emergency_case', result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating emergency case:', err);
    res.status(500).json({ error: 'Database error saving emergency case: ' + err.message });
  }
});

// Update ambulance location
router.put('/:id/location', async (req, res) => {
  const { id } = req.params;
  const { latitude, longitude } = req.body;
  
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_REGEX.test(id)) {
    return res.status(400).json({ error: 'Invalid ambulance ID format' });
  }
  
  const result = await db.query(
    'UPDATE ambulances SET current_latitude = $1, current_longitude = $2, last_ping = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
    [latitude, longitude, id]
  );
  
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Ambulance not found' });
  }
  
  req.io.emit('ambulance_location_update', result.rows[0]);
  res.json(result.rows[0]);
});

// Update emergency case status
router.put('/cases/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status, hospital_id } = req.body;
  
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_REGEX.test(id)) {
    return res.status(400).json({ error: 'Invalid case ID format' });
  }
  if (hospital_id && !UUID_REGEX.test(hospital_id)) {
    return res.status(400).json({ error: 'Invalid hospital ID format' });
  }
  
  let query = 'UPDATE emergency_cases SET status = $1';
  let params = [status, id];
  let paramIndex = 3;

  if (status === 'resolved') {
    query += ', resolved_at = CURRENT_TIMESTAMP';
  }
  
  if (hospital_id) {
    query += `, assigned_hospital_id = $${paramIndex}`;
    params = [status, id, hospital_id];
  }
  
  query += ' WHERE id = $2 RETURNING *';
  
  try {
    const result = await db.query(query, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Case not found' });
    }
    
    // Broadcast status change so dashboards update
    req.io.emit('emergency_status_update', result.rows[0]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating case:', err);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

module.exports = router;
