const db = require('./db');

function startSimulator(io) {
  console.log('Starting Ambulance GPS Simulator...');
  
  // Every 2 seconds, slightly move all "in-transit" ambulances toward their assigned hospitals
  setInterval(async () => {
    try {
      // 1. Get all active emergency cases with 'in-transit' status that have an assigned hospital
      const result = await db.query(`
        SELECT 
          c.id as case_id, 
          c.ambulance_id, 
          c.assigned_hospital_id,
          c.trauma_level,
          c.bed_type_assigned,
          a.current_latitude, 
          a.current_longitude,
          h.latitude as target_lat,
          h.longitude as target_lng
        FROM emergency_cases c
        JOIN ambulances a ON c.ambulance_id = a.id
        JOIN hospitals h ON c.assigned_hospital_id = h.id
        WHERE c.status = 'in-transit'
      `);
      
      const activeTransits = result.rows;

      for (const transit of activeTransits) {
        // Simple interpolation logic
        const speed = 0.0005; // roughly 50m per tick
        
        let dLat = transit.target_lat - transit.current_latitude;
        let dLng = transit.target_lng - transit.current_longitude;
        const dist = Math.sqrt(dLat*dLat + dLng*dLng);
        
        let newLat = transit.target_lat;
        let newLng = transit.target_lng;
        let hasArrived = false;

        if (dist > speed) {
          dLat = (dLat / dist) * speed;
          dLng = (dLng / dist) * speed;
          newLat = transit.current_latitude + dLat;
          newLng = transit.current_longitude + dLng;
        } else {
          hasArrived = true;
        }
        
        // Update ambulance coordinates in DB
        const ambStatus = hasArrived ? 'at-hospital' : 'transporting';
        await db.query(
          'UPDATE ambulances SET current_latitude = $1, current_longitude = $2, status = $3, last_ping = CURRENT_TIMESTAMP WHERE id = $4',
          [newLat, newLng, ambStatus, transit.ambulance_id]
        );
        
        // Broadcast location update
        io.emit('ambulance_location_update', {
          id: transit.ambulance_id,
          current_latitude: newLat,
          current_longitude: newLng,
          status: ambStatus
        });

        // If ambulance reached destination, automatically transition case to arrived and occupy bed
        if (hasArrived) {
          const caseRes = await db.query(
            'UPDATE emergency_cases SET status = \'arrived\' WHERE id = $1 RETURNING *',
            [transit.case_id]
          );

          const bedType = transit.bed_type_assigned || (transit.trauma_level >= 4 ? 'icu' : 'general');
          if (bedType === 'icu') {
            await db.query(
              'UPDATE hospitals SET occupied_icu_beds = LEAST(total_icu_beds, occupied_icu_beds + 1), updated_at = CURRENT_TIMESTAMP WHERE id = $1',
              [transit.assigned_hospital_id]
            );
          } else {
            await db.query(
              'UPDATE hospitals SET occupied_general_beds = LEAST(total_general_beds, occupied_general_beds + 1), updated_at = CURRENT_TIMESTAMP WHERE id = $1',
              [transit.assigned_hospital_id]
            );
          }

          const hospRes = await db.query('SELECT * FROM hospitals WHERE id = $1', [transit.assigned_hospital_id]);
          if (hospRes.rows.length > 0) {
            io.emit('hospital_capacity_update', hospRes.rows[0]);
          }

          if (caseRes.rows.length > 0) {
            io.emit('emergency_status_update', caseRes.rows[0]);
          }
        }
      }
    } catch (err) {
      console.error('Simulator error:', err);
    }
  }, 2000);
}

module.exports = startSimulator;
