import * as React from "react";
import { AppShell } from "../components/ierbms/Navigation";
import { StatCard } from "../components/ierbms/StatCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ierbms/Card";
import { Button } from "../components/ierbms/Button";
import { StatusBadge } from "../components/ierbms/StatusBadge";
import { Users, Activity, Clock, FileText, Stethoscope, Map, Heart, Thermometer, ShieldAlert } from "lucide-react";
import { useRealTime } from "../components/ierbms/RealTimeProvider";
import { useNavigate, useLocation } from "react-router";
import { LiveMap } from "../components/ierbms/LiveMap";

export const DoctorDashboard: React.FC = () => {
  const { emergencies, ambulances, hospitals } = useRealTime();
  const navigate = useNavigate();
  const location = useLocation();
  const incomingPatients = emergencies.filter(e => e.status === "in-transit");
  const activePatients = emergencies.filter(e => e.status === "arrived");

  const [loadingId, setLoadingId] = React.useState<string | null>(null);

  const updateEmergencyStatus = async (id: string, status: string) => {
    setLoadingId(id);
    try {
      await fetch(`/api/ambulances/cases/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingId(null);
    }
  };

  const currentPath = location.pathname;

  const renderIncoming = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Incoming Emergency Patients</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-500/15 text-red-500 border border-red-500/20">
            {incomingPatients.length} En-Route
          </span>
        </CardTitle>
        <CardDescription>Prepare trauma bay & vitals for arriving critical cases</CardDescription>
      </CardHeader>
      <CardContent>
        {incomingPatients.length > 0 ? (
          <div className="space-y-4">
            {incomingPatients.map((patient) => (
              <div
                key={patient.id}
                className="p-4 border rounded-lg bg-[var(--accent)]"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold">{patient.patientName}</h4>
                      <StatusBadge status={patient.severity} pulse>
                        {patient.severity.toUpperCase()}
                      </StatusBadge>
                    </div>
                    <p className="text-sm text-muted-foreground">{patient.emergencyType}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-[var(--primary)]">ETA: {patient.eta || "N/A"}</p>
                    <p className="text-xs text-muted-foreground">{patient.id.substring(0, 8)}...</p>
                  </div>
                </div>

                {patient.vitalSigns && (
                  <div className="grid grid-cols-4 gap-3 p-3 bg-background rounded-lg mb-3 border border-border/40">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold flex items-center gap-1">
                        <Heart className="h-3 w-3 text-red-500" /> HR
                      </p>
                      <p className="text-sm font-bold text-foreground">{patient.vitalSigns.heartRate} bpm</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold flex items-center gap-1">
                        <Activity className="h-3 w-3 text-blue-500" /> BP
                      </p>
                      <p className="text-sm font-bold text-foreground">{patient.vitalSigns.bloodPressure}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold flex items-center gap-1">
                        <ShieldAlert className="h-3 w-3 text-emerald-500" /> SpO2
                      </p>
                      <p className="text-sm font-bold text-foreground">{patient.vitalSigns.oxygenSaturation}%</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold flex items-center gap-1">
                        <Thermometer className="h-3 w-3 text-amber-500" /> Temp
                      </p>
                      <p className="text-sm font-bold text-foreground">{patient.vitalSigns.temperature}°C</p>
                    </div>
                  </div>
                )}

                <Button variant="primary" size="sm" className="w-full">
                  <FileText className="h-4 w-4" />
                  Review Case & Pre-Assign Bed
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No incoming emergency patients currently</p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <AppShell role="doctor" userName="Dr. Kwabena Brefo (Physician)">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Doctor Portal & ER Triage</h1>
            <p className="text-muted-foreground">Real-time vital signs, trauma bay prep, and 3D dispatch tracking</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => navigate("/doctor/triage")}>
              <Stethoscope className="h-4 w-4" />
              Triage Queue
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Incoming Patients"
            value={incomingPatients.length}
            icon={Users}
            description="En-route in Ambulances"
          />
          <StatCard
            title="In ER Triage"
            value={activePatients.length}
            icon={Activity}
            description="Arrived & Under Evaluation"
          />
          <StatCard
            title="Avg Triage Time"
            value="4 mins"
            icon={Clock}
            trend={{ value: "Target < 5 mins", isPositive: true }}
          />
          <StatCard
            title="Critical Case Ratio"
            value="15%"
            icon={FileText}
            description="Red Flag Severity Cases"
          />
        </div>

        {/* Incoming Patients & 3D Telemetry Map */}
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            {renderIncoming()}
          </div>
          <div>
            <Card className="overflow-hidden border-2 border-primary/20 h-full flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Map className="h-5 w-5 text-blue-500" />
                  Live 3D Patient Route Tracking
                </CardTitle>
                <CardDescription>3D building camera & telemetry of arriving ambulances</CardDescription>
              </CardHeader>
              <CardContent className="p-0 flex-1 min-h-[360px]">
                <LiveMap
                  emergencies={emergencies}
                  ambulances={ambulances}
                  hospitals={hospitals}
                  center={[5.556, -0.196]}
                  zoom={15}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
};