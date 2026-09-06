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
  let { 
    ambulance_id, 
    assigned_hospital_id, 
    patient_identifier, 
    trauma_level, 
    emergency_type, 
    triage_notes, 
    bed_type_assigned, 
    patient_vitals, 
    status = 'in-transit' 
  } = req.body;
  
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  try {
    // Validate and clean up ambulance_id to prevent UUID format or foreign key constraint crashes
    if (ambulance_id) {
      if (!UUID_REGEX.test(ambulance_id)) {
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

    const finalEmergencyType = emergency_type || (patient_vitals && patient_vitals.emergencyType) || 'General Emergency';
    const finalBedType = bed_type_assigned || (trauma_level >= 4 ? 'icu' : 'general');

    const result = await db.query(
      `INSERT INTO emergency_cases 
        (ambulance_id, assigned_hospital_id, patient_identifier, trauma_level, emergency_type, triage_notes, bed_type_assigned, patient_vitals, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
       RETURNING *`,
      [ambulance_id, assigned_hospital_id, patient_identifier, trauma_level, finalEmergencyType, triage_notes || null, finalBedType, patient_vitals || {}, status]
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

// Update emergency case status & synchronize hospital bed inventory
router.put('/cases/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status, hospital_id, triage_notes, bed_type_assigned } = req.body;
  
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_REGEX.test(id)) {
    return res.status(400).json({ error: 'Invalid case ID format' });
  }
  if (hospital_id && !UUID_REGEX.test(hospital_id)) {
    return res.status(400).json({ error: 'Invalid hospital ID format' });
  }
  
  try {
    // 1. Fetch current case details
    const existingCaseRes = await db.query('SELECT * FROM emergency_cases WHERE id = $1', [id]);
    if (existingCaseRes.rows.length === 0) {
      return res.status(404).json({ error: 'Case not found' });
    }
    const existingCase = existingCaseRes.rows[0];
    const oldStatus = existingCase.status;
    const targetHospitalId = hospital_id || existingCase.assigned_hospital_id;
    const resolvedBedType = bed_type_assigned || existingCase.bed_type_assigned || (existingCase.trauma_level >= 4 ? 'icu' : 'general');

    // 2. Build dynamic update query
    let updateFields = ['status = $1'];
    let params = [status, id];
    let paramIndex = 3;

    if (status === 'resolved') {
      updateFields.push('resolved_at = CURRENT_TIMESTAMP');
    }
    if (hospital_id) {
      updateFields.push(`assigned_hospital_id = $${paramIndex}`);
      params.push(hospital_id);
      paramIndex++;
    }
    if (triage_notes !== undefined) {
      updateFields.push(`triage_notes = $${paramIndex}`);
      params.push(triage_notes);
      paramIndex++;
    }
    if (bed_type_assigned !== undefined) {
      updateFields.push(`bed_type_assigned = $${paramIndex}`);
      params.push(bed_type_assigned);
      paramIndex++;
    }

    const query = `UPDATE emergency_cases SET ${updateFields.join(', ')} WHERE id = $2 RETURNING *`;
    const result = await db.query(query, params);
    const updatedCase = result.rows[0];

    // 3. Automated Bed Capacity Lifecycle Management
    if (targetHospitalId) {
      // If arriving, occupy a bed
      if (oldStatus !== 'arrived' && status === 'arrived') {
        if (resolvedBedType === 'icu') {
          await db.query(
            'UPDATE hospitals SET occupied_icu_beds = LEAST(total_icu_beds, occupied_icu_beds + 1), updated_at = CURRENT_TIMESTAMP WHERE id = $1',
            [targetHospitalId]
          );
        } else {
          await db.query(
            'UPDATE hospitals SET occupied_general_beds = LEAST(total_general_beds, occupied_general_beds + 1), updated_at = CURRENT_TIMESTAMP WHERE id = $1',
            [targetHospitalId]
          );
        }
        const updatedHosp = await db.query('SELECT * FROM hospitals WHERE id = $1', [targetHospitalId]);
        if (updatedHosp.rows.length > 0) {
          req.io.emit('hospital_capacity_update', updatedHosp.rows[0]);
        }
      } 
      // If resolved from arrived, free the occupied bed
      else if (oldStatus === 'arrived' && status === 'resolved') {
        if (resolvedBedType === 'icu') {
          await db.query(
            'UPDATE hospitals SET occupied_icu_beds = GREATEST(0, occupied_icu_beds - 1), updated_at = CURRENT_TIMESTAMP WHERE id = $1',
            [targetHospitalId]
          );
        } else {
          await db.query(
            'UPDATE hospitals SET occupied_general_beds = GREATEST(0, occupied_general_beds - 1), updated_at = CURRENT_TIMESTAMP WHERE id = $1',
            [targetHospitalId]
          );
        }
        const updatedHosp = await db.query('SELECT * FROM hospitals WHERE id = $1', [targetHospitalId]);
        if (updatedHosp.rows.length > 0) {
          req.io.emit('hospital_capacity_update', updatedHosp.rows[0]);
        }
      }
    }

    // 4. Free ambulance unit when emergency is resolved
    if (status === 'resolved' && existingCase.ambulance_id) {
      await db.query("UPDATE ambulances SET status = 'available' WHERE id = $1", [existingCase.ambulance_id]);
      const updatedAmb = await db.query('SELECT * FROM ambulances WHERE id = $1', [existingCase.ambulance_id]);
      if (updatedAmb.rows.length > 0) {
        req.io.emit('ambulance_location_update', updatedAmb.rows[0]);
      }
    }

    // Broadcast status change so all connected dashboards update in real time
    req.io.emit('emergency_status_update', updatedCase);
    res.json(updatedCase);
  } catch (err) {
    console.error('Error updating case:', err);
    res.status(500).json({ error: 'Failed to update status: ' + err.message });
  }
});

// Reroute emergency case to a different hospital (Command Center / Driver)
router.put('/cases/:id/reroute', async (req, res) => {
  const { id } = req.params;
  const { hospital_id } = req.body;

  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_REGEX.test(id) || !UUID_REGEX.test(hospital_id)) {
    return res.status(400).json({ error: 'Invalid ID format' });
  }

  try {
    const hospCheck = await db.query('SELECT * FROM hospitals WHERE id = $1', [hospital_id]);
    if (hospCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Target hospital not found' });
    }

    const result = await db.query(
      'UPDATE emergency_cases SET assigned_hospital_id = $1 WHERE id = $2 RETURNING *',
      [hospital_id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Case not found' });
    }

    req.io.emit('emergency_status_update', result.rows[0]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Reroute error:', err);
    res.status(500).json({ error: 'Failed to reroute emergency: ' + err.message });
  }
});

// Reassign ambulance to emergency case
router.put('/cases/:id/assign-ambulance', async (req, res) => {
  const { id } = req.params;
  const { ambulance_id } = req.body;

  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_REGEX.test(id) || !UUID_REGEX.test(ambulance_id)) {
    return res.status(400).json({ error: 'Invalid ID format' });
  }

  try {
    const ambCheck = await db.query('SELECT * FROM ambulances WHERE id = $1', [ambulance_id]);
    if (ambCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Ambulance not found' });
    }

    const result = await db.query(
      'UPDATE emergency_cases SET ambulance_id = $1, status = \'in-transit\' WHERE id = $2 RETURNING *',
      [ambulance_id, id]
    );

    await db.query("UPDATE ambulances SET status = 'transporting' WHERE id = $1", [ambulance_id]);

    req.io.emit('emergency_status_update', result.rows[0]);
    req.io.emit('ambulance_location_update', { id: ambulance_id, status: 'transporting' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Ambulance assign error:', err);
    res.status(500).json({ error: 'Failed to assign ambulance: ' + err.message });
  }
});

module.exports = router;
