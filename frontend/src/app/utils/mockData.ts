// Mock data for IERBMS platform

export interface Emergency {
  id: string;
  patientName: string;
  severity: "critical" | "moderate" | "stable";
  emergencyType: string;
  status: "active" | "in-transit" | "arrived" | "completed";
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  assignedHospital?: string;
  ambulanceId?: string;
  eta?: string;
  timestamp: Date;
  vitalSigns?: {
    heartRate: number;
    bloodPressure: string;
    oxygenSaturation: number;
    temperature: number;
  };
}

export interface Hospital {
  id: string;
  name: string;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  totalBeds: number;
  availableBeds: number;
  icuBeds: {
    total: number;
    available: number;
  };
  specialists: string[];
  equipment: {
    ventilators: number;
    ctScanners: number;
    mriMachines: number;
    oxygenUnits: number;
  };
  distance?: number;
  score?: number;
}

export interface Ambulance {
  id: string;
  plateNumber: string;
  status: "available" | "on-route" | "engaged" | "maintenance";
  location: {
    lat: number;
    lng: number;
  };
  assignedEmergency?: string;
}

export const mockEmergencies: Emergency[] = [
  {
    id: "EMG-001",
    patientName: "John Mensah",
    severity: "critical",
    emergencyType: "Cardiac Arrest",
    status: "in-transit",
    location: {
      lat: 5.6037,
      lng: -0.1870,
      address: "Ring Road Central, Accra",
    },
    assignedHospital: "Korle Bu Teaching Hospital",
    ambulanceId: "AMB-101",
    eta: "6 minutes",
    timestamp: new Date(Date.now() - 15 * 60000),
    vitalSigns: {
      heartRate: 145,
      bloodPressure: "180/120",
      oxygenSaturation: 88,
      temperature: 37.8,
    },
  },
  {
    id: "EMG-002",
    patientName: "Ama Osei",
    severity: "moderate",
    emergencyType: "Road Traffic Accident",
    status: "active",
    location: {
      lat: 5.5600,
      lng: -0.2050,
      address: "Mallam Junction",
    },
    timestamp: new Date(Date.now() - 8 * 60000),
    vitalSigns: {
      heartRate: 98,
      bloodPressure: "130/85",
      oxygenSaturation: 95,
      temperature: 37.2,
    },
  },
  {
    id: "EMG-003",
    patientName: "Kwame Asante",
    severity: "stable",
    emergencyType: "Minor Injuries",
    status: "arrived",
    location: {
      lat: 5.6500,
      lng: -0.1700,
      address: "Achimota",
    },
    assignedHospital: "37 Military Hospital",
    ambulanceId: "AMB-103",
    timestamp: new Date(Date.now() - 45 * 60000),
    vitalSigns: {
      heartRate: 76,
      bloodPressure: "120/80",
      oxygenSaturation: 98,
      temperature: 36.9,
    },
  },
  {
    id: "EMG-004",
    patientName: "Kofi Mensah",
    severity: "critical",
    emergencyType: "Severe Trauma / RTA",
    status: "in-transit",
    location: {
      lat: 6.6885,
      lng: -1.6244,
      address: "KNUST Commercial Area, Kumasi",
    },
    assignedHospital: "Komfo Anokye Teaching Hospital",
    ambulanceId: "AMB-201",
    eta: "4 minutes",
    timestamp: new Date(Date.now() - 5 * 60000),
    vitalSigns: {
      heartRate: 128,
      bloodPressure: "150/95",
      oxygenSaturation: 92,
      temperature: 37.4,
    },
  },
];

