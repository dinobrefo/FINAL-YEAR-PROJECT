-- Schema for IERBMS Database

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Hospitals Table
CREATE TABLE IF NOT EXISTS hospitals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    total_general_beds INTEGER NOT NULL DEFAULT 0,
    occupied_general_beds INTEGER NOT NULL DEFAULT 0,
    total_icu_beds INTEGER NOT NULL DEFAULT 0,
    occupied_icu_beds INTEGER NOT NULL DEFAULT 0,
    specialists TEXT[] DEFAULT '{}',
    equipment JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Equipment Availability
CREATE TABLE IF NOT EXISTS hospital_equipment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE,
    equipment_type VARCHAR(100) NOT NULL,
    is_available BOOLEAN DEFAULT true,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_hospital_equipment_hospital_id ON hospital_equipment(hospital_id);

-- Ambulances Table
CREATE TABLE IF NOT EXISTS ambulances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_sign VARCHAR(50) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'available', -- 'available', 'dispatched', 'transporting'
    current_latitude DECIMAL(10, 8),
    current_longitude DECIMAL(11, 8),
    last_ping TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Emergency Cases
CREATE TABLE IF NOT EXISTS emergency_cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ambulance_id UUID REFERENCES ambulances(id) ON DELETE SET NULL,
    assigned_hospital_id UUID REFERENCES hospitals(id) ON DELETE SET NULL,
    patient_identifier VARCHAR(100), -- randomized identifier
    trauma_level INTEGER,
    patient_vitals JSONB,
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'resolved'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX idx_emergency_cases_hospital_id ON emergency_cases(assigned_hospital_id);
CREATE INDEX idx_emergency_cases_ambulance_id ON emergency_cases(ambulance_id);

-- Users Table (Authentication)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL, -- 'admin', 'hospital', 'doctor', 'ambulance'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
