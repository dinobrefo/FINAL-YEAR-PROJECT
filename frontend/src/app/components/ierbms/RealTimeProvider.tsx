import * as React from "react";
import { io, Socket } from "socket.io-client";
import { mockEmergencies, mockAmbulances, mockHospitals, type Emergency, type Ambulance, type Hospital } from "../../utils/mockData";

export interface RealTimeContextType {
  emergencies: Emergency[];
  ambulances: Ambulance[];
  hospitals: Hospital[];
  connected: boolean;
  /** True until the backend has returned real data at least once this session. */
  usingSampleData: boolean;
  isAutoSyncing: boolean;
  lastSyncTime: Date | null;
  syncCount: number;
  refreshData: () => Promise<void>;
  updateEmergencyLocally: (id: string, status: any, extra?: Partial<Emergency>) => void;
  updateHospitalBedsLocally: (hospitalId: string, generalChange: number, icuChange: number) => void;
}

const RealTimeContext = React.createContext<RealTimeContextType | undefined>(undefined);

export const useRealTime = () => {
  const context = React.useContext(RealTimeContext);
  if (!context) {
    throw new Error("useRealTime must be used within RealTimeProvider");
  }
  return context;
};

// Resilient mapper to normalize database records into clean UI hospital models
const mapHospital = (h: any): Hospital => {
  const totalGen = Number(h.total_general_beds ?? h.totalBeds ?? 50);
  const occGen = Number(h.occupied_general_beds ?? (h.totalBeds ? h.totalBeds - (h.availableBeds ?? 0) : 0));
  const resGen = Number(h.reserved_general_beds ?? h.reservedBeds ?? 0);
  const totalIcu = Number(h.total_icu_beds ?? h.icuBeds?.total ?? 10);
  const occIcu = Number(h.occupied_icu_beds ?? (h.icuBeds ? h.icuBeds.total - (h.icuBeds.available ?? 0) : 0));
  const resIcu = Number(h.reserved_icu_beds ?? h.icuBeds?.reserved ?? 0);

  return {
    id: String(h.id),
    name: h.name || "Healthcare Facility",
    location: {
      lat: parseFloat(h.latitude ?? h.location?.lat) || 5.6037,
      lng: parseFloat(h.longitude ?? h.location?.lng) || -0.1870,
      address: h.address || h.location?.address || `${h.name || "Facility"} Area`
    },
    totalBeds: totalGen,
    // "available" now means genuinely free right now: total minus patients in a
    // bed minus beds held for en-route ("incoming") patients.
    availableBeds: Math.max(0, totalGen - occGen - resGen),
    reservedBeds: Math.max(0, resGen),
    icuBeds: {
      total: totalIcu,
      available: Math.max(0, totalIcu - occIcu - resIcu),
      reserved: Math.max(0, resIcu)
    },
    specialists: Array.isArray(h.specialists) && h.specialists.length > 0 ? h.specialists : ["General Practitioner", "Emergency Medicine"],
    equipment: h.equipment || { ventilators: 5, ctScanners: 1, mriMachines: 0, oxygenUnits: 15 }
  };
};