export const mockHospitals: Hospital[] = [
  {
    id: "HOSP-001",
    name: "Korle Bu Teaching Hospital",
    location: {
      lat: 5.5397,
      lng: -0.2270,
      address: "Korle Bu, Accra",
    },
    totalBeds: 250,
    availableBeds: 28,
    icuBeds: {
      total: 30,
      available: 4,
    },
    specialists: ["Cardiologist", "Neurologist", "Trauma Surgeon"],
    equipment: {
      ventilators: 18,
      ctScanners: 3,
      mriMachines: 2,
      oxygenUnits: 45,
    },
    distance: 8.2,
    score: 94,
  },
  {
    id: "HOSP-002",
    name: "37 Military Hospital",
    location: {
      lat: 5.6200,
      lng: -0.1750,
      address: "Burma Camp, Accra",
    },
    totalBeds: 180,
    availableBeds: 42,
    icuBeds: {
      total: 20,
      available: 8,
    },
    specialists: ["Emergency Physician", "Orthopedic Surgeon"],
    equipment: {
      ventilators: 12,
      ctScanners: 2,
      mriMachines: 1,
      oxygenUnits: 30,
    },
    distance: 5.4,
    score: 89,
  },
  {
    id: "HOSP-003",
    name: "Ridge Hospital",
    location: {
      lat: 5.5850,
      lng: -0.1950,
      address: "Ridge, Accra",
    },
    totalBeds: 120,
    availableBeds: 15,
    icuBeds: {
      total: 12,
      available: 2,
    },
    specialists: ["General Surgeon", "Pediatrician"],
    equipment: {
      ventilators: 8,
      ctScanners: 1,
      mriMachines: 1,
      oxygenUnits: 20,
    },
    distance: 3.8,
    score: 76,
  },
  {
    id: "HOSP-004",
    name: "Nyaho Medical Centre",
    location: {
      lat: 5.6100,
      lng: -0.1800,
      address: "Airport Residential Area, Accra",
    },
    totalBeds: 100,
    availableBeds: 22,
    icuBeds: {
      total: 10,
      available: 5,
    },
    specialists: ["Cardiologist", "Emergency Physician"],
    equipment: {
      ventilators: 10,
      ctScanners: 2,
      mriMachines: 1,
      oxygenUnits: 25,
    },
    distance: 4.5,
    score: 85,
  },
  {
    id: "HOSP-005",
    name: "Komfo Anokye Teaching Hospital",
    location: {
      lat: 6.6961,
      lng: -1.6310,
      address: "Bantama Road, Kumasi",
    },
    totalBeds: 1200,
    availableBeds: 75,
    icuBeds: {
      total: 45,
      available: 6,
    },
    specialists: ["Cardiologist", "Trauma Surgeon", "Neurologist", "Emergency Physician"],
    equipment: {
      ventilators: 25,
      ctScanners: 4,
      mriMachines: 2,
      oxygenUnits: 80,
    },
    distance: 2.1,
    score: 96,
  },
  {
    id: "HOSP-006",
    name: "KNUST Hospital",
    location: {
      lat: 6.6745,
      lng: -1.5714,
      address: "KNUST Campus, Kumasi",
    },
    totalBeds: 150,
    availableBeds: 34,
    icuBeds: {
      total: 10,
      available: 3,
    },
    specialists: ["Emergency Physician", "General Surgeon", "Pediatrician"],
    equipment: {
      ventilators: 6,
      ctScanners: 1,
      mriMachines: 1,
      oxygenUnits: 25,
    },
    distance: 3.5,
    score: 91,
  },
  {
    id: "HOSP-007",
    name: "Kumasi South Regional Hospital",
    location: {
      lat: 6.6621,
      lng: -1.5991,
      address: "Atonsu-Agogo, Kumasi",
    },
    totalBeds: 280,
    availableBeds: 28,
    icuBeds: {
      total: 15,
      available: 4,
    },
    specialists: ["Orthopedic Surgeon", "Emergency Physician"],
    equipment: {
      ventilators: 8,
      ctScanners: 1,
      mriMachines: 0,
      oxygenUnits: 30,
    },
    distance: 4.2,
    score: 88,
  },
  {
    id: "HOSP-008",
    name: "Suntreso Government Hospital",
    location: {
      lat: 6.7012,
      lng: -1.6445,
      address: "North Suntreso, Kumasi",
    },
    totalBeds: 180,
    availableBeds: 20,
    icuBeds: {
      total: 8,
      available: 2,
    },
    specialists: ["Emergency Physician", "General Surgeon"],
    equipment: {
      ventilators: 5,
      ctScanners: 1,
      mriMachines: 0,
      oxygenUnits: 18,
    },
    distance: 4.8,
    score: 82,
  },
  {
    id: "HOSP-009",
    name: "Cape Coast Teaching Hospital",
    location: {
      lat: 5.1315,
      lng: -1.2795,
      address: "Pedu Junction, Cape Coast",
    },
    totalBeds: 400,
    availableBeds: 45,
    icuBeds: {
      total: 16,
      available: 4,
    },
    specialists: ["Cardiologist", "Trauma Surgeon", "Emergency Physician"],
    equipment: {
      ventilators: 12,
      ctScanners: 2,
      mriMachines: 1,
      oxygenUnits: 40,
    },
    distance: 5.0,
    score: 88,
  },
  {
    id: "HOSP-010",
    name: "Effia Nkwanta Regional Hospital",
    location: {
      lat: 4.9125,
      lng: -1.7615,
      address: "Sekondi-Takoradi Highway, Sekondi",
    },
    totalBeds: 320,
    availableBeds: 36,
    icuBeds: {
      total: 12,
      available: 3,
    },
    specialists: ["Trauma Surgeon", "Orthopedic Surgeon", "General Surgeon"],
    equipment: {
      ventilators: 8,
      ctScanners: 1,
      mriMachines: 0,
      oxygenUnits: 30,
    },
    distance: 6.2,
    score: 84,
  },
  {
    id: "HOSP-011",
    name: "Tamale Teaching Hospital",
    location: {
      lat: 9.4008,
      lng: -0.8393,
      address: "Hospital Road, Tamale",
    },
    totalBeds: 800,
    availableBeds: 68,
    icuBeds: {
      total: 24,
      available: 5,
    },
    specialists: ["Cardiologist", "Neurologist", "Trauma Surgeon", "Emergency Physician"],
    equipment: {
      ventilators: 18,
      ctScanners: 3,
      mriMachines: 1,
      oxygenUnits: 60,
    },
    distance: 4.5,
    score: 92,
  },
  {
    id: "HOSP-012",
    name: "Ho Teaching Hospital",
    location: {
      lat: 6.6111,
      lng: 0.4708,
      address: "Trafalgar Area, Ho",
    },
    totalBeds: 350,
    availableBeds: 38,
    icuBeds: {
      total: 14,
      available: 4,
    },
    specialists: ["Emergency Physician", "General Surgeon", "Pediatrician"],
    equipment: {
      ventilators: 10,
      ctScanners: 1,
      mriMachines: 1,
      oxygenUnits: 35,
    },
    distance: 3.8,
    score: 86,
  },
  {
    id: "HOSP-013",
    name: "Sunyani Regional Hospital",
    location: {
      lat: 7.3399,
      lng: -2.3268,
      address: "Fiapre Road, Sunyani",
    },
    totalBeds: 300,
    availableBeds: 32,
    icuBeds: {
      total: 10,
      available: 3,
    },
    specialists: ["Emergency Physician", "Orthopedic Surgeon", "General Surgeon"],
    equipment: {
      ventilators: 8,
      ctScanners: 1,
      mriMachines: 0,
      oxygenUnits: 28,
    },
    distance: 5.1,
    score: 83,
  },
  {
    id: "HOSP-014",
    name: "Eastern Regional Hospital",
    location: {
      lat: 6.0945,
      lng: -0.2608,
      address: "Hospital Road, Koforidua",
    },
    totalBeds: 380,
    availableBeds: 40,
    icuBeds: {
      total: 14,
      available: 4,
    },
    specialists: ["Cardiologist", "General Surgeon", "Emergency Physician"],
    equipment: {
      ventilators: 10,
      ctScanners: 2,
      mriMachines: 1,
      oxygenUnits: 35,
    },
    distance: 4.0,
    score: 87,
  },
];

