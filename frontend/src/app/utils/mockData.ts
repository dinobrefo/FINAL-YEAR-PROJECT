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
