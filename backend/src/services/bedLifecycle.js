const db = require('../db');

/**
 * Bed capacity lifecycle.
 *
 * A hospital bed moves through three states for a given emergency case:
 *
 *   reserved   -> the case has been assigned to the hospital but the patient
 *                 has not physically arrived yet (status is active / in-transit).
 *                 Counted in hospitals.reserved_*_beds ("incoming").
 *   occupied   -> the paramedic marked the case "arrived"; the patient is
 *                 physically in a bed. Counted in hospitals.occupied_*_beds.
 *   free       -> the case was resolved (after arrival) or cancelled / rerouted
 *                 (before arrival). Nothing is counted.
 *
 * `applyCaseTransition` is the single entry point: give it the case's old and
 * new (status, hospital, bed type) and it makes the minimal set of counter
 * changes and broadcasts a `hospital_capacity_update` for every hospital it
 * touched.
 */

const normBedType = (bedType) => (bedType === 'icu' ? 'icu' : 'general');

const columnsFor = (bedType) =>
  normBedType(bedType) === 'icu'
    ? { reserved: 'reserved_icu_beds', occupied: 'occupied_icu_beds', total: 'total_icu_beds' }
    : { reserved: 'reserved_general_beds', occupied: 'occupied_general_beds', total: 'total_general_beds' };

// A reservation ("incoming") is held whenever a case has a hospital and has not
// yet arrived, been resolved, or been cancelled.
const holdsReservation = (status) =>
  status != null && !['arrived', 'resolved', 'cancelled'].includes(status);

const holdsOccupied = (status) => status === 'arrived';

async function emitHospital(io, hospitalId) {
  if (!io || !hospitalId) return;
  const { rows } = await db.query('SELECT * FROM hospitals WHERE id = $1', [hospitalId]);
  if (rows.length > 0) io.emit('hospital_capacity_update', rows[0]);
}

async function bumpReserved(hospitalId, bedType, delta) {
  const c = columnsFor(bedType);
  const expr =
    delta > 0
      ? `LEAST(${c.total}, ${c.reserved} + ${delta})`
      : `GREATEST(0, ${c.reserved} - ${Math.abs(delta)})`;
  await db.query(
    `UPDATE hospitals SET ${c.reserved} = ${expr}, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
    [hospitalId]
  );
}

async function bumpOccupied(hospitalId, bedType, delta) {
  const c = columnsFor(bedType);
  const expr =
    delta > 0
      ? `LEAST(${c.total}, ${c.occupied} + ${delta})`
      : `GREATEST(0, ${c.occupied} - ${Math.abs(delta)})`;
  await db.query(
    `UPDATE hospitals SET ${c.occupied} = ${expr}, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
    [hospitalId]
  );
}

/**
 * Reconcile bed counters for a single case transition.
 *
 * @param {object} io                Socket.IO server (may be null).
 * @param {object} change
 * @param {?string} change.oldStatus       Previous case status (null on creation).
 * @param {?string} change.newStatus       New case status.
 * @param {?string} change.oldHospitalId   Previously assigned hospital (null if none).
 * @param {?string} change.newHospitalId   Newly assigned hospital (null if none).
 * @param {?string} change.oldBedType      Previous bed type ('general' | 'icu').
 * @param {?string} change.newBedType      New bed type ('general' | 'icu').
 */
async function applyCaseTransition(io, {
  oldStatus = null,
  newStatus = null,
  oldHospitalId = null,
  newHospitalId = null,
  oldBedType = 'general',
  newBedType = 'general',
}) {
  const reservedBefore = holdsReservation(oldStatus) && !!oldHospitalId;
  const reservedAfter = holdsReservation(newStatus) && !!newHospitalId;
  const occupiedBefore = holdsOccupied(oldStatus) && !!oldHospitalId;
  const occupiedAfter = holdsOccupied(newStatus) && !!newHospitalId;

  const sameSlot =
    oldHospitalId === newHospitalId && normBedType(oldBedType) === normBedType(newBedType);

  const touched = new Set();

  // Release the old slot when the case leaves it (status change, reroute, or bed-type change).
  if (reservedBefore && (!reservedAfter || !sameSlot)) {
    await bumpReserved(oldHospitalId, oldBedType, -1);
    touched.add(oldHospitalId);
  }
  if (occupiedBefore && (!occupiedAfter || !sameSlot)) {
    await bumpOccupied(oldHospitalId, oldBedType, -1);
    touched.add(oldHospitalId);
  }

  // Acquire the new slot when the case enters it.
  if (reservedAfter && (!reservedBefore || !sameSlot)) {
    await bumpReserved(newHospitalId, newBedType, +1);
    touched.add(newHospitalId);
  }
  if (occupiedAfter && (!occupiedBefore || !sameSlot)) {
    await bumpOccupied(newHospitalId, newBedType, +1);
    touched.add(newHospitalId);
  }

  for (const hospitalId of touched) {
    await emitHospital(io, hospitalId);
  }

  return touched;
}

module.exports = { applyCaseTransition, normBedType, holdsReservation };
