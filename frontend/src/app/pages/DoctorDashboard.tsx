import * as React from "react";
import { AppShell } from "../components/ierbms/Navigation";
import { StatCard } from "../components/ierbms/StatCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ierbms/Card";
import { Button } from "../components/ierbms/Button";
import { StatusBadge } from "../components/ierbms/StatusBadge";
import { Users, Activity, Clock, FileText, Stethoscope } from "lucide-react";
import { useRealTime } from "../components/ierbms/RealTimeProvider";
import { useNavigate, useLocation } from "react-router";

export const DoctorDashboard: React.FC = () => {
  const { emergencies } = useRealTime();
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
        <CardTitle>Incoming Emergency Patients</CardTitle>
        <CardDescription>Prepare for arriving critical cases</CardDescription>
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
                  <div className="grid grid-cols-4 gap-3 p-3 bg-background rounded-lg mb-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Heart Rate</p>
                      <p className="text-sm font-semibold">{patient.vitalSigns.heartRate} bpm</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Blood Pressure</p>
                      <p className="text-sm font-semibold">{patient.vitalSigns.bloodPressure}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">SpO2</p>
                      <p className="text-sm font-semibold">{patient.vitalSigns.oxygenSaturation}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Temperature</p>
                      <p className="text-sm font-semibold">{patient.vitalSigns.temperature}°C</p>
                    </div>
                  </div>
                )}

                <Button variant="primary" size="sm" className="w-full">
                  <FileText className="h-4 w-4" />
                  Review Case Details
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No incoming emergency patients</p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderPatients = () => (
    <Card>
      <CardHeader>
        <CardTitle>Your Assigned Patients</CardTitle>
        <CardDescription>Currently under your care in the ER</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activePatients.length > 0 ? activePatients.map((patient) => (
            <div
              key={patient.id}
              className="p-4 border rounded-lg hover:bg-accent transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-semibold">{patient.patientName}</h4>
                    <StatusBadge status={patient.severity}>
                      {patient.severity.toUpperCase()}
                    </StatusBadge>
                  </div>
                  <p className="text-sm text-muted-foreground">{patient.emergencyType}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">ER Ward</p>
                  <p className="text-xs text-muted-foreground">{patient.id.substring(0, 8)}...</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="success" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => updateEmergencyStatus(patient.id, 'resolved')}
                  disabled={loadingId === patient.id}
                >
                  {loadingId === patient.id ? "Updating..." : "Resolve Case"}
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  Add Notes
                </Button>
              </div>
            </div>
          )) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No active cases assigned</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const renderQueue = () => (
    <Card>
      <CardHeader>
        <CardTitle>Treatment Queue</CardTitle>
        <CardDescription>Pending consultations and procedures</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {[
            { patient: "James Wilson", procedure: "Post-op Checkup", time: "10:30 AM", priority: "moderate" as const },
            { patient: "Emma Davis", procedure: "Blood Test Review", time: "11:00 AM", priority: "stable" as const },
            { patient: "Robert Taylor", procedure: "X-Ray Consultation", time: "11:30 AM", priority: "stable" as const },
          ].map((item, idx) => (
            <div
              key={idx}
              className="p-4 border rounded-lg flex items-center justify-between hover:bg-accent transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-[var(--primary)] flex items-center justify-center text-white font-semibold">
                  {item.patient.charAt(0)}
                </div>
                <div>
                  <p className="font-medium">{item.patient}</p>
                  <p className="text-sm text-muted-foreground">{item.procedure}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={item.priority}>
                  {item.priority.toUpperCase()}
                </StatusBadge>
                <p className="text-sm font-medium">{item.time}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <AppShell role="doctor" userName="Dr. Kwame Boateng">
      <div className="space-y-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Assigned Patients"
            value={activePatients.length}
            icon={Users}
            variant="default"
            onClick={() => navigate("/doctor/patients")}
          />
          <StatCard
            title="Incoming Cases"
            value={incomingPatients.length}
            icon={Activity}
            variant="warning"
            onClick={() => navigate("/doctor/incoming")}
          />
          <StatCard
            title="Consultations Today"
            value={8}
            icon={Stethoscope}
            variant="success"
            onClick={() => navigate("/doctor/queue")}
          />
          <StatCard
            title="Avg Treatment Time"
            value="45 min"
            icon={Clock}
            variant="default"
            onClick={() => navigate("/doctor/records")}
          />
        </div>

        {/* Conditional Layout Routing */}
        {currentPath === "/doctor/patients" && (
          <div className="space-y-6">{renderPatients()}</div>
        )}

        {currentPath === "/doctor/incoming" && (
          <div className="space-y-6">{renderIncoming()}</div>
        )}

        {currentPath === "/doctor/queue" && (
          <div className="space-y-6">{renderQueue()}</div>
        )}

        {currentPath === "/doctor/records" && (
          <Card>
            <CardHeader>
              <CardTitle>Medical Records & Case Archive</CardTitle>
              <CardDescription>View historical patients and diagnoses reports</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                <Stethoscope className="h-12 w-12 mx-auto mb-3 opacity-50 text-[var(--primary)]" />
                <p className="font-semibold text-foreground">Archive Loaded Successfully</p>
                <p className="text-sm mt-1">Accessing secure digital medical records library...</p>
              </div>
            </CardContent>
          </Card>
        )}

        {currentPath === "/doctor" && (
          <>
            {renderIncoming()}
            {renderPatients()}
            {renderQueue()}
          </>
        )}
      </div>
    </AppShell>
  );
};