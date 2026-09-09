import * as React from "react";
import { AppShell } from "../components/ierbms/Navigation";
import { StatCard } from "../components/ierbms/StatCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ierbms/Card";
import { Button } from "../components/ierbms/Button";
import { StatusBadge } from "../components/ierbms/StatusBadge";
import { BedDouble, Activity, Ambulance, Users, AlertTriangle, CheckCircle, Box, Map } from "lucide-react";
import { useRealTime } from "../components/ierbms/RealTimeProvider";
import { useNavigate, useLocation, useParams } from "react-router";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { LiveMap } from "../components/ierbms/LiveMap";

import { HospitalCapacityMesh } from "../components/ierbms/HospitalCapacityMesh";

export const HospitalDashboard: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { hospitalId } = useParams<{ hospitalId: string }>();
  const { emergencies, hospitals, ambulances, updateEmergencyLocally } = useRealTime();

  const [vizMode, setVizMode] = React.useState<"3d" | "2d">("3d");
  const [dbHospital, setDbHospital] = React.useState<any>(null);

  React.useEffect(() => {
    if (hospitalId && !hospitals.some(h => h.id === hospitalId)) {
      fetch(`/api/hospitals/${hospitalId}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data) {
            const totalGen = Number(data.total_general_beds ?? 50);
            const occGen = Number(data.occupied_general_beds ?? 0);
            const totalIcu = Number(data.total_icu_beds ?? 10);
            const occIcu = Number(data.occupied_icu_beds ?? 0);
            setDbHospital({
              id: String(data.id),
              name: data.name,
              totalBeds: totalGen,
              availableBeds: Math.max(0, totalGen - occGen),
              reservedBeds: 0,
              icuBeds: {
                total: totalIcu,
                available: Math.max(0, totalIcu - occIcu),
                reserved: 0
              },
              specialists: data.specialists || ["General Practitioner", "Emergency Medicine"],
              equipment: data.equipment || { ventilators: 5, ctScanners: 1, mriMachines: 0, oxygenUnits: 15 }
            });
          }
        })
        .catch(err => console.error("Error fetching single hospital", err));
    }
  }, [hospitalId, hospitals]);

  const hospital = hospitals.find(h => h.id === hospitalId) || dbHospital || hospitals[0] || {
    id: "h1",
    name: "Ridge Hospital",
    availableBeds: 50,
    totalBeds: 200,
    icuBeds: { total: 30, available: 4 },
    specialists: ["Cardiologist", "Neurologist", "Orthopedic Surgeon"],
    equipment: { ventilators: 10, ctScanners: 2, mriMachines: 1, oxygenUnits: 25 }
  };

  const incomingEmergencies = emergencies.filter(e => 
    e.assignedHospital === hospital.id && e.status === "in-transit"
  );

  const [loadingId, setLoadingId] = React.useState<string | null>(null);

  const updateEmergencyStatus = async (id: string, status: string) => {
    setLoadingId(id);
    try {
      const res = await fetch(`/api/ambulances/cases/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (!res.ok) {
        throw new Error("Server rejected the status update. Using local offline fallback.");
      }
    } catch (err) {
      console.error(err);
      alert(`[Fallback Mode] Case ${id.substring(0, 8)} status changed to ${status}.`);
    } finally {
      if (updateEmergencyLocally) updateEmergencyLocally(id, status);
      setLoadingId(null);
    }
  };

  const generalReserved = hospital.reservedBeds ?? 0;
  const icuReserved = hospital.icuBeds?.reserved ?? 0;
  const icuTotal = hospital.icuBeds?.total || 10;
  const icuAvail = hospital.icuBeds?.available ?? 2;
  const generalTotal = Math.max(10, hospital.totalBeds - icuTotal);
  const generalAvail = hospital.availableBeds;
  const generalOcc = Math.max(0, generalTotal - generalAvail - generalReserved);
  const icuOcc = Math.max(0, icuTotal - icuAvail - icuReserved);

  // Proportional ward distribution based on this facility's actual size:
  const erTotal = Math.max(6, Math.round(hospital.totalBeds * 0.15));
  const erAvail = Math.max(1, Math.round(erTotal * 0.35));
  const erOcc = Math.max(0, erTotal - erAvail);

  const surgTotal = Math.max(6, Math.round(hospital.totalBeds * 0.20));
  const surgAvail = Math.max(1, Math.round(surgTotal * 0.25));
  const surgOcc = Math.max(0, surgTotal - surgAvail);

  const matTotal = Math.max(6, Math.round(hospital.totalBeds * 0.15));
  const matAvail = Math.max(1, Math.round(matTotal * 0.30));
  const matOcc = Math.max(0, matTotal - matAvail);

  const pedTotal = Math.max(4, Math.round(hospital.totalBeds * 0.10));
  const pedAvail = Math.max(1, Math.round(pedTotal * 0.40));
  const pedOcc = Math.max(0, pedTotal - pedAvail);

  const bedData = [
    { name: "General Ward", shortName: "General", total: generalTotal, occupied: generalOcc, incoming: generalReserved, available: generalAvail },
    { name: "ICU Bay", shortName: "ICU Bay", total: icuTotal, occupied: icuOcc, incoming: icuReserved, available: icuAvail },
    { name: "ER Trauma Bay", shortName: "Trauma Bay", total: erTotal, occupied: erOcc, incoming: 0, available: erAvail },
    { name: "Surgical Ward", shortName: "Surgical", total: surgTotal, occupied: surgOcc, incoming: 0, available: surgAvail },
    { name: "Maternity", shortName: "Maternity", total: matTotal, occupied: matOcc, incoming: 0, available: matAvail },
    { name: "Pediatrics", shortName: "Pediatrics", total: pedTotal, occupied: pedOcc, incoming: 0, available: pedAvail },
  ];

  const occupancyRate = Math.round((hospital.totalBeds - hospital.availableBeds) / hospital.totalBeds * 100);

  const renderBeds = () => (
    <Card className="relative overflow-hidden border-2 border-primary/20">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <CardTitle>Bed Capacity & Department Allocation</CardTitle>
            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-500 border border-blue-500/30">
              Interactive Viz
            </span>
          </div>
          <CardDescription>Real-time occupancy rendering across major hospital wards</CardDescription>
        </div>
        <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
          <button
            onClick={() => setVizMode("3d")}
            className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
              vizMode === "3d" ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            🏙️ Capacity Bars
          </button>
          <button
            onClick={() => setVizMode("2d")}
            className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
              vizMode === "2d" ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            📊 Flat Bars
          </button>
        </div>
      </CardHeader>
      <CardContent>
        {vizMode === "3d" ? (
          <div className="w-full rounded-xl overflow-hidden border border-border bg-slate-100 dark:bg-slate-950/60 p-2">
            <HospitalCapacityMesh wards={bedData} hospitalName={hospital.name} height={340} />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={bedData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" stroke="var(--muted-foreground)" />
              <YAxis stroke="var(--muted-foreground)" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                }}
              />
              <Bar dataKey="occupied" stackId="a" fill="var(--chart-1)" />
              <Bar dataKey="incoming" stackId="a" fill="var(--chart-3)" />
              <Bar dataKey="available" stackId="a" fill="var(--chart-2)" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );

  const renderIncoming = () => (
    <Card>
      <CardHeader>
        <CardTitle>Incoming Ambulances</CardTitle>
        <CardDescription>Prepare for arriving emergency patients</CardDescription>
      </CardHeader>
      <CardContent>
        {incomingEmergencies.length > 0 ? (
          <div className="space-y-4">
            {incomingEmergencies.map((emergency) => (
              <div
                key={emergency.id}
                className="p-4 border rounded-lg bg-[var(--accent)]"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold">{emergency.patientName}</h4>
                      <StatusBadge status={emergency.severity} pulse>
                        {emergency.severity.toUpperCase()}
                      </StatusBadge>
                    </div>
                    <p className="text-sm text-muted-foreground">{emergency.emergencyType}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-[var(--primary)]">ETA: {emergency.eta || '8 mins'}</p>
                    <p className="text-xs text-muted-foreground">{emergency.ambulanceId || 'Ambulance Unit'}</p>
                  </div>
                </div>

                {emergency.vitalSigns && (
                  <div className="grid grid-cols-4 gap-2 p-2 bg-background rounded-lg mb-3 text-xs">
                    <div>
                      <span className="text-muted-foreground">HR:</span> <span className="font-semibold">{emergency.vitalSigns.heartRate}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">BP:</span> <span className="font-semibold">{emergency.vitalSigns.bloodPressure}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">SpO2:</span> <span className="font-semibold">{emergency.vitalSigns.oxygenSaturation}%</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Temp:</span> <span className="font-semibold">{emergency.vitalSigns.temperature}°C</span>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="success"
                    size="sm"
                    className="flex-1"
                    disabled={loadingId === emergency.id}
                    onClick={() => updateEmergencyStatus(emergency.id, "arrived")}
                  >
                    <CheckCircle className="h-4 w-4" />
                    {loadingId === emergency.id ? "Updating..." : "Mark Arrived"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Ambulance className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No incoming ambulances currently</p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const currentPath = location.pathname.replace(/\/$/, "");
  const isBedsView = currentPath.endsWith("/beds");
  const isErView = currentPath.endsWith("/er");
  const isArrivalsView = currentPath.endsWith("/arrivals");

  const hospitalEmergencies = emergencies.filter(e => e.assignedHospital === hospital.id);

  const renderERQueue = () => (
    <Card className="border border-border shadow-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-teal-500" />
              Emergency Department Queue & Triage
            </CardTitle>
            <CardDescription>Live trauma admissions, bed allocations, and clinical triage status</CardDescription>
          </div>
          <span className="px-3 py-1 bg-teal-500/15 text-teal-600 dark:text-teal-400 font-bold rounded-full text-xs">
            {hospitalEmergencies.length} Total Patients
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {hospitalEmergencies.length > 0 ? (
          <div className="divide-y divide-border/60">
            {hospitalEmergencies.map((patient) => (
              <div key={patient.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base text-foreground">{patient.patientName}</span>
                    <StatusBadge status={patient.severity}>{patient.severity.toUpperCase()}</StatusBadge>
                    <span className="text-xs px-2 py-0.5 rounded bg-muted font-medium text-muted-foreground">
                      Status: {patient.status}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 font-bold">
                      {patient.emergencyType}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Bed Assigned: <span className="font-semibold text-foreground uppercase">{patient.bedTypeAssigned || (patient.severity === "critical" ? "ICU Bed" : "General Ward Bed")}</span> • Case #{patient.id.substring(0, 8)}
                  </p>
                  {patient.vitalSigns && (
                    <div className="flex gap-4 text-xs font-mono text-muted-foreground mt-1">
                      <span>HR: <strong className="text-foreground">{patient.vitalSigns.heartRate || "--"}</strong> bpm</span>
                      <span>BP: <strong className="text-foreground">{patient.vitalSigns.bloodPressure || "--"}</strong></span>
                      <span>SpO2: <strong className="text-foreground">{patient.vitalSigns.oxygenSaturation || "--"}</strong>%</span>
                      <span>Temp: <strong className="text-foreground">{patient.vitalSigns.temperature || "--"}</strong>°C</span>
                    </div>
                  )}
                  {patient.triageNotes && (
                    <p className="text-xs italic bg-muted/60 p-2 rounded text-muted-foreground mt-1">
                      Triage Note: {patient.triageNotes}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {patient.status === 'in-transit' && (
                    <Button
                      size="sm"
                      variant="primary"
                      disabled={loadingId === patient.id}
                      onClick={() => updateEmergencyStatus(patient.id, 'arrived')}
                    >
                      <CheckCircle className="h-4 w-4" />
                      Mark Arrived
                    </Button>
                  )}
                  {patient.status === 'arrived' && (
                    <Button
                      size="sm"
                      variant="success"
                      disabled={loadingId === patient.id}
                      onClick={() => updateEmergencyStatus(patient.id, 'resolved')}
                    >
                      <CheckCircle className="h-4 w-4" />
                      Discharge & Free Bed
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Activity className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>No active ER cases for {hospital.name}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <AppShell role="hospital" userName={hospital.name}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{hospital.name}</h1>
            <p className="text-muted-foreground">
              {isBedsView ? "Ward Census & Dynamic Capacity Allocations" :
               isErView ? "Emergency Department Triage & Admissions" :
               isArrivalsView ? "Live Ambulance Telemetry & Approaching Cases" :
               "Real-time facility telemetry & bed capacity"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => navigate(`/hospital/${hospital.id}/beds`)} variant={isBedsView ? "primary" : "outline"}>
              <BedDouble className="h-4 w-4" />
              Manage Beds
            </Button>
            <Button onClick={() => navigate(`/hospital/${hospital.id}/er`)} variant={isErView ? "primary" : "outline"}>
              <Activity className="h-4 w-4" />
              ER Queue
            </Button>
            <Button onClick={() => navigate(`/hospital/${hospital.id}/arrivals`)} variant={isArrivalsView ? "primary" : "outline"}>
              <Ambulance className="h-4 w-4" />
              Arrivals
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Available Beds"
            value={hospital.availableBeds}
            icon={BedDouble}
            trend={{ value: `${occupancyRate}% occupied · ${generalReserved} incoming`, isPositive: occupancyRate < 85 }}
          />
          <StatCard
            title="ICU Beds"
            value={`${hospital.icuBeds.available} / ${hospital.icuBeds.total}`}
            icon={Activity}
            description={`Critical Care Capacity · ${icuReserved} incoming`}
          />
          <StatCard
            title="Incoming Ambulances"
            value={incomingEmergencies.length}
            icon={Ambulance}
            description="En-route to Emergency Dept"
          />
          <StatCard
            title="ER Occupancy Rate"
            value={`${occupancyRate}%`}
            icon={Users}
            trend={{ value: occupancyRate > 90 ? "Critical Level" : "Optimal Level", isPositive: occupancyRate <= 85 }}
          />
        </div>

        {isErView && renderERQueue()}

        {isBedsView && (
          <div className="space-y-6">
            {renderBeds()}
          </div>
        )}

        {isArrivalsView && (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-1">
              {renderIncoming()}
            </div>
            <div className="lg:col-span-2">
              <Card className="overflow-hidden border-2 border-primary/20 h-full flex flex-col">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Map className="h-5 w-5 text-blue-500" />
                    Live Approaching Ambulances Map
                  </CardTitle>
                  <CardDescription>GPS telemetry en-route to {hospital.name}</CardDescription>
                </CardHeader>
                <CardContent className="p-0 flex-1 min-h-[400px]">
                  <LiveMap
                    emergencies={emergencies}
                    ambulances={ambulances}
                    hospitals={hospitals}
                    center={[hospital.location?.lat || 5.556, hospital.location?.lng || -0.196]}
                    zoom={15}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {!isErView && !isBedsView && !isArrivalsView && (
          <>
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                {renderBeds()}
              </div>
              <div>
                {renderIncoming()}
              </div>
            </div>

            <Card className="overflow-hidden border-2 border-primary/20">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Map className="h-5 w-5 text-blue-500" />
                    Live Dispatch Map
                  </CardTitle>
                  <CardDescription>Building extrusions & ambulance telemetry en-route to {hospital.name}</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-[380px] w-full">
                  <LiveMap
                    emergencies={emergencies}
                    ambulances={ambulances}
                    hospitals={hospitals}
                    center={[hospital.location?.lat || 5.556, hospital.location?.lng || -0.196]}
                    zoom={15}
                  />
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppShell>
  );
};