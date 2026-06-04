import * as React from "react";
import { io, Socket } from "socket.io-client";
import { mockEmergencies, mockAmbulances, mockHospitals, type Emergency, type Ambulance, type Hospital } from "../../utils/mockData";

interface RealTimeContextType {
  emergencies: Emergency[];
  ambulances: Ambulance[];
  hospitals: Hospital[];
  connected: boolean;
}

const RealTimeContext = React.createContext<RealTimeContextType | undefined>(undefined);

export const useRealTime = () => {
  const context = React.useContext(RealTimeContext);
  if (!context) {
    throw new Error("useRealTime must be used within RealTimeProvider");
  }
  return context;
};

// Helper function to map DB hospital to UI hospital
const mapHospital = (h: any): Hospital => ({
  id: h.id,
  name: h.name,
  location: { lat: parseFloat(h.latitude) || 5.6037, lng: parseFloat(h.longitude) || -0.1870, address: `${h.name} Area` },
  totalBeds: h.total_general_beds,
  availableBeds: h.total_general_beds - h.occupied_general_beds,
  icuBeds: { total: h.total_icu_beds, available: h.total_icu_beds - h.occupied_icu_beds },
  specialists: ["General"],
  equipment: { ventilators: 10, ctScanners: 1, mriMachines: 1, oxygenUnits: 20 },
});

export const RealTimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // We initialize with mock data so UI doesn't break if backend is offline, but we immediately fetch real data.
  const [emergencies, setEmergencies] = React.useState<Emergency[]>(mockEmergencies);
  const [ambulances, setAmbulances] = React.useState<Ambulance[]>(mockAmbulances);
  const [hospitals, setHospitals] = React.useState<Hospital[]>(mockHospitals);
  const [connected, setConnected] = React.useState(false);

  React.useEffect(() => {
    // 1. Fetch initial state
    fetch('/api/command-center/overview')
      .then(res => res.json())
      .then(data => {
        if (data.hospitals) {
          setHospitals(data.hospitals.map(mapHospital));
        }
        if (data.ambulances) {
          setAmbulances(data.ambulances.map((a: any) => ({
            id: a.id,
            plateNumber: a.call_sign,
            status: a.status as any,
            location: { lat: parseFloat(a.current_latitude) || 5.5, lng: parseFloat(a.current_longitude) || -0.2 }
          })));
        }
        if (data.active_cases) {
          setEmergencies(data.active_cases.map((c: any) => ({
            id: c.id,
            patientName: c.patient_identifier || "Unknown",
            severity: c.trauma_level >= 4 ? "critical" : c.trauma_level >= 2 ? "moderate" : "stable",
            emergencyType: "General Emergency",
            status: c.status as any,
            location: {
              lat: parseFloat(c.patient_vitals?.latitude) || 5.5,
              lng: parseFloat(c.patient_vitals?.longitude) || -0.2,
              address: c.patient_vitals?.address || "Unknown Location"
            },
            timestamp: new Date(c.created_at),
            vitalSigns: c.patient_vitals,
            assignedHospital: c.assigned_hospital_id
          })));
        }
      })
      .catch(err => console.error('Failed to fetch overview data, using mock data:', err));

    // 2. Connect Socket.IO
    const socket: Socket = io();

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('new_emergency_case', (newCase: any) => {
      setEmergencies(prev => [...prev, {
        id: newCase.id,
        patientName: newCase.patient_identifier || "Unknown",
        severity: newCase.trauma_level >= 4 ? "critical" : newCase.trauma_level >= 2 ? "moderate" : "stable",
        emergencyType: "General Emergency",
        status: newCase.status as any,
        location: {
          lat: parseFloat(newCase.patient_vitals?.latitude) || 5.5,
          lng: parseFloat(newCase.patient_vitals?.longitude) || -0.2,
          address: newCase.patient_vitals?.address || "Unknown Location"
        },
        timestamp: new Date(newCase.created_at),
        vitalSigns: newCase.patient_vitals,
        assignedHospital: newCase.assigned_hospital_id
      }]);
    });

    socket.on('ambulance_location_update', (amb: any) => {
      setAmbulances(prev => prev.map(a => 
        a.id === amb.id 
          ? { ...a, location: { lat: parseFloat(amb.current_latitude), lng: parseFloat(amb.current_longitude) }, status: amb.status as any }
          : a
      ));
    });

    socket.on('hospital_capacity_update', (updatedHospital: any) => {
      setHospitals(prev => prev.map(h => 
        h.id === updatedHospital.id ? mapHospital(updatedHospital) : h
      ));
    });

    socket.on('emergency_status_update', (updatedCase: any) => {
      setEmergencies(prev => prev.map(e => 
        e.id === updatedCase.id 
          ? { ...e, status: updatedCase.status as any, assignedHospital: updatedCase.assigned_hospital_id }
          : e
      ));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <RealTimeContext.Provider value={{ emergencies, ambulances, hospitals, connected }}>
      {children}
    </RealTimeContext.Provider>
  );
};