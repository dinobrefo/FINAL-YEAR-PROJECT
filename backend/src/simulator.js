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

        if (dist > speed) {
          dLat = (dLat / dist) * speed;
          dLng = (dLng / dist) * speed;
          newLat = transit.current_latitude + dLat;
          newLng = transit.current_longitude + dLng;
        }
        
        // Update ambulance in DB
        await db.query(
          'UPDATE ambulances SET current_latitude = $1, current_longitude = $2 WHERE id = $3',
          [newLat, newLng, transit.ambulance_id]
        );
        
        // Broadcast location update
        io.emit('ambulance_location_update', {
          id: transit.ambulance_id,
          current_latitude: newLat,
          current_longitude: newLng,
          status: 'busy'
        });
      }
    } catch (err) {
      console.error('Simulator error:', err);
    }
  }, 2000);
}

module.exports = startSimulator;
