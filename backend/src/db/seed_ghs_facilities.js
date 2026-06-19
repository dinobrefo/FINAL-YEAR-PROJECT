const db = require('./index');

async function seedGhsFacilities() {
  console.log('Fetching Ghana Health Service facilities from data.gov.gh CKAN Datastore API (using pagination)...');
  
  const resourceId = 'e83996f1-ae48-415f-9bf8-671332e85b70';
  const limit = 200; // Request up to 200
  let offset = 0;
  let allRecords = [];
  let fetchMore = true;
  let totalRecords = null;
  
  try {
    while (fetchMore) {
      if (totalRecords !== null && offset >= totalRecords) {
        console.log(`Reached total records count (${totalRecords}). Stopping fetch.`);
        break;
      }
      
      const url = `https://data.gov.gh/api/action/datastore/search.json?resource_id=${resourceId}&limit=${limit}&offset=${offset}`;
      console.log(`Fetching offset ${offset}...`);
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`CKAN API responded with HTTP ${response.status}`);
      }
      
      const body = await response.json();
      if (!body.success) {
        throw new Error('CKAN API returned success=false');
      }
      
      const records = body.result.records || [];
      if (records.length === 0) {
        fetchMore = false;
      } else {
        allRecords = allRecords.concat(records);
        
        // Grab total count from the first response
        if (totalRecords === null && body.result.total) {
          totalRecords = body.result.total;
          console.log(`Total records reported by CKAN: ${totalRecords}`);
        }
        
        // Increment offset by the actual number of records returned (CKAN caps requests at 100)
        offset += records.length;
      }
      
      // Safety break to prevent infinite loops
      if (allRecords.length >= 5000) {
        fetchMore = false;
      }
    }
    
    console.log(`Successfully fetched total of ${allRecords.length} facility records from GHS dataset!`);
    
    console.log('Clearing database tables...');
    await db.query('DELETE FROM emergency_cases');
    await db.query('DELETE FROM hospital_equipment');
    await db.query('DELETE FROM ambulances');
    await db.query('DELETE FROM hospitals');
    
    let importedCount = 0;
    const hospitalCoords = [];
    
    for (const record of allRecords) {
      const name = record.facilityname || 'Unnamed GHS Facility';
      const lat = parseFloat(record.latitude);
      const lng = parseFloat(record.longitude);
      const type = (record.type || 'Clinic').toLowerCase();
      
      // Coordinate Validation: Must be numbers within Ghana's bounding box
      if (isNaN(lat) || isNaN(lng) || lat < 4.0 || lat > 12.0 || lng < -4.0 || lng > 2.0) {
        // Skip invalid coordinates
        continue;
      }
      
      let totalGeneral = 0;
      let occupiedGeneral = 0;
      let totalIcu = 0;
      let occupiedIcu = 0;
      let specialists = [];
      let equipment = {};
      
      const isHospital = type.includes('hospital');
      
      if (isHospital) {
        // Major / Secondary Hospital
        totalGeneral = 80 + Math.floor(Math.random() * 120); // 80 - 200 beds
        occupiedGeneral = Math.floor(Math.random() * (totalGeneral - 15));
        totalIcu = 5 + Math.floor(Math.random() * 15); // 5 - 20 beds
        occupiedIcu = Math.floor(Math.random() * (totalIcu - 2));
        specialists = ['Cardiologist', 'Neurologist', 'Trauma Surgeon', 'Orthopedic Surgeon', 'Emergency Physician'];
        
        // Randomize equipment counts so they are NOT all identical
        equipment = {
          ventilators: 5 + Math.floor(Math.random() * 15),     // 5 - 20
          ctScanners: 1 + Math.floor(Math.random() * 3),       // 1 - 4
          mriMachines: Math.floor(Math.random() * 2),          // 0 - 2
          oxygenUnits: 20 + Math.floor(Math.random() * 30)     // 20 - 50
        };
      } else {
        // Clinic / Health Centre / Maternity Home
        totalGeneral = 10 + Math.floor(Math.random() * 30);  // 10 - 40 beds
        occupiedGeneral = Math.floor(Math.random() * (totalGeneral - 3));
        totalIcu = 0;
        occupiedIcu = 0;
        specialists = ['General Practitioner'];
        
        // Randomize equipment counts
        equipment = {
          ventilators: 0,
          ctScanners: 0,
          mriMachines: 0,
          oxygenUnits: 2 + Math.floor(Math.random() * 10)      // 2 - 12
        };
      }
      
      const res = await db.query(
        `INSERT INTO hospitals (name, latitude, longitude, total_general_beds, occupied_general_beds, total_icu_beds, occupied_icu_beds, specialists, equipment)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
        [name, lat, lng, totalGeneral, occupiedGeneral, totalIcu, occupiedIcu, specialists, equipment]
      );
      
      hospitalCoords.push({ id: res.rows[0].id, lat, lng });
      importedCount++;
    }
    
    console.log(`Seeded ${importedCount} GHS hospitals/clinics with randomized capacities, specialists, and equipment!`);
    
    // Seed some ambulances near random hospital locations
    console.log('Seeding ambulances near GHS health facilities...');
    const ambulanceSigns = ["AMB-101", "AMB-102", "AMB-103", "AMB-104", "AMB-105", "AMB-106", "AMB-107", "AMB-108", "AMB-109", "AMB-110"];
    for (let i = 0; i < ambulanceSigns.length; i++) {
      const randomHospital = hospitalCoords[Math.floor(Math.random() * hospitalCoords.length)];
      const baseLat = parseFloat(randomHospital.lat);
      const baseLng = parseFloat(randomHospital.lng);
      
      // Shift coordinates slightly to place ambulance near the facility
      const offsetLat = baseLat + (Math.random() - 0.5) * 0.01;
      const offsetLng = baseLng + (Math.random() - 0.5) * 0.01;
      
      await db.query(
        `INSERT INTO ambulances (call_sign, status, current_latitude, current_longitude)
         VALUES ($1, 'available', $2, $3)`,
        [ambulanceSigns[i], offsetLat, offsetLng]
      );
    }
    
    console.log('Ambulance seeding completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Failed to fetch/seed GHS facilities:', err);
    process.exit(1);
  }
}

seedGhsFacilities();
