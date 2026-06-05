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
  console.log('Fetching existing hospitals and ambulances from database...');
  const hospitalsRes = await db.query('SELECT id FROM hospitals');
  const ambulancesRes = await db.query('SELECT id FROM ambulances');
  
  const hospitalIds = hospitalsRes.rows.map(r => r.id);
  const ambulanceIds = ambulancesRes.rows.map(r => r.id);

  if (hospitalIds.length === 0 || ambulanceIds.length === 0) {
    console.error('Error: No hospitals or ambulances found in the database. Please run the hospital seed script first.');
    process.exit(1);
  }

  console.log('Clearing old historical emergency cases...');
  await db.query('DELETE FROM emergency_cases');

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

  console.log('Database seeded successfully with historical cases!');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
