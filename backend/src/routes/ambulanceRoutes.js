const express = require('express');
const router = express.Router();
const db = require('../db');
const { withTransaction } = require('../db');
const { applyCaseTransition, emitHospitalCapacity } = require('../services/bedLifecycle');
const { assertUuid, assertEnum, isUuid, badRequest, notFound } = require('../lib/http');

const CASE_STATUSES = ['active', 'in-transit', 'arrived', 'resolved', 'cancelled'];
const BED_TYPES = ['general', 'icu'];

const toFiniteNumber = (v, label) => {
  const n = Number(v);
  if (!Number.isFinite(n)) throw badRequest(`${label} must be a number`, 'invalid_number');
  return n;
};

// Get all ambulances
router.get('/', async (req, res) => {
  const result = await db.query('SELECT * FROM ambulances ORDER BY call_sign');
  res.json(result.rows);
});

// Add a new ambulance
router.post('/', async (req, res) => {
  const { call_sign, current_latitude, current_longitude } = req.body;
  if (!call_sign || typeof call_sign !== 'string') {
    throw badRequest('call_sign is required', 'missing_call_sign');
  }
  const result = await db.query(
    "INSERT INTO ambulances (call_sign, status, current_latitude, current_longitude) VALUES ($1, 'available', $2, $3) RETURNING *",
    [call_sign.trim(), current_latitude ?? null, current_longitude ?? null]
  );
  res.status(201).json(result.rows[0]);
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
    status = 'in-transit',
  } = req.body;

  assertEnum(status, CASE_STATUSES, 'status');
  if (bed_type_assigned != null) assertEnum(bed_type_assigned, BED_TYPES, 'bed_type_assigned');
  if (trauma_level != null) {
    trauma_level = toFiniteNumber(trauma_level, 'trauma_level');
    if (trauma_level < 1 || trauma_level > 5) throw badRequest('trauma_level must be 1-5', 'invalid_trauma_level');
  }
  if (ambulance_id != null && !isUuid(ambulance_id)) ambulance_id = null;
  if (assigned_hospital_id != null) assertUuid(assigned_hospital_id, 'hospital id');
  if (patient_vitals != null && typeof patient_vitals !== 'object') {
    throw badRequest('patient_vitals must be an object', 'invalid_vitals');
  }

  const finalEmergencyType =
    emergency_type || (patient_vitals && patient_vitals.emergencyType) || 'General Emergency';
  const finalBedType = bed_type_assigned || (Number(trauma_level) >= 4 ? 'icu' : 'general');

  const { newCase, touched } = await withTransaction(async (tx) => {
    if (ambulance_id) {
      const amb = await tx.query('SELECT id FROM ambulances WHERE id = $1', [ambulance_id]);
      if (amb.rows.length === 0) throw badRequest('The selected ambulance unit does not exist. Please refresh.', 'unknown_ambulance');
    }
    if (assigned_hospital_id) {
      const hosp = await tx.query('SELECT id FROM hospitals WHERE id = $1', [assigned_hospital_id]);
      if (hosp.rows.length === 0) throw badRequest('The selected hospital does not exist. Please refresh.', 'unknown_hospital');
    }

    const inserted = await tx.query(
      `INSERT INTO emergency_cases
        (ambulance_id, assigned_hospital_id, patient_identifier, trauma_level, emergency_type, triage_notes, bed_type_assigned, patient_vitals, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [ambulance_id, assigned_hospital_id, patient_identifier, trauma_level ?? null,
       finalEmergencyType, triage_notes || null, finalBedType, patient_vitals || {}, status]
    );
    const newCase = inserted.rows[0];

    if (ambulance_id) {
      await tx.query("UPDATE ambulances SET status = 'transporting' WHERE id = $1", [ambulance_id]);
    }

    // Hold an "incoming" bed at the assigned hospital straight away.
    const touched = await applyCaseTransition(tx, {
      oldStatus: null,
      newStatus: newCase.status,
      oldHospitalId: null,
      newHospitalId: assigned_hospital_id || null,
      oldBedType: null,
      newBedType: finalBedType,
    });

    return { newCase, touched };
  });

  await emitHospitalCapacity(db, req.io, touched);
  req.io.emit('new_emergency_case', newCase);
  res.status(201).json(newCase);
});

// Update ambulance location
router.put('/:id/location', async (req, res) => {
  const id = assertUuid(req.params.id, 'ambulance id');
  const latitude = toFiniteNumber(req.body.latitude, 'latitude');
  const longitude = toFiniteNumber(req.body.longitude, 'longitude');
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    throw badRequest('Coordinates out of range', 'coords_out_of_range');
  }

  const result = await db.query(
    'UPDATE ambulances SET current_latitude = $1, current_longitude = $2, last_ping = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
    [latitude, longitude, id]
  );
  if (result.rows.length === 0) throw notFound('Ambulance not found');

  req.io.emit('ambulance_location_update', result.rows[0]);
  res.json(result.rows[0]);
});

// Update emergency case status & synchronize hospital bed inventory
router.put('/cases/:id/status', async (req, res) => {
  const id = assertUuid(req.params.id, 'case id');
  const { status, hospital_id, triage_notes, bed_type_assigned } = req.body;
  assertEnum(status, CASE_STATUSES, 'status');
  if (hospital_id != null) assertUuid(hospital_id, 'hospital id');
  if (bed_type_assigned != null) assertEnum(bed_type_assigned, BED_TYPES, 'bed_type_assigned');

  const result = await withTransaction(async (tx) => {
    // Lock the case row so concurrent status updates (e.g. a double-click) serialise.
    const existing = await tx.query('SELECT * FROM emergency_cases WHERE id = $1 FOR UPDATE', [id]);
    if (existing.rows.length === 0) throw notFound('Case not found');
    const existingCase = existing.rows[0];
    const oldStatus = existingCase.status;
    const targetHospitalId = hospital_id || existingCase.assigned_hospital_id;
    const resolvedBedType =
      bed_type_assigned || existingCase.bed_type_assigned || (existingCase.trauma_level >= 4 ? 'icu' : 'general');

    if (hospital_id) {
      const hosp = await tx.query('SELECT id FROM hospitals WHERE id = $1', [hospital_id]);
      if (hosp.rows.length === 0) throw badRequest('Target hospital does not exist', 'unknown_hospital');
    }

    const updateFields = ['status = $1'];
    const params = [status, id];
    let p = 3;
    if (status === 'resolved') updateFields.push('resolved_at = CURRENT_TIMESTAMP');
    if (hospital_id) { updateFields.push(`assigned_hospital_id = $${p++}`); params.push(hospital_id); }
    if (triage_notes !== undefined) { updateFields.push(`triage_notes = $${p++}`); params.push(triage_notes); }
    if (bed_type_assigned !== undefined) { updateFields.push(`bed_type_assigned = $${p++}`); params.push(bed_type_assigned); }

    const upd = await tx.query(
      `UPDATE emergency_cases SET ${updateFields.join(', ')} WHERE id = $2 RETURNING *`,
      params
    );
    const updatedCase = upd.rows[0];

    const touched = await applyCaseTransition(tx, {
      oldStatus,
      newStatus: status,
      oldHospitalId: existingCase.assigned_hospital_id,
      newHospitalId: targetHospitalId,
      oldBedType: existingCase.bed_type_assigned,
      newBedType: resolvedBedType,
    });

    let freedAmbulance = null;
    if (status === 'resolved' && oldStatus !== 'resolved' && existingCase.ambulance_id) {
      const amb = await tx.query(
        "UPDATE ambulances SET status = 'available' WHERE id = $1 RETURNING *",
        [existingCase.ambulance_id]
      );
      freedAmbulance = amb.rows[0] || null;
    }

    return { updatedCase, touched, freedAmbulance };
  });

  await emitHospitalCapacity(db, req.io, result.touched);
  if (result.freedAmbulance) req.io.emit('ambulance_location_update', result.freedAmbulance);
  req.io.emit('emergency_status_update', result.updatedCase);
  res.json(result.updatedCase);
});

// Reroute emergency case to a different hospital (Command Center / Driver)
router.put('/cases/:id/reroute', async (req, res) => {
  const id = assertUuid(req.params.id, 'case id');
  const hospital_id = assertUuid(req.body.hospital_id, 'hospital id');

  const result = await withTransaction(async (tx) => {
    const hosp = await tx.query('SELECT id FROM hospitals WHERE id = $1', [hospital_id]);
    if (hosp.rows.length === 0) throw notFound('Target hospital not found');

    const existing = await tx.query('SELECT * FROM emergency_cases WHERE id = $1 FOR UPDATE', [id]);
    if (existing.rows.length === 0) throw notFound('Case not found');
    const existingCase = existing.rows[0];

    const upd = await tx.query(
      'UPDATE emergency_cases SET assigned_hospital_id = $1 WHERE id = $2 RETURNING *',
      [hospital_id, id]
    );

    const touched = await applyCaseTransition(tx, {
      oldStatus: existingCase.status,
      newStatus: existingCase.status,
      oldHospitalId: existingCase.assigned_hospital_id,
      newHospitalId: hospital_id,
      oldBedType: existingCase.bed_type_assigned,
      newBedType: existingCase.bed_type_assigned,
    });

    return { updatedCase: upd.rows[0], touched };
  });

  await emitHospitalCapacity(db, req.io, result.touched);
  req.io.emit('emergency_status_update', result.updatedCase);
  res.json(result.updatedCase);
});

// Reassign ambulance to emergency case
router.put('/cases/:id/assign-ambulance', async (req, res) => {
  const id = assertUuid(req.params.id, 'case id');
  const ambulance_id = assertUuid(req.body.ambulance_id, 'ambulance id');

  const result = await withTransaction(async (tx) => {
    const amb = await tx.query('SELECT * FROM ambulances WHERE id = $1', [ambulance_id]);
    if (amb.rows.length === 0) throw notFound('Ambulance not found');

    const existing = await tx.query('SELECT * FROM emergency_cases WHERE id = $1 FOR UPDATE', [id]);
    if (existing.rows.length === 0) throw notFound('Case not found');
    const existingCase = existing.rows[0];

    // Don't resurrect a resolved case or downgrade one that already arrived.
    const newStatus = ['resolved', 'arrived'].includes(existingCase.status)
      ? existingCase.status
      : 'in-transit';

    const upd = await tx.query(
      'UPDATE emergency_cases SET ambulance_id = $1, status = $2 WHERE id = $3 RETURNING *',
      [ambulance_id, newStatus, id]
    );
    await tx.query("UPDATE ambulances SET status = 'transporting' WHERE id = $1", [ambulance_id]);

    const touched = await applyCaseTransition(tx, {
      oldStatus: existingCase.status,
      newStatus,
      oldHospitalId: existingCase.assigned_hospital_id,
      newHospitalId: existingCase.assigned_hospital_id,
      oldBedType: existingCase.bed_type_assigned,
      newBedType: existingCase.bed_type_assigned,
    });

    return { updatedCase: upd.rows[0], touched };
  });

  await emitHospitalCapacity(db, req.io, result.touched);
  req.io.emit('emergency_status_update', result.updatedCase);
  req.io.emit('ambulance_location_update', { id: ambulance_id, status: 'transporting' });
  res.json(result.updatedCase);
});

module.exports = router;
