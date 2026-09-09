const db = require('./db');
const { withTransaction } = require('./db');
const { applyCaseTransition, emitHospitalCapacity } = require('./services/bedLifecycle');

const TICK_MS = 2000;
const STEP = 0.0005; // ~50 m per tick

function startSimulator(io) {
  console.log('Starting Ambulance GPS Simulator...');

  let running = false; // prevent overlapping ticks if a tick runs long

  setInterval(async () => {
    if (running) return;
    running = true;
    try {
      const { rows: transits } = await db.query(`
        SELECT
          c.id AS case_id, c.ambulance_id, c.assigned_hospital_id,
          c.trauma_level, c.bed_type_assigned,
          a.current_latitude, a.current_longitude,
          h.latitude AS target_lat, h.longitude AS target_lng
        FROM emergency_cases c
        JOIN ambulances a ON c.ambulance_id = a.id
        JOIN hospitals h ON c.assigned_hospital_id = h.id
        WHERE c.status = 'in-transit'
      `);

      for (const t of transits) {
        const dLat = t.target_lat - t.current_latitude;
        const dLng = t.target_lng - t.current_longitude;
        const dist = Math.sqrt(dLat * dLat + dLng * dLng);
        const hasArrived = dist <= STEP;

        const newLat = hasArrived ? t.target_lat : t.current_latitude + (dLat / dist) * STEP;
        const newLng = hasArrived ? t.target_lng : t.current_longitude + (dLng / dist) * STEP;
        const ambStatus = hasArrived ? 'at-hospital' : 'transporting';

        await db.query(
          'UPDATE ambulances SET current_latitude = $1, current_longitude = $2, status = $3, last_ping = CURRENT_TIMESTAMP WHERE id = $4',
          [newLat, newLng, ambStatus, t.ambulance_id]
        );
        io.emit('ambulance_location_update', {
          id: t.ambulance_id, current_latitude: newLat, current_longitude: newLng, status: ambStatus,
        });

        if (!hasArrived) continue;

        const bedType = t.bed_type_assigned || (t.trauma_level >= 4 ? 'icu' : 'general');
        const { updatedCase, touched } = await withTransaction(async (tx) => {
          // Only transition if still in-transit (guards against a manual "arrived" landing first).
          const upd = await tx.query(
            "UPDATE emergency_cases SET status = 'arrived' WHERE id = $1 AND status = 'in-transit' RETURNING *",
            [t.case_id]
          );
          if (upd.rows.length === 0) return { updatedCase: null, touched: new Set() };
          const touched = await applyCaseTransition(tx, {
            oldStatus: 'in-transit',
            newStatus: 'arrived',
            oldHospitalId: t.assigned_hospital_id,
            newHospitalId: t.assigned_hospital_id,
            oldBedType: bedType,
            newBedType: bedType,
          });
          return { updatedCase: upd.rows[0], touched };
        });

        await emitHospitalCapacity(db, io, touched);
        if (updatedCase) io.emit('emergency_status_update', updatedCase);
      }
    } catch (err) {
      console.error('Simulator error:', err.message);
    } finally {
      running = false;
    }
  }, TICK_MS);
}

module.exports = startSimulator;
