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

const Analytics3D = React.lazy(() => import("../components/ierbms/Analytics3D"));
const GlobeView = React.lazy(() => import("../components/ierbms/GlobeView"));

class WebGLErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: any, errorInfo: any) {
    console.warn("WebGL Context lost in HospitalDashboard:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="h-64 w-full flex items-center justify-center bg-card border rounded-xl p-4 text-center">
          <p className="text-sm text-muted-foreground">3D hardware acceleration fallback mode active.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

export const HospitalDashboard: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { hospitalId } = useParams<{ hospitalId: string }>();
  const { emergencies, hospitals, ambulances, updateEmergencyLocally } = useRealTime();

  const [vizMode, setVizMode] = React.useState<"3d" | "2d">("3d");

  const hospital = hospitals.find(h => h.id === hospitalId) || hospitals[0] || {
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

  const bedData = [
    { name: "General", total: hospital.totalBeds - hospital.icuBeds.total, occupied: (hospital.totalBeds - hospital.icuBeds.total) - hospital.availableBeds, available: hospital.availableBeds },
    { name: "ICU", total: hospital.icuBeds.total, occupied: hospital.icuBeds.total - hospital.icuBeds.available, available: hospital.icuBeds.available },
    { name: "ER Queue", total: 40, occupied: 28, available: 12 },
    { name: "Maternity", total: 30, occupied: 22, available: 8 },
  ];

  const occupancyRate = Math.round((hospital.totalBeds - hospital.availableBeds) / hospital.totalBeds * 100);

  const renderBeds = () => (
    <Card className="relative overflow-hidden border-2 border-primary/20">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <CardTitle>Bed Capacity & Department Allocation</CardTitle>
            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-500 border border-blue-500/30">
              Interactive 3D Viz
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
            🏙️ 3D Bars
          </button>
          <button
            onClick={() => setVizMode("2d")}
            className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
              vizMode === "2d" ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            📊 Flat 2D
          </button>
        </div>
      </CardHeader>
      <CardContent>
        {vizMode === "3d" ? (
          <WebGLErrorBoundary>
            <React.Suspense fallback={
              <div className="h-72 w-full flex items-center justify-center text-xs text-muted-foreground animate-pulse">
                Loading 3D Department Bed Mesh...
              </div>
            }>
              <div className="h-[320px] w-full rounded-xl overflow-hidden border border-border bg-slate-950">
                <Analytics3D hospitals={hospitals} />
              </div>
            </React.Suspense>
          </WebGLErrorBoundary>
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/hospital/er`)}
                  >
                    Triage Notes
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

  return (
    <AppShell role="hospital" userName={hospital.name}>
      <div className="space-[#space-y-6] space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{hospital.name} Management</h1>
            <p className="text-muted-foreground">Real-time facility telemetry & 3D bed capacity</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => navigate("/hospital/beds")} variant="outline">
              <BedDouble className="h-4 w-4" />
              Manage Beds
            </Button>
            <Button onClick={() => navigate("/hospital/er")}>
              <Activity className="h-4 w-4" />
              ER Queue
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Available Beds"
            value={hospital.availableBeds}
            icon={BedDouble}
            trend={{ value: `${occupancyRate}% occupied`, isPositive: occupancyRate < 85 }}
          />
          <StatCard
            title="ICU Beds"
            value={`${hospital.icuBeds.available} / ${hospital.icuBeds.total}`}
            icon={Activity}
            description="Critical Care Capacity"
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

        {/* Interactive 3D Bed Mesh & Incoming */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {renderBeds()}
          </div>
          <div>
            {renderIncoming()}
          </div>
        </div>

        {/* 3D Dispatch Map View */}
        <Card className="overflow-hidden border-2 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Map className="h-5 w-5 text-blue-500" />
                Live 3D Dispatch Map
              </CardTitle>
              <CardDescription>3D building extrusions & ambulance telemetry en-route to {hospital.name}</CardDescription>
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
      </div>
    </AppShell>
  );
};