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
  const currentPath = location.pathname;

  const incomingPatients = emergencies.filter(e => e.status === "in-transit");
  const activePatients = emergencies.filter(e => e.status === "arrived");
  const resolvedPatients = emergencies.filter(e => e.status === "resolved");

  const [loadingId, setLoadingId] = React.useState<string | null>(null);
  const [selectedCase, setSelectedCase] = React.useState<any | null>(null);
  const [triageNote, setTriageNote] = React.useState("");
  const [bedType, setBedType] = React.useState("icu");

  const isTriageView = currentPath.endsWith("/triage");
  const isPatientsView = currentPath.endsWith("/patients");
  const isRecordsView = currentPath.endsWith("/records");

  const openTriageModal = (patient: any) => {
    setSelectedCase(patient);
    setTriageNote((patient as any).triageNotes || "");
    setBedType((patient as any).bedTypeAssigned || (patient.severity === "critical" ? "icu" : "general"));
  };

  const handleSaveTriage = async () => {
    if (!selectedCase) return;
    setLoadingId(selectedCase.id);
    try {
      await fetch(`/api/ambulances/cases/${selectedCase.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: selectedCase.status,
          triage_notes: triageNote,
          bed_type_assigned: bedType
        })
      });
      setSelectedCase(null);
    } catch (err) {
      console.error("Failed to save triage:", err);
    } finally {
      setLoadingId(null);
    }
  };

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
                    <p className="text-sm font-semibold text-[var(--primary)]">ETA: {patient.eta || "En-Route"}</p>
                    <p className="text-xs text-muted-foreground">{patient.id.substring(0, 8)}...</p>
                  </div>
                </div>

                {patient.vitalSigns && (
                  <div className="grid grid-cols-4 gap-3 p-3 bg-background rounded-lg mb-3 border border-border/40">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold flex items-center gap-1">
                        <Heart className="h-3 w-3 text-red-500" /> HR
                      </p>
                      <p className="text-sm font-bold text-foreground">{patient.vitalSigns.heartRate || "--"} bpm</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold flex items-center gap-1">
                        <Activity className="h-3 w-3 text-blue-500" /> BP
                      </p>
                      <p className="text-sm font-bold text-foreground">{patient.vitalSigns.bloodPressure || "--"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold flex items-center gap-1">
                        <ShieldAlert className="h-3 w-3 text-emerald-500" /> SpO2
                      </p>
                      <p className="text-sm font-bold text-foreground">{patient.vitalSigns.oxygenSaturation || "--"}%</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold flex items-center gap-1">
                        <Thermometer className="h-3 w-3 text-amber-500" /> Temp
                      </p>
                      <p className="text-sm font-bold text-foreground">{patient.vitalSigns.temperature || "--"}°C</p>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button 
                    variant="primary" 
                    size="sm" 
                    className="flex-1 cursor-pointer"
                    onClick={() => openTriageModal(patient)}
                  >
                    <FileText className="h-4 w-4" />
                    Review & Pre-Assign Bed
                  </Button>
                  <Button
                    variant="success"
                    size="sm"
                    disabled={loadingId === patient.id}
                    onClick={() => updateEmergencyStatus(patient.id, 'arrived')}
                  >
                    Mark Arrived
                  </Button>
                </div>
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

  const renderTriageQueue = () => (
    <Card className="border border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Stethoscope className="h-5 w-5 text-teal-500" />
          Clinical Triage & Assessment Queue
        </CardTitle>
        <CardDescription>Comprehensive vitals review, trauma scoring, and clinical directives</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[...incomingPatients, ...activePatients].map(patient => (
            <div key={patient.id} className="p-4 border rounded-xl bg-card flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base">{patient.patientName}</span>
                  <StatusBadge status={patient.severity}>{patient.severity.toUpperCase()}</StatusBadge>
                  <span className="text-xs px-2 py-0.5 rounded bg-muted font-bold text-foreground">
                    {patient.emergencyType}
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">
                    Status: {patient.status}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Assigned Bed: <strong className="text-foreground uppercase">{(patient as any).bedTypeAssigned || (patient.severity === 'critical' ? 'ICU Bed' : 'General Ward')}</strong>
                </p>
                {(patient as any).triageNotes && (
                  <p className="text-xs italic bg-muted/60 p-2 rounded text-muted-foreground">
                    Doctor Note: {(patient as any).triageNotes}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => openTriageModal(patient)}>
                  <FileText className="h-4 w-4" />
                  Edit Notes & Bed
                </Button>
                {patient.status === 'arrived' && (
                  <Button size="sm" variant="success" onClick={() => updateEmergencyStatus(patient.id, 'resolved')}>
                    Discharge
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  const renderRecords = () => (
    <Card className="border border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-500" />
          Historical Emergency Medical Records (EHR)
        </CardTitle>
        <CardDescription>Resolved emergency admissions, outcome records, and clinical discharge logs</CardDescription>
      </CardHeader>
      <CardContent>
        {resolvedPatients.length > 0 ? (
          <div className="divide-y divide-border/60">
            {resolvedPatients.map(patient => (
              <div key={patient.id} className="py-3 flex justify-between items-center text-sm">
                <div>
                  <p className="font-bold text-foreground">{patient.patientName}</p>
                  <p className="text-xs text-muted-foreground">{patient.emergencyType} • Case #{patient.id.substring(0, 8)}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-semibold">
                    Resolved & Discharged
                  </span>
                  <p className="text-xs text-muted-foreground mt-0.5">{new Date(patient.timestamp).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center py-8 text-muted-foreground text-sm">No resolved emergency records found.</p>
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
            <p className="text-muted-foreground">Real-time vital signs, trauma bay prep, and clinical bed assignments</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => navigate("/doctor/triage")} variant={isTriageView ? "primary" : "outline"}>
              <Stethoscope className="h-4 w-4" />
              Triage Queue
            </Button>
            <Button onClick={() => navigate("/doctor/patients")} variant={isPatientsView ? "primary" : "outline"}>
              <Users className="h-4 w-4" />
              Assigned Patients
            </Button>
            <Button onClick={() => navigate("/doctor/records")} variant={isRecordsView ? "primary" : "outline"}>
              <FileText className="h-4 w-4" />
              EHR Records
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
            title="Resolved Cases"
            value={resolvedPatients.length}
            icon={FileText}
            description="Successfully Discharged"
          />
        </div>

        {/* Sub-view Routing */}
        {isTriageView && renderTriageQueue()}
        {isRecordsView && renderRecords()}
        {isPatientsView && (
          <Card className="border border-border">
            <CardHeader>
              <CardTitle>Currently Assigned Patients in ER</CardTitle>
              <CardDescription>Patients who have arrived and are occupying ward or ICU beds</CardDescription>
            </CardHeader>
            <CardContent>
              {activePatients.length > 0 ? (
                <div className="space-y-4">
                  {activePatients.map(patient => (
                    <div key={patient.id} className="p-4 border rounded-xl flex items-center justify-between">
                      <div>
                        <p className="font-bold">{patient.patientName}</p>
                        <p className="text-xs text-muted-foreground">{patient.emergencyType} • {(patient as any).bedTypeAssigned || 'General Bed'}</p>
                      </div>
                      <Button size="sm" variant="success" onClick={() => updateEmergencyStatus(patient.id, 'resolved')}>
                        Discharge Patient
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-8 text-muted-foreground">No active arrived patients at this moment.</p>
              )}
            </CardContent>
          </Card>
        )}

        {!isTriageView && !isRecordsView && !isPatientsView && (
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
                  <CardDescription>Real-time GPS telemetry of arriving ambulances</CardDescription>
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
        )}

        {/* Clinical Triage Modal */}
        {selectedCase && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-card border rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="text-lg font-bold">Clinical Triage & Bed Allocation</h3>
                <button onClick={() => setSelectedCase(null)} className="text-muted-foreground hover:text-foreground font-bold">✕</button>
              </div>
              <div>
                <p className="text-sm font-semibold">{selectedCase.patientName} ({selectedCase.emergencyType})</p>
                <p className="text-xs text-muted-foreground">Severity: {selectedCase.severity.toUpperCase()} • Case #{selectedCase.id.substring(0, 8)}</p>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-muted-foreground block">Select Bed Category</label>
                <select 
                  value={bedType} 
                  onChange={(e) => setBedType(e.target.value)}
                  className="w-full p-2 border rounded-lg bg-background text-sm"
                >
                  <option value="icu">ICU Trauma Bay (Critical Care Bed)</option>
                  <option value="general">General Acute Ward Bed</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-muted-foreground block">Physician Directives & Triage Notes</label>
                <textarea
                  value={triageNote}
                  onChange={(e) => setTriageNote(e.target.value)}
                  rows={3}
                  placeholder="e.g. Prep trauma bay 2, initiate oxygen 15L, cross-match 2 units..."
                  className="w-full p-2 border rounded-lg bg-background text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setSelectedCase(null)}>Cancel</Button>
                <Button variant="primary" disabled={loadingId === selectedCase.id} onClick={handleSaveTriage}>
                  {loadingId === selectedCase.id ? "Saving..." : "Save Directives & Reserve"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
};