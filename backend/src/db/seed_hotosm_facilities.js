const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const db = require('./index');

const CURATED_PREMIER_HOSPITALS = [
  {
    name: "Komfo Anokye Teaching Hospital",
    latitude: 6.6974,
    longitude: -1.6306,
    region: "Ashanti",
    district: "Kumasi Metropolitan",
    amenity_type: "hospital",
    address: "Bantama Road, Kumasi, Ashanti Region",
    total_general_beds: 1200,
    occupied_general_beds: 1050,
    total_icu_beds: 45,
    occupied_icu_beds: 38,
    specialists: ["Cardiologist", "Trauma Surgeon", "Neurologist", "Emergency Physician", "Orthopedic Surgeon", "Pediatrician", "Pulmonologist"],
    equipment: { ventilators: 25, ctScanners: 4, mriMachines: 2, oxygenUnits: 80 }
  },
  {
    name: "KNUST Hospital",
    latitude: 6.6745,
    longitude: -1.5714,
    region: "Ashanti",
    district: "Oforikrom Municipal",
    amenity_type: "hospital",
    address: "KNUST Main Campus, Kumasi, Ashanti Region",
    total_general_beds: 180,
    occupied_general_beds: 120,
    total_icu_beds: 12,
    occupied_icu_beds: 7,
    specialists: ["Emergency Physician", "General Surgeon", "Pediatrician", "Trauma Surgeon"],
    equipment: { ventilators: 8, ctScanners: 2, mriMachines: 1, oxygenUnits: 35 }
  },
  {
    name: "Kumasi South Regional Hospital",
    latitude: 6.6621,
    longitude: -1.5991,
    region: "Ashanti",
    district: "Asokwa Municipal",
    amenity_type: "hospital",
    address: "Atonsu Agogo, Kumasi, Ashanti Region",
    total_general_beds: 280,
    occupied_general_beds: 210,
    total_icu_beds: 15,
    occupied_icu_beds: 10,
    specialists: ["Orthopedic Surgeon", "Emergency Physician", "General Surgeon"],
    equipment: { ventilators: 10, ctScanners: 1, mriMachines: 0, oxygenUnits: 30 }
  },
  {
    name: "Suntreso Government Hospital",
    latitude: 6.7012,
    longitude: -1.6445,
    region: "Ashanti",
    district: "Bantama, Kumasi",
    amenity_type: "hospital",
    address: "North Suntreso, Kumasi, Ashanti Region",
    total_general_beds: 180,
    occupied_general_beds: 135,
    total_icu_beds: 8,
    occupied_icu_beds: 4,
    specialists: ["Emergency Physician", "General Surgeon", "Pediatrician"],
    equipment: { ventilators: 6, ctScanners: 1, mriMachines: 0, oxygenUnits: 25 }
  },
  {
    name: "Manhyia District Hospital",
    latitude: 6.7058,
    longitude: -1.6142,
    region: "Ashanti",
    district: "Manhyia South, Kumasi",
    amenity_type: "hospital",
    address: "Manhyia, Kumasi, Ashanti Region",
    total_general_beds: 150,
    occupied_general_beds: 110,
    total_icu_beds: 6,
    occupied_icu_beds: 3,
    specialists: ["Emergency Physician", "General Surgeon"],
    equipment: { ventilators: 5, ctScanners: 1, mriMachines: 0, oxygenUnits: 20 }
  },
  {
    name: "Tafo Government Hospital",
    latitude: 6.7328,
    longitude: -1.6094,
    region: "Ashanti",
    district: "Old Tafo, Kumasi",
    amenity_type: "hospital",
    address: "Old Tafo, Kumasi, Ashanti Region",
    total_general_beds: 120,
    occupied_general_beds: 85,
    total_icu_beds: 5,
    occupied_icu_beds: 2,
    specialists: ["Emergency Physician", "General Surgeon"],
    equipment: { ventilators: 4, ctScanners: 0, mriMachines: 0, oxygenUnits: 15 }
  },
  {
    name: "Korle Bu Teaching Hospital",
    latitude: 5.5385,
    longitude: -0.2285,
    region: "Greater Accra",
    district: "Ablekuma South",
    amenity_type: "hospital",
    address: "Guggisberg Avenue, Korle Bu, Accra",
    total_general_beds: 2000,
    occupied_general_beds: 1720,
    total_icu_beds: 60,
    occupied_icu_beds: 52,
    specialists: ["Cardiologist", "Trauma Surgeon", "Neurologist", "Emergency Physician", "Orthopedic Surgeon", "Pulmonologist"],
    equipment: { ventilators: 35, ctScanners: 5, mriMachines: 3, oxygenUnits: 120 }
  },
  {
    name: "37 Military Hospital",
    latitude: 5.5898,
    longitude: -0.1834,
    region: "Greater Accra",
    district: "Ayawaso East",
    amenity_type: "hospital",
    address: "Liberation Road, 37, Accra",
    total_general_beds: 400,
    occupied_general_beds: 310,
    total_icu_beds: 25,
    occupied_icu_beds: 18,
    specialists: ["Emergency Physician", "Orthopedic Surgeon", "Trauma Surgeon", "Cardiologist"],
    equipment: { ventilators: 15, ctScanners: 2, mriMachines: 1, oxygenUnits: 45 }
  },
  {
    name: "Greater Accra Regional Hospital (Ridge)",
    latitude: 5.5630,
    longitude: -0.1989,
    region: "Greater Accra",
    district: "Korle Klottey",
    amenity_type: "hospital",
    address: "Castle Road, Ridge, Accra",
    total_general_beds: 420,
    occupied_general_beds: 330,
    total_icu_beds: 35,
    occupied_icu_beds: 26,
    specialists: ["Emergency Physician", "Cardiologist", "Pediatrician", "General Surgeon"],
    equipment: { ventilators: 20, ctScanners: 3, mriMachines: 1, oxygenUnits: 50 }
  },
  {
    name: "Nyaho Medical Centre",
    latitude: 5.6022,
    longitude: -0.1843,
    region: "Greater Accra",
    district: "Ayawaso West",
    amenity_type: "hospital",
    address: "35 Kofi Annan St, Airport Residential Area, Accra",
    total_general_beds: 100,
    occupied_general_beds: 68,
    total_icu_beds: 10,
    occupied_icu_beds: 6,
    specialists: ["Cardiologist", "Emergency Physician", "Neurologist"],
    equipment: { ventilators: 10, ctScanners: 2, mriMachines: 1, oxygenUnits: 25 }
  },
  {
    name: "University of Ghana Medical Centre (UGMC)",
    latitude: 5.6455,
    longitude: -0.1915,
    region: "Greater Accra",
    district: "Ayawaso West",
    amenity_type: "hospital",
    address: "Legon Bypass, Legon, Accra",
    total_general_beds: 650,
    occupied_general_beds: 480,
    total_icu_beds: 40,
    occupied_icu_beds: 28,
    specialists: ["Cardiologist", "Neurologist", "Trauma Surgeon", "Emergency Physician", "Pulmonologist"],
    equipment: { ventilators: 30, ctScanners: 3, mriMachines: 2, oxygenUnits: 75 }
  },
  {
    name: "Cape Coast Teaching Hospital",
    latitude: 5.1315,
    longitude: -1.2795,
    region: "Central",
    district: "Cape Coast Metropolitan",
    amenity_type: "hospital",
    address: "Pedu Junction, Cape Coast, Central Region",
    total_general_beds: 400,
    occupied_general_beds: 320,
    total_icu_beds: 20,
    occupied_icu_beds: 15,
    specialists: ["Emergency Physician", "General Surgeon", "Trauma Surgeon"],
    equipment: { ventilators: 12, ctScanners: 2, mriMachines: 1, oxygenUnits: 40 }
  },
  {
    name: "Tamale Teaching Hospital",
    latitude: 9.4019,
    longitude: -0.8508,
    region: "Northern",
    district: "Tamale Metropolitan",
    amenity_type: "hospital",
    address: "Tamale, Northern Region",
    total_general_beds: 800,
    occupied_general_beds: 680,
    total_icu_beds: 30,
    occupied_icu_beds: 24,
    specialists: ["Trauma Surgeon", "Emergency Physician", "General Surgeon", "Pediatrician"],
    equipment: { ventilators: 18, ctScanners: 2, mriMachines: 1, oxygenUnits: 55 }
  },
  {
    name: "Ho Teaching Hospital",
    latitude: 6.6111,
    longitude: 0.4722,
    region: "Volta",
    district: "Ho Municipal",
    amenity_type: "hospital",
    address: "Ho, Volta Region",
    total_general_beds: 350,
    occupied_general_beds: 260,
    total_icu_beds: 15,
    occupied_icu_beds: 10,
    specialists: ["Emergency Physician", "General Surgeon", "Cardiologist"],
    equipment: { ventilators: 10, ctScanners: 1, mriMachines: 1, oxygenUnits: 30 }
  },
  {
    name: "Sunyani Regional Hospital",
    latitude: 7.3400,
    longitude: -2.3300,
    region: "Bono",
    district: "Sunyani Municipal",
    amenity_type: "hospital",
    address: "Sunyani, Bono Region",
    total_general_beds: 300,
    occupied_general_beds: 220,
    total_icu_beds: 12,
    occupied_icu_beds: 8,
    specialists: ["Emergency Physician", "General Surgeon"],
    equipment: { ventilators: 8, ctScanners: 1, mriMachines: 0, oxygenUnits: 25 }
  }
];