export const mockAmbulances: Ambulance[] = [
  {
    id: "AMB-101",
    plateNumber: "GR 4556-20",
    status: "engaged",
    location: { lat: 5.5950, lng: -0.1920 },
    assignedEmergency: "EMG-001",
  },
  {
    id: "AMB-102",
    plateNumber: "GR 7823-20",
    status: "available",
    location: { lat: 5.6100, lng: -0.1750 },
  },
  {
    id: "AMB-103",
    plateNumber: "GR 2341-20",
    status: "on-route",
    location: { lat: 5.6450, lng: -0.1680 },
    assignedEmergency: "EMG-003",
  },
  {
    id: "AMB-104",
    plateNumber: "GR 9012-20",
    status: "available",
    location: { lat: 5.5600, lng: -0.2100 },
  },
  {
    id: "AMB-105",
    plateNumber: "GR 5678-20",
    status: "maintenance",
    location: { lat: 5.5800, lng: -0.1950 },
  },
  {
    id: "AMB-201",
    plateNumber: "AS 112-21",
    status: "available",
    location: { lat: 6.6885, lng: -1.6244 }, // KNUST Metro Hub
    assignedEmergency: "EMG-004",
  },
  {
    id: "AMB-202",
    plateNumber: "AS 540-21",
    status: "available",
    location: { lat: 6.6960, lng: -1.6300 }, // KATH Trauma Base
  },
  {
    id: "AMB-203",
    plateNumber: "AS 892-22",
    status: "available",
    location: { lat: 6.6745, lng: -1.5714 }, // KNUST Hospital Base
  },
];

export const chartData = {
  emergencyTrends: [
    { month: "Jan", emergencies: 145, resolved: 138 },
    { month: "Feb", emergencies: 168, resolved: 162 },
    { month: "Mar", emergencies: 192, resolved: 185 },
    { month: "Apr", emergencies: 178, resolved: 171 },
    { month: "May", emergencies: 205, resolved: 198 },
    { month: "Jun", emergencies: 189, resolved: 182 },
  ],
  bedOccupancy: [
    { name: "Korle Bu", occupancy: 88 },
    { name: "37 Military", occupancy: 77 },
    { name: "Ridge", occupancy: 88 },
    { name: "Nyaho", occupancy: 78 },
    { name: "Trust Hospital", occupancy: 65 },
  ],
  emergencyTypes: [
    { type: "Cardiac", count: 42, percentage: 28 },
    { type: "Trauma", count: 38, percentage: 25 },
    { type: "Stroke", count: 28, percentage: 19 },
    { type: "Respiratory", count: 24, percentage: 16 },
    { type: "Other", count: 18, percentage: 12 },
  ],
  responseTime: [
    { hour: "00:00", avgTime: 8.2 },
    { hour: "04:00", avgTime: 6.5 },
    { hour: "08:00", avgTime: 12.3 },
    { hour: "12:00", avgTime: 14.8 },
    { hour: "16:00", avgTime: 15.2 },
    { hour: "20:00", avgTime: 11.4 },
  ],
};
