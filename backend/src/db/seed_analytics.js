const db = require('./index');

const hospitalsData = [
  { name: "Korle Bu Teaching Hospital", lat: 5.5397, lng: -0.2270, genBeds: 250, genOcc: 222, icuBeds: 30, icuOcc: 26 },
  { name: "37 Military Hospital", lat: 5.6200, lng: -0.1750, genBeds: 180, genOcc: 138, icuBeds: 20, icuOcc: 12 },
  { name: "Ridge Hospital", lat: 5.5850, lng: -0.1950, genBeds: 120, genOcc: 105, icuBeds: 12, icuOcc: 10 },
  { name: "Nyaho Medical Centre", lat: 5.6100, lng: -0.1800, genBeds: 100, genOcc: 78, icuBeds: 10, icuOcc: 5 }
];

const ambulancesData = [
  { call_sign: "AMB-101", status: "available", lat: 5.5950, lng: -0.1920 },
  { call_sign: "AMB-102", status: "available", lat: 5.6100, lng: -0.1750 },
  { call_sign: "AMB-103", status: "available", lat: 5.6450, lng: -0.1680 },
  { call_sign: "AMB-104", status: "available", lat: 5.5600, lng: -0.2100 },
  { call_sign: "AMB-105", status: "available", lat: 5.5800, lng: -0.1950 }
];

async function seed() {
  console.log('Clearing database tables...');
  
  // Clear existing records to start fresh
  await db.query('DELETE FROM emergency_cases');
  await db.query('DELETE FROM hospital_equipment');
  await db.query('DELETE FROM ambulances');
  await db.query('DELETE FROM hospitals');

  console.log('Seeding hospitals...');
  const hospitalIds = [];
  for (const h of hospitalsData) {
    const res = await db.query(
      `INSERT INTO hospitals (name, latitude, longitude, total_general_beds, occupied_general_beds, total_icu_beds, occupied_icu_beds)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [h.name, h.lat, h.lng, h.genBeds, h.genOcc, h.icuBeds, h.icuOcc]
    );
    const hospitalId = res.rows[0].id;
    hospitalIds.push(hospitalId);

    // Seed equipment for each hospital
    const equipmentList = [
      { type: "ventilators", total: 20 },
      { type: "ctScanners", total: 3 },
      { type: "mriMachines", total: 2 },
      { type: "oxygenUnits", total: 50 }
    ];
    for (const eq of equipmentList) {
      await db.query(
        `INSERT INTO hospital_equipment (hospital_id, equipment_type, is_available)
         VALUES ($1, $2, $3)`,
        [hospitalId, eq.type, true]
      );
    }
  }

  console.log('Seeding ambulances...');
  const ambulanceIds = [];
  for (const a of ambulancesData) {
    const res = await db.query(
      `INSERT INTO ambulances (call_sign, status, current_latitude, current_longitude)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [a.call_sign, a.status, a.lat, a.lng]
    );
    ambulanceIds.push(res.rows[0].id);
  }

  console.log('Seeding historical emergency cases (6 months of analytics)...');
  const insertCaseQuery = `
    INSERT INTO emergency_cases 
    (ambulance_id, assigned_hospital_id, patient_identifier, trauma_level, status, created_at, resolved_at)
    VALUES ($1, $2, $3, $4, 'resolved', NOW() - ($5 || ' days')::interval, NOW() - ($5 || ' days')::interval + ($6 || ' minutes')::interval)
  `;

  for (let i = 0; i < 300; i++) {
    const daysAgo = Math.floor(Math.random() * 180); // 0 to 180 days ago
    const durationMinutes = 15 + Math.floor(Math.random() * 90); // 15 to 105 mins response
    const traumaLevel = Math.floor(Math.random() * 5) + 1; // 1 to 5
    const randomAmb = ambulanceIds[Math.floor(Math.random() * ambulanceIds.length)];
    const randomHosp = hospitalIds[Math.floor(Math.random() * hospitalIds.length)];
    
    await db.query(insertCaseQuery, [
      randomAmb,
      randomHosp,
      `PT-SEED-${i}`, 
      traumaLevel, 
      daysAgo,
      durationMinutes
    ]);
  }

  console.log('Database seeded successfully with hospitals, equipment, ambulances, and cases!');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