async function seedAllGhanaFacilities(options = { clearExisting: false }) {
  console.log('===============================================================');
  console.log('HOTOSM GHANA HEALTH FACILITIES NATIONWIDE INGESTION (ALL 16 REGIONS)');
  console.log('===============================================================');

  const possiblePaths = [
    path.join(__dirname, '../../../data/hotosm_gha_health_facilities/health_facilities.geojson'),
    path.join(__dirname, '../../data/hotosm_gha_health_facilities/health_facilities.geojson'),
    path.join(__dirname, '../data/hotosm_gha_health_facilities/health_facilities.geojson'),
    path.join(process.cwd(), 'data/hotosm_gha_health_facilities/health_facilities.geojson'),
    '/tmp/gha_health/health_facilities.geojson'
  ];

  let filePath = possiblePaths.find(p => fs.existsSync(p));
  if (!filePath) {
    throw new Error('Could not locate health_facilities.geojson');
  }

  console.log(`Loading GeoJSON dataset from: ${filePath}`);
  const rawData = fs.readFileSync(filePath, 'utf-8');
  const geojson = JSON.parse(rawData);
  const features = geojson.features || [];
  console.log(`Loaded total features: ${features.length}`);

  // Process features - curated facilities go first
  const processed = [...CURATED_PREMIER_HOSPITALS];
  const regionCounts = {};
  const amenityCounts = {};

  for (const c of CURATED_PREMIER_HOSPITALS) {
    regionCounts[c.region] = (regionCounts[c.region] || 0) + 1;
    amenityCounts[c.amenity_type] = (amenityCounts[c.amenity_type] || 0) + 1;
  }

  const curatedNamesLower = CURATED_PREMIER_HOSPITALS.map(c => c.name.toLowerCase());

  for (let i = 0; i < features.length; i++) {
    const feat = features[i];
    const props = feat.properties || {};
    const geom = feat.geometry || {};

    let lat, lng;
    if (geom.type === 'Point' && Array.isArray(geom.coordinates)) {
      lng = geom.coordinates[0];
      lat = geom.coordinates[1];
    } else if (geom.type === 'Polygon' && Array.isArray(geom.coordinates) && geom.coordinates[0]) {
      const ring = geom.coordinates[0];
      lng = ring.reduce((acc, p) => acc + p[0], 0) / ring.length;
      lat = ring.reduce((acc, p) => acc + p[1], 0) / ring.length;
    } else {
      continue;
    }

    if (!lat || !lng || isNaN(lat) || isNaN(lng)) continue;

    const region = props.adm1_name || 'Ghana';
    const district = props.adm2_name || '';
    const rawAmenity = props.amenity || props.healthcare || 'health_facility';
    const cleanId = (props.id || `osm-${i}`).replace(/^node\//, '').replace(/^way\//, '');

    // Resolve name
    let name = props.name || props.name_en || props.name_latin;
    if (!name) {
      if (rawAmenity === 'pharmacy') {
        name = `${district || region} Community Pharmacy (${cleanId})`;
      } else if (rawAmenity === 'hospital') {
        name = `${district || region} District Hospital (${cleanId})`;
      } else if (rawAmenity === 'clinic') {
        name = `${district || region} Health Clinic (${cleanId})`;
      } else {
        name = `${district || region} Health Facility (${cleanId})`;
      }
    }
    name = name.trim();

    // Check if name matches any curated premier hospital
    const lowerName = name.toLowerCase();
    const isCuratedMatch = curatedNamesLower.some(cName =>
      lowerName.includes(cName) || cName.includes(lowerName) ||
      (lowerName.includes('komfo') && cName.includes('komfo')) ||
      (lowerName.includes('knust') && cName.includes('knust')) ||
      (lowerName.includes('korle bu') && cName.includes('korle bu'))
    );
    if (isCuratedMatch) {
      continue; // Skip duplicate, already present in CURATED_PREMIER_HOSPITALS
    }

    regionCounts[region] = (regionCounts[region] || 0) + 1;
    amenityCounts[rawAmenity] = (amenityCounts[rawAmenity] || 0) + 1;

    // Capacity & Resource Tiering
    const nameUpper = name.toUpperCase();
    const isTertiary = (
      nameUpper.includes('TEACHING') ||
      nameUpper.includes('REGIONAL') ||
      nameUpper.includes('MILITARY') ||
      nameUpper.includes('RIDGE') ||
      nameUpper.includes('KORLE') ||
      nameUpper.includes('KOMFO') ||
      nameUpper.includes('KATH')
    );

    let totalGen = 0, occGen = 0, totalIcu = 0, occIcu = 0;
    let specialists = [];
    let equipment = {};

    if (isTertiary) {
      totalGen = 350 + Math.floor(Math.random() * 350);
      occGen = Math.floor(totalGen * (0.65 + Math.random() * 0.25));
      totalIcu = 30 + Math.floor(Math.random() * 30);
      occIcu = Math.floor(totalIcu * (0.65 + Math.random() * 0.25));
      specialists = [
        'Cardiologist',
        'Neurologist',
        'Trauma Surgeon',
        'Orthopedic Surgeon',
        'Pulmonologist',
        'Emergency Physician',
        'Pediatrician'
      ];
      equipment = {
        ventilators: 12 + Math.floor(Math.random() * 15),
        oxygenUnits: 50 + Math.floor(Math.random() * 40),
        ctScanners: 2 + Math.floor(Math.random() * 3),
        mriMachines: 1 + Math.floor(Math.random() * 2)
      };
    } else if (rawAmenity === 'hospital') {
      totalGen = 80 + Math.floor(Math.random() * 120);
      occGen = Math.floor(totalGen * (0.45 + Math.random() * 0.40));
      totalIcu = 6 + Math.floor(Math.random() * 12);
      occIcu = Math.floor(totalIcu * (0.40 + Math.random() * 0.40));
      specialists = [
        'Emergency Physician',
        'General Surgeon',
        'Pediatrician',
        'Cardiologist'
      ];
      equipment = {
        ventilators: 4 + Math.floor(Math.random() * 6),
        oxygenUnits: 25 + Math.floor(Math.random() * 20),
        ctScanners: 1,
        mriMachines: 0
      };
    } else if (rawAmenity === 'clinic' || rawAmenity === 'health_post' || rawAmenity === 'CHPs' || rawAmenity === 'health_facility') {
      totalGen = 15 + Math.floor(Math.random() * 30);
      occGen = Math.floor(totalGen * (0.30 + Math.random() * 0.40));
      totalIcu = Math.random() > 0.7 ? 2 : 0;
      occIcu = totalIcu > 0 ? 1 : 0;
      specialists = ['General Practitioner', 'Nurse Practitioner'];
      equipment = {
        ventilators: totalIcu > 0 ? 1 : 0,
        oxygenUnits: 6 + Math.floor(Math.random() * 10),
        ctScanners: 0,
        mriMachines: 0
      };
    } else if (rawAmenity === 'pharmacy' || rawAmenity === 'chemists') {
      totalGen = 0;
      occGen = 0;
      totalIcu = 0;
      occIcu = 0;
      specialists = ['Pharmacist', 'Pharmacy Technologist'];
      equipment = {
        oxygenUnits: 2,
        firstAidKits: 10,
        ventilators: 0,
        ctScanners: 0,
        mriMachines: 0
      };
    } else {
      totalGen = 5 + Math.floor(Math.random() * 10);
      occGen = Math.floor(totalGen * 0.5);
      totalIcu = 0;
      occIcu = 0;
      specialists = ['Dental Surgeon', 'Consultant Physician'];
      equipment = {
        oxygenUnits: 4,
        ventilators: 0,
        ctScanners: 0,
        mriMachines: 0
      };
    }

    processed.push({
      name,
      latitude: parseFloat(lat.toFixed(6)),
      longitude: parseFloat(lng.toFixed(6)),
      region,
      district,
      amenity_type: rawAmenity,
      address: props.addr_full || `${district}, ${region}, Ghana`,
      total_general_beds: totalGen,
      occupied_general_beds: occGen,
      total_icu_beds: totalIcu,
      occupied_icu_beds: occIcu,
      specialists,
      equipment
    });
  }

  console.log(`Successfully prepared ${processed.length} health facilities for all regions!`);
  console.log('Region distribution:', regionCounts);
  console.log('Amenity distribution:', amenityCounts);

  if (options.clearExisting) {
    console.log('Clearing existing emergency tables...');
    try {
      await db.query('DELETE FROM emergency_cases');
      await db.query('DELETE FROM hospital_equipment');
      await db.query('DELETE FROM ambulances');
      await db.query('DELETE FROM users WHERE hospital_id IS NOT NULL');
      await db.query('DELETE FROM hospitals');
      console.log('Tables cleared.');
    } catch (e) {
      console.warn('Clear warning:', e.message);
    }
  }

  // Batch insert into PostgreSQL (in chunks of 100)
  const chunkSize = 100;
  let inserted = 0;

  console.log(`Starting batch insertion (${Math.ceil(processed.length / chunkSize)} chunks)...`);

  for (let i = 0; i < processed.length; i += chunkSize) {
    const chunk = processed.slice(i, i + chunkSize);
    
    const values = [];
    const placeholders = [];
    let paramIndex = 1;

    for (const f of chunk) {
      placeholders.push(`($${paramIndex}, $${paramIndex+1}, $${paramIndex+2}, $${paramIndex+3}, $${paramIndex+4}, $${paramIndex+5}, $${paramIndex+6}, $${paramIndex+7}, $${paramIndex+8}, $${paramIndex+9}, $${paramIndex+10}, $${paramIndex+11}, $${paramIndex+12})`);
      values.push(
        f.name,
        f.latitude,
        f.longitude,
        f.region,
        f.district,
        f.amenity_type,
        f.address,
        f.total_general_beds,
        f.occupied_general_beds,
        f.total_icu_beds,
        f.occupied_icu_beds,
        f.specialists,
        f.equipment
      );
      paramIndex += 13;
    }

    const query = `
      INSERT INTO hospitals (
        name, latitude, longitude, region, district, amenity_type, address,
        total_general_beds, occupied_general_beds, total_icu_beds, occupied_icu_beds,
        specialists, equipment
      ) VALUES ${placeholders.join(',\n')}
      ON CONFLICT DO NOTHING;
    `;

    try {
      await db.query(query, values);
      inserted += chunk.length;
    } catch (err) {
      console.error(`Error in chunk ${i / chunkSize}:`, err.message);
    }
  }

  // Seed Stationed Ambulances in Kumasi, Accra, and Other Major Centers
  console.log('Seeding stationed ambulances...');
  const ambulances = [
    { call_sign: 'AMB-201', status: 'available', lat: 6.6970, lng: -1.6310 }, // KATH Kumasi
    { call_sign: 'AMB-202', status: 'available', lat: 6.6885, lng: -1.6244 }, // KNUST Kumasi
    { call_sign: 'AMB-203', status: 'available', lat: 6.6620, lng: -1.6000 }, // Kumasi South
    { call_sign: 'AMB-101', status: 'available', lat: 5.5600, lng: -0.1950 }, // Ridge Accra
    { call_sign: 'AMB-102', status: 'available', lat: 5.5385, lng: -0.2285 }, // Korle Bu Accra
    { call_sign: 'AMB-103', status: 'available', lat: 5.5900, lng: -0.1834 }, // 37 Military Accra
    { call_sign: 'AMB-301', status: 'available', lat: 9.4019, lng: -0.8508 }, // Tamale
    { call_sign: 'AMB-401', status: 'available', lat: 5.1315, lng: -1.2795 }, // Cape Coast
  ];

  for (const amb of ambulances) {
    await db.query(
      `INSERT INTO ambulances (call_sign, status, current_latitude, current_longitude)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (call_sign) DO UPDATE
       SET status = EXCLUDED.status,
           current_latitude = EXCLUDED.current_latitude,
           current_longitude = EXCLUDED.current_longitude,
           last_ping = CURRENT_TIMESTAMP`,
      [amb.call_sign, amb.status, amb.lat, amb.lng]
    );
  }

  // Seed/Link Demo Accounts
  console.log('Setting up demo user accounts and linking to premier hospitals...');
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('password123', salt);

  // Find KATH and Korle Bu IDs
  const kathRes = await db.query("SELECT id FROM hospitals WHERE name ILIKE '%Komfo Anokye%' LIMIT 1");
  const kathId = kathRes.rows[0]?.id || null;

  const korleBuRes = await db.query("SELECT id FROM hospitals WHERE name ILIKE '%Korle Bu%' LIMIT 1");
  const korleBuId = korleBuRes.rows[0]?.id || null;

  const demoUsers = [
    { email: 'admin@ierbms.gov', role: 'admin', full_name: 'National Emergency Dispatch Administrator', hospital_id: null },
    { email: 'hospital@ierbms.gov', role: 'hospital', full_name: 'KATH Chief Medical Officer', hospital_id: kathId },
    { email: 'doctor@ierbms.gov', role: 'doctor', full_name: 'Dr. Kwame Appiah (Trauma Lead)', hospital_id: kathId },
    { email: 'ambulance@ierbms.gov', role: 'ambulance', full_name: 'NAS Paramedic Unit 201', hospital_id: null },
    { email: 'kath@ierbms.gov', role: 'hospital', full_name: 'Komfo Anokye Teaching Hospital Portal', hospital_id: kathId },
    { email: 'korlebu@ierbms.gov', role: 'hospital', full_name: 'Korle Bu Teaching Hospital Portal', hospital_id: korleBuId }
  ];

  for (const u of demoUsers) {
    await db.query(
      `INSERT INTO users (email, password_hash, role, full_name, hospital_id)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO UPDATE
       SET password_hash = EXCLUDED.password_hash,
           role = EXCLUDED.role,
           full_name = EXCLUDED.full_name,
           hospital_id = EXCLUDED.hospital_id`,
      [u.email, passwordHash, u.role, u.full_name, u.hospital_id]
    );
  }

  console.log('===============================================================');
  console.log(`COMPLETED: Ingested ${inserted} health facilities across all 16 regions!`);
  console.log('Stationed ambulances and demo accounts configured successfully.');
  console.log('===============================================================');
  return {
    total: inserted,
    regions: regionCounts,
    amenities: amenityCounts
  };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const clearExisting = args.includes('--clear');

  seedAllGhanaFacilities({ clearExisting })
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Seeding fatal error:', err);
      process.exit(1);
    });
}

module.exports = { seedAllGhanaFacilities };