export const RealTimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize with resilient mock cache so UI renders instantly even during network wakeups
  const [emergencies, setEmergencies] = React.useState<Emergency[]>(mockEmergencies);
  const [ambulances, setAmbulances] = React.useState<Ambulance[]>(mockAmbulances);
  const [hospitals, setHospitals] = React.useState<Hospital[]>(mockHospitals);
  const [connected, setConnected] = React.useState<boolean>(false);
  const [liveDataReceived, setLiveDataReceived] = React.useState<boolean>(false);
  const [isAutoSyncing, setIsAutoSyncing] = React.useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = React.useState<Date | null>(null);
  const [syncCount, setSyncCount] = React.useState<number>(0);

  // Reusable fetch & sync engine that reconciles server state and triggers automatic React re-renders
  const fetchLatestData = React.useCallback(async (showIndicator = true) => {
    if (showIndicator) setIsAutoSyncing(true);
    try {
      const res = await fetch('/api/command-center/overview');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (Array.isArray(data.hospitals) && data.hospitals.length > 0) {
        setHospitals(data.hospitals.map(mapHospital));
        setLiveDataReceived(true);
      }

      if (Array.isArray(data.ambulances) && data.ambulances.length > 0) {
        setAmbulances(data.ambulances.map((a: any) => ({
          id: String(a.id),
          plateNumber: a.call_sign || "AMB-UNIT",
          status: a.status as any,
          location: {
            lat: parseFloat(a.current_latitude) || 5.5,
            lng: parseFloat(a.current_longitude) || -0.2
          }
        })));
      }

      if (Array.isArray(data.active_cases)) {
        setEmergencies(data.active_cases.map((c: any) => ({
          id: String(c.id),
          patientName: c.patient_identifier || "Anonymous Patient",
          severity: c.trauma_level >= 4 ? "critical" : c.trauma_level >= 2 ? "moderate" : "stable",
          emergencyType: c.emergency_type || c.patient_vitals?.emergencyType || "General Emergency",
          status: c.status as any,
          location: {
            lat: parseFloat(c.patient_vitals?.latitude) || 5.5,
            lng: parseFloat(c.patient_vitals?.longitude) || -0.2,
            address: c.patient_vitals?.address || "Emergency Location"
          },
          timestamp: new Date(c.created_at || Date.now()),
          vitalSigns: c.patient_vitals,
          assignedHospital: c.assigned_hospital_id,
          ambulanceId: c.ambulance_id,
          triageNotes: c.triage_notes,
          bedTypeAssigned: c.bed_type_assigned
        })));
      }

      setLastSyncTime(new Date());
      setSyncCount(prev => prev + 1);
    } catch (err) {
      console.warn('[RealTimeProvider] Background sync warning (using active cache):', err);
    } finally {
      if (showIndicator) {
        setTimeout(() => setIsAutoSyncing(false), 400);
      }
    }
  }, []);

  React.useEffect(() => {
    // 1. Initial State Hydration on Mount
    fetchLatestData(false);

    // 2. Socket.IO endpoint.
    //    - VITE_SOCKET_URL wins when set (configure per environment on Vercel).
    //    - On localhost, connect same-origin so the Vite dev proxy handles it.
    //    - Otherwise fall back to the known Render backend.
    const envSocketUrl = import.meta.env.VITE_SOCKET_URL as string | undefined;
    const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost';
    const socketBackendUrl = envSocketUrl || (isLocalhost ? undefined : 'https://ierbms-backend.onrender.com');

    const socket: Socket = io(socketBackendUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 2000
    });

    socket.on('connect', () => {
      setConnected(true);
      // Immediately pull fresh state upon establishing or recovering connection
      fetchLatestData(false);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    // Sub-millisecond Push Event Handlers:
    socket.on('new_emergency_case', (newCase: any) => {
      setEmergencies(prev => {
        const exists = prev.some(e => e.id === String(newCase.id));
        if (exists) return prev;
        return [{
          id: String(newCase.id),
          patientName: newCase.patient_identifier || "Anonymous Patient",
          severity: newCase.trauma_level >= 4 ? "critical" : newCase.trauma_level >= 2 ? "moderate" : "stable",
          emergencyType: newCase.emergency_type || newCase.patient_vitals?.emergencyType || "General Emergency",
          status: newCase.status as any,
          location: {
            lat: parseFloat(newCase.patient_vitals?.latitude) || 5.5,
            lng: parseFloat(newCase.patient_vitals?.longitude) || -0.2,
            address: newCase.patient_vitals?.address || "Emergency Location"
          },
          timestamp: new Date(newCase.created_at || Date.now()),
          vitalSigns: newCase.patient_vitals,
          assignedHospital: newCase.assigned_hospital_id,
          ambulanceId: newCase.ambulance_id,
          triageNotes: newCase.triage_notes,
          bedTypeAssigned: newCase.bed_type_assigned
        }, ...prev];
      });
      setLastSyncTime(new Date());
    });

    socket.on('ambulance_location_update', (amb: any) => {
      setAmbulances(prev => prev.map(a =>
        a.id === String(amb.id)
          ? {
              ...a,
              location: {
                lat: parseFloat(amb.current_latitude),
                lng: parseFloat(amb.current_longitude)
              },
              status: amb.status as any
            }
          : a
      ));
    });

    socket.on('hospital_capacity_update', (updatedHospital: any) => {
      setHospitals(prev => prev.map(h =>
        h.id === String(updatedHospital.id) ? mapHospital(updatedHospital) : h
      ));
      setLastSyncTime(new Date());
    });

    socket.on('emergency_status_update', (updatedCase: any) => {
      setEmergencies(prev => prev.map(e =>
        e.id === String(updatedCase.id)
          ? {
              ...e,
              status: updatedCase.status as any,
              assignedHospital: updatedCase.assigned_hospital_id || e.assignedHospital,
              ambulanceId: updatedCase.ambulance_id || e.ambulanceId,
              emergencyType: updatedCase.emergency_type || e.emergencyType,
              triageNotes: updatedCase.triage_notes !== undefined ? updatedCase.triage_notes : (e as any).triageNotes,
              bedTypeAssigned: updatedCase.bed_type_assigned || (e as any).bedTypeAssigned
            }
          : e
      ));
      setLastSyncTime(new Date());
    });

    // 3. Continuous Background Auto-Sync Heartbeat (every 6 seconds)
    // Guarantees all open tabs and screens stay 100% updated and re-render automatically
    const pollInterval = setInterval(() => {
      fetchLatestData(false);
    }, 6000);

    // 4. Instant Visibility & Tab Focus Resync (wakes up when user returns to app)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchLatestData(false);
      }
    };
    const handleFocus = () => {
      fetchLatestData(false);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(pollInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      socket.disconnect();
    };
  }, [fetchLatestData]);

  // Optimistic Mutators for Immediate 0ms React Re-renders
  const updateEmergencyLocally = React.useCallback((id: string, status: any, extra?: Partial<Emergency>) => {
    setEmergencies(prev => prev.map(e => {
      if (e.id === id) {
        return {
          ...e,
          status,
          ...(extra || {})
        };
      }
      return e;
    }));
    setLastSyncTime(new Date());
  }, []);

  const updateHospitalBedsLocally = React.useCallback((hospitalId: string, generalChange: number, icuChange: number) => {
    setHospitals(prev => prev.map(h => {
      if (h.id === hospitalId) {
        const newAvailableGen = Math.max(0, Math.min(h.totalBeds, h.availableBeds + generalChange));
        const newAvailableIcu = Math.max(0, Math.min(h.icuBeds.total, h.icuBeds.available + icuChange));
        return {
          ...h,
          availableBeds: newAvailableGen,
          icuBeds: {
            ...h.icuBeds,
            available: newAvailableIcu
          }
        };
      }
      return h;
    }));
    setLastSyncTime(new Date());
  }, []);

  const refreshData = React.useCallback(async () => {
    await fetchLatestData(true);
  }, [fetchLatestData]);

  const usingSampleData = !liveDataReceived;

  return (
    <RealTimeContext.Provider value={{
      emergencies,
      ambulances,
      hospitals,
      connected,
      usingSampleData,
      isAutoSyncing,
      lastSyncTime,
      syncCount,
      refreshData,
      updateEmergencyLocally,
      updateHospitalBedsLocally
    }}>
      {usingSampleData && (
        <div
          role="status"
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
            background: '#b45309', color: '#fff', textAlign: 'center',
            font: '600 12px/1.6 system-ui, sans-serif', padding: '4px 12px',
            letterSpacing: '0.02em',
          }}
        >
          SAMPLE DATA — live backend not connected. Figures below are illustrative only.
        </div>
      )}
      {children}
    </RealTimeContext.Provider>
  );
};

export default RealTimeProvider;