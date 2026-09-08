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
 * `applyCaseTransition` is the single entry point. It takes a query executor
 * (`db` or a transaction client), makes the minimal set of counter changes for
 * the given old -> new (status, hospital, bed type), and returns the set of
 * hospital ids it touched. The caller is responsible for broadcasting
 * `hospital_capacity_update` for those hospitals *after* its transaction
 * commits (see `emitHospitalCapacity`).
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

async function bump(exec, hospitalId, bedType, field, delta) {
  const c = columnsFor(bedType);
  const col = c[field];
  const expr =
    delta > 0
      ? `LEAST(${c.total}, ${col} + ${delta})`
      : `GREATEST(0, ${col} - ${Math.abs(delta)})`;
  await exec.query(
    `UPDATE hospitals SET ${col} = ${expr}, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
    [hospitalId]
  );
}

/**
 * Reconcile bed counters for a single case transition.
 *
 * @param {{query: Function}} exec   db module or a transaction client.
 * @param {object} change
 * @param {?string} change.oldStatus       Previous case status (null on creation).
 * @param {?string} change.newStatus       New case status.
 * @param {?string} change.oldHospitalId   Previously assigned hospital (null if none).
 * @param {?string} change.newHospitalId   Newly assigned hospital (null if none).
 * @param {?string} change.oldBedType      Previous bed type ('general' | 'icu').
 * @param {?string} change.newBedType      New bed type ('general' | 'icu').
 * @returns {Promise<Set<string>>} hospital ids whose counters changed.
 */
async function applyCaseTransition(exec, {
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
    await bump(exec, oldHospitalId, oldBedType, 'reserved', -1);
    touched.add(oldHospitalId);
  }
  if (occupiedBefore && (!occupiedAfter || !sameSlot)) {
    await bump(exec, oldHospitalId, oldBedType, 'occupied', -1);
    touched.add(oldHospitalId);
  }

  // Acquire the new slot when the case enters it.
  if (reservedAfter && (!reservedBefore || !sameSlot)) {
    await bump(exec, newHospitalId, newBedType, 'reserved', +1);
    touched.add(newHospitalId);
  }
  if (occupiedAfter && (!occupiedBefore || !sameSlot)) {
    await bump(exec, newHospitalId, newBedType, 'occupied', +1);
    touched.add(newHospitalId);
  }

  return touched;
}

/**
 * Broadcast the current row for each hospital id in `hospitalIds`. Call this
 * from the route handler *after* the transaction has committed.
 */
async function emitHospitalCapacity(exec, io, hospitalIds) {
  if (!io || !hospitalIds || hospitalIds.size === 0) return;
  for (const hospitalId of hospitalIds) {
    const { rows } = await exec.query('SELECT * FROM hospitals WHERE id = $1', [hospitalId]);
    if (rows.length > 0) io.emit('hospital_capacity_update', rows[0]);
  }
}

module.exports = {
  applyCaseTransition,
  emitHospitalCapacity,
  normBedType,
  holdsReservation,
};
