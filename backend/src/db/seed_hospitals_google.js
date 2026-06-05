const fs = require('fs');
const path = require('path');
const db = require('./index');

// 1. Read frontend/.env to get Google Maps API Key
let googleApiKey = '';
try {
  const envPath = path.join(__dirname, '../../../frontend/.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/VITE_GOOGLE_MAPS_API_KEY=(.*)/);
    if (match && match[1]) {
      googleApiKey = match[1].trim();
    }
  }
} catch (err) {
  console.error('Failed to read frontend/.env:', err);
}

if (!googleApiKey) {
  console.error('ERROR: No Google Maps API Key found in frontend/.env!');
  console.error('Please make sure you have set VITE_GOOGLE_MAPS_API_KEY in the .env file.');
  process.exit(1);
}

async function fetchHospitalsFromGoogle(query) {
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${googleApiKey}`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Google Places API responded with HTTP ${response.status}`);
    }
    const data = await response.json();
    return data.results || [];
  } catch (err) {
    console.error(`Error fetching for query "${query}":`, err);
    return [];
  }
}

async function seed() {
  console.log('Altering database schema if columns do not exist...');
  try {
    await db.query(`
      ALTER TABLE hospitals 
      ADD COLUMN IF NOT EXISTS specialists TEXT[] DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS equipment JSONB DEFAULT '{}'
    `);
    console.log('Database schema successfully migrated!');
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }

  console.log('Fetching hospitals in Accra and Kumasi from Google Places...');
  const accraResults = await fetchHospitalsFromGoogle('hospital in Accra, Ghana');
  const kumasiResults = await fetchHospitalsFromGoogle('hospital in Kumasi, Ghana');
  
  // Merge and remove duplicates by place_id or name
  const allResults = [...accraResults];
  const seenIds = new Set(accraResults.map(r => r.place_id || r.name));
  
  for (const r of kumasiResults) {
    const key = r.place_id || r.name;
    if (!seenIds.has(key)) {
      allResults.push(r);
      seenIds.add(key);
    }
  }

  if (allResults.length === 0) {
    console.error('Error: Could not retrieve any hospitals from Google Places API.');
    console.error('Please verify your billing setup or API Key limits.');
    process.exit(1);
  }

  console.log(`Successfully retrieved ${allResults.length} unique hospitals from Google Places!`);
  console.log('Clearing database tables...');
  
  await db.query('DELETE FROM emergency_cases');
  await db.query('DELETE FROM hospital_equipment');
  await db.query('DELETE FROM ambulances');
  await db.query('DELETE FROM hospitals');

  const seededHospitals = [];

  for (const place of allResults) {
    const name = place.name || 'Unnamed Health Facility';
    const lat = place.geometry?.location?.lat;
    const lng = place.geometry?.location?.lng;
    
    if (!lat || !lng) continue;

    const rating = place.rating || 0.0;
    const reviews = place.user_ratings_total || 0;

    let totalGeneral = 0;
    let occupiedGeneral = 0;
    let totalIcu = 0;
    let occupiedIcu = 0;
    let specialists = [];
    let equipment = {};

    // Rank Tier Logic: based on review counts and average ratings
    if (reviews >= 50 || rating >= 4.2) {
      // Tier 1: Major Tertiary Hospital
      totalGeneral = 150 + Math.floor(Math.random() * 100);
      occupiedGeneral = Math.floor(Math.random() * (totalGeneral - 20));
      totalIcu = 15 + Math.floor(Math.random() * 15);
      occupiedIcu = Math.floor(Math.random() * (totalIcu - 3));
      specialists = ['Cardiologist', 'Neurologist', 'Trauma Surgeon', 'Orthopedic Surgeon', 'Emergency Physician'];
      equipment = { ventilators: 18, ctScanners: 3, mriMachines: 2, oxygenUnits: 45 };
    } else if (reviews >= 10 || rating >= 3.6) {
      // Tier 2: Secondary Hospital
      totalGeneral = 80 + Math.floor(Math.random() * 70);
      occupiedGeneral = Math.floor(Math.random() * (totalGeneral - 10));
      totalIcu = 5 + Math.floor(Math.random() * 10);
      occupiedIcu = Math.floor(Math.random() * (totalIcu - 1));
      specialists = ['Emergency Physician', 'General Surgeon', 'Pediatrician'];
      equipment = { ventilators: 8, ctScanners: 1, mriMachines: 0, oxygenUnits: 20 };
    } else {
      // Tier 3: Local Clinic / Health Center
      totalGeneral = 20 + Math.floor(Math.random() * 40);
      occupiedGeneral = Math.floor(Math.random() * (totalGeneral - 5));
      totalIcu = 0;
      occupiedIcu = 0;
      specialists = ['General Practitioner'];
      equipment = { ventilators: 0, ctScanners: 0, mriMachines: 0, oxygenUnits: 8 };
    }

    const res = await db.query(
      `INSERT INTO hospitals (name, latitude, longitude, total_general_beds, occupied_general_beds, total_icu_beds, occupied_icu_beds, specialists, equipment)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [name, lat, lng, totalGeneral, occupiedGeneral, totalIcu, occupiedIcu, specialists, equipment]
    );

    seededHospitals.push({ id: res.rows[0].id, lat, lng });
  }

  console.log(`Seeded ${seededHospitals.length} hospitals into database with dynamic capacities, specialists, and equipment!`);
  
  // Seed ambulances near these hospitals
  console.log('Seeding ambulances near the Google Places hospitals...');
  const ambulanceSigns = ["AMB-101", "AMB-102", "AMB-103", "AMB-104", "AMB-105", "AMB-106"];
  for (let i = 0; i < ambulanceSigns.length; i++) {
    const randomHospital = seededHospitals[Math.floor(Math.random() * seededHospitals.length)];
    const baseLat = parseFloat(randomHospital.lat);
    const baseLng = parseFloat(randomHospital.lng);
    
    // Shift slightly to spawn nearby
    const offsetLat = baseLat + (Math.random() - 0.5) * 0.01;
    const offsetLng = baseLng + (Math.random() - 0.5) * 0.01;
    
    await db.query(
      `INSERT INTO ambulances (call_sign, status, current_latitude, current_longitude)
       VALUES ($1, 'available', $2, $3)`,
      [ambulanceSigns[i], offsetLat, offsetLng]
    );
  }

  console.log('Google Places database seeding completed successfully!');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
