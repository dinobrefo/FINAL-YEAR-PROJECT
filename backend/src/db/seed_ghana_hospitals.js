const db = require('./index');

async function fetchAndSeedGhanaHospitals() {
  console.log('Fetching hospitals in Ghana from OpenStreetMap (Overpass API)...');
  
  // Simple bounding box query covering all of Ghana (from Lat 4.7 to 11.2, Lng -3.3 to 1.2)
  const overpassQuery = `[out:json][timeout:30];node["amenity"="hospital"](4.7,-3.3,11.2,1.2);out 40;`;
  
  try {
    const response = await fetch('https://overpass.kumi.systems/api/interpreter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'IERBMS-Final-Year-Project/1.0 (kwabena.brefo@example.com)'
      },
      body: `data=${encodeURIComponent(overpassQuery)}`
    });

    if (!response.ok) {
      throw new Error(`Overpass API responded with HTTP ${response.status}`);
    }
    
    const data = await response.json();
    const elements = data.elements || [];
    
    if (elements.length === 0) {
      console.log('No hospitals found in OpenStreetMap registry.');
      return;
    }
    
    console.log(`Successfully fetched ${elements.length} real hospitals from Ghana OSM registry!`);
    console.log('Clearing database tables before import...');
    
    // Clear old tables to prevent conflicts
    await db.query('DELETE FROM emergency_cases');
    await db.query('DELETE FROM hospital_equipment');
    await db.query('DELETE FROM ambulances');
    await db.query('DELETE FROM hospitals');
    
    const hospitalIds = [];
    
    for (const el of elements) {
      const name = el.tags?.name || `Unnamed Ghana Health Facility (${el.id})`;
      const lat = el.lat;
      const lng = el.lon;
      
      if (!lat || !lng) continue;
      
      // Randomize capacity since OpenStreetMap does not store bed counts
      const totalGeneral = 50 + Math.floor(Math.random() * 200);
      const occupiedGeneral = Math.floor(Math.random() * (totalGeneral - 10));
      const totalIcu = 5 + Math.floor(Math.random() * 25);
      const occupiedIcu = Math.floor(Math.random() * (totalIcu - 2));
      
      const res = await db.query(
        `INSERT INTO hospitals (name, latitude, longitude, total_general_beds, occupied_general_beds, total_icu_beds, occupied_icu_beds)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [name, lat, lng, totalGeneral, occupiedGeneral, totalIcu, occupiedIcu]
      );
      
      const hospitalId = res.rows[0].id;
      hospitalIds.push(hospitalId);
      
      // Seed equipment
      const equipmentTypes = ["ventilators", "ctScanners", "mriMachines", "oxygenUnits"];
      for (const eq of equipmentTypes) {
        await db.query(
          `INSERT INTO hospital_equipment (hospital_id, equipment_type, is_available)
           VALUES ($1, $2, $3)`,
          [hospitalId, eq, true]
        );
      }
    }
    
    console.log(`Successfully seeded ${hospitalIds.length} hospitals into IERBMS!`);
    
    // Also seed a few ambulances near some of these hospitals
    console.log('Seeding ambulances near the new hospitals...');
    const ambulanceSigns = ["AMB-101", "AMB-102", "AMB-103", "AMB-104", "AMB-105", "AMB-106"];
    for (let i = 0; i < ambulanceSigns.length; i++) {
      const randomHospitalIndex = Math.floor(Math.random() * elements.length);
      const randomHosp = elements[randomHospitalIndex];
      const baseLat = randomHosp.lat;
      const baseLng = randomHosp.lon;
      
      // Shift coordinates slightly to place ambulance near the hospital
      const offsetLat = baseLat + (Math.random() - 0.5) * 0.01;
      const offsetLng = baseLng + (Math.random() - 0.5) * 0.01;
      
      await db.query(
        `INSERT INTO ambulances (call_sign, status, current_latitude, current_longitude)
         VALUES ($1, 'available', $2, $3)`,
        [ambulanceSigns[i], offsetLat, offsetLng]
      );
    }
    
    console.log('Seeding completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error fetching/seeding hospitals:', err);
    process.exit(1);
  }
}

fetchAndSeedGhanaHospitals();
