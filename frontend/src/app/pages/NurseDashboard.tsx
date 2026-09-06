import * as React from "react";
import { AppShell } from "../components/ierbms/Navigation";
import { StatCard } from "../components/ierbms/StatCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ierbms/Card";
import { Button } from "../components/ierbms/Button";
import { StatusBadge } from "../components/ierbms/StatusBadge";
import { BedDouble, Activity, Users, FileText, CheckCircle, Clock, Heart, ShieldAlert, Thermometer, UserCheck } from "lucide-react";
import { useRealTime } from "../components/ierbms/RealTimeProvider";
import { useNavigate, useLocation } from "react-router";

export const NurseDashboard: React.FC = () => {
  const { emergencies, hospitals, updateEmergencyLocally } = useRealTime();
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  const [loadingId, setLoadingId] = React.useState<string | null>(null);
  const [selectedCase, setSelectedCase] = React.useState<any | null>(null);
  const [bedAssignment, setBedAssignment] = React.useState("general");
  const [wardNote, setWardNote] = React.useState("");

  // Default to first hospital or user's assigned hospital
  const primaryHospital = hospitals[0] || {
    id: "h1",
    name: "Ridge Hospital",
    availableBeds: 45,
    totalBeds: 200,
    icuBeds: { total: 30, available: 5 }
  };

  const incomingPatients = emergencies.filter(e => e.status === "in-transit");
  const activeAdmittedPatients = emergencies.filter(e => e.status === "arrived");
  const dischargedPatients = emergencies.filter(e => e.status === "resolved");

  const isAdmissionsView = currentPath.endsWith("/admissions");
  const isBedsView = currentPath.endsWith("/beds");
  const isWardsView = currentPath.endsWith("/wards");
  const isPatientsView = currentPath.endsWith("/patients");

  const updateStatus = async (id: string, status: string, bedType?: string) => {
    setLoadingId(id);
    try {
      const res = await fetch(`/api/ambulances/cases/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status,
          bed_type_assigned: bedType,
          triage_notes: wardNote || undefined
        })
      });
      if (updateEmergencyLocally) {
        updateEmergencyLocally(id, status);
      }
      setSelectedCase(null);
      setWardNote("");
    } catch (err) {
      console.error("Nurse update error:", err);
    } finally {
      setLoadingId(null);
    }
  };

  const occupancyRate = Math.round(
    ((primaryHospital.totalBeds - primaryHospital.availableBeds) / (primaryHospital.totalBeds || 1)) * 100
  );

  const renderAdmissions = () => (
    <Card className="border border-border shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-teal-500" />
              Incoming Patient Admissions
            </CardTitle>
            <CardDescription>Verify arriving ambulances, allocate beds, and initiate nursing intake</CardDescription>
          </div>
          <span className="px-3 py-1 bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold rounded-full text-xs">
            {incomingPatients.length} Approaching
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {incomingPatients.length > 0 ? (
          <div className="divide-y divide-border/60">
            {incomingPatients.map(patient => (
              <div key={patient.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base text-foreground">{patient.patientName}</span>
                    <StatusBadge status={patient.severity}>{patient.severity.toUpperCase()}</StatusBadge>
                    <span className="text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 font-bold">
                      {patient.emergencyType}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Target Bed: <strong className="text-foreground uppercase">{(patient as any).bedTypeAssigned || 'General Bed'}</strong> • Case #{patient.id.substring(0, 8)}
                  </p>
                  {patient.vitalSigns && (
                    <div className="flex gap-4 text-xs font-mono text-muted-foreground mt-1">
                      <span>HR: <strong className="text-foreground">{patient.vitalSigns.heartRate || "--"}</strong> bpm</span>
                      <span>BP: <strong className="text-foreground">{patient.vitalSigns.bloodPressure || "--"}</strong></span>
                      <span>SpO2: <strong className="text-foreground">{patient.vitalSigns.oxygenSaturation || "--"}</strong>%</span>
                      <span>Temp: <strong className="text-foreground">{patient.vitalSigns.temperature || "--"}</strong>°C</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedCase(patient);
                      setBedAssignment((patient as any).bedTypeAssigned || 'general');
                    }}
                  >
                    <BedDouble className="h-4 w-4" />
                    Assign Ward Bed
                  </Button>
                  <Button
                    size="sm"
                    variant="success"
                    disabled={loadingId === patient.id}
                    onClick={() => updateStatus(patient.id, 'arrived')}
                  >
                    <CheckCircle className="h-4 w-4" />
                    Admit to Ward
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <UserCheck className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>No unadmitted ambulances en-route currently.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderWards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Card className="border border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>Ward A - General Acute Care</span>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded">Active</span>
          </CardTitle>
          <CardDescription>Post-ER medical observation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Capacity:</span>
            <span className="font-bold">60 Beds</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Occupied:</span>
            <span className="font-bold text-amber-500">42 Beds</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Available:</span>
            <span className="font-bold text-emerald-500">18 Beds</span>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>ICU Trauma Ward</span>
            <span className="text-xs font-bold text-red-600 bg-red-500/10 px-2 py-0.5 rounded">Critical</span>
          </CardTitle>
          <CardDescription>Resuscitation & continuous life support</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total ICU Beds:</span>
            <span className="font-bold">{primaryHospital.icuBeds.total} Beds</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Occupied ICU:</span>
            <span className="font-bold text-red-500">{primaryHospital.icuBeds.total - primaryHospital.icuBeds.available} Beds</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Available ICU:</span>
            <span className="font-bold text-emerald-500">{primaryHospital.icuBeds.available} Beds</span>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>Emergency Department Bay</span>
            <span className="text-xs font-bold text-blue-600 bg-blue-500/10 px-2 py-0.5 rounded">Triage</span>
          </CardTitle>
          <CardDescription>Immediate trauma stabilization</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Active Trauma Bays:</span>
            <span className="font-bold">12 Bays</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">In Evaluation:</span>
            <span className="font-bold text-blue-500">{activeAdmittedPatients.length} Patients</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Nurse-to-Patient Ratio:</span>
            <span className="font-bold text-emerald-500">1 : 2 (Compliant)</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <AppShell role="nurse" userName="Charge Nurse Abena Osei (Ward Super)">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Nurse Portal & Ward Management</h1>
            <p className="text-muted-foreground">Patient admissions, bed census allocations, and ward monitoring</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => navigate("/nurse/admissions")} variant={isAdmissionsView ? "primary" : "outline"}>
              <FileText className="h-4 w-4" />
              Admissions
            </Button>
            <Button onClick={() => navigate("/nurse/beds")} variant={isBedsView ? "primary" : "outline"}>
              <BedDouble className="h-4 w-4" />
              Bed Assignment
            </Button>
            <Button onClick={() => navigate("/nurse/wards")} variant={isWardsView ? "primary" : "outline"}>
              <Activity className="h-4 w-4" />
              Ward Monitoring
            </Button>
            <Button onClick={() => navigate("/nurse/patients")} variant={isPatientsView ? "primary" : "outline"}>
              <Users className="h-4 w-4" />
              Inpatients
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Available General Beds"
            value={primaryHospital.availableBeds}
            icon={BedDouble}
            trend={{ value: `${occupancyRate}% ward occupancy`, isPositive: occupancyRate < 85 }}
          />
          <StatCard
            title="Available ICU Beds"
            value={`${primaryHospital.icuBeds.available} / ${primaryHospital.icuBeds.total}`}
            icon={Activity}
            description="Critical Care Readiness"
          />
          <StatCard
            title="Pending Admissions"
            value={incomingPatients.length}
            icon={Users}
            description="Ambulances En-route"
          />
          <StatCard
            title="Admitted in Ward"
            value={activeAdmittedPatients.length}
            icon={CheckCircle}
            description="Under Active Nursing Care"
          />
        </div>

        {/* Sub-view Routing */}
        {isAdmissionsView && renderAdmissions()}
        {isWardsView && renderWards()}

        {(isBedsView || isPatientsView) && (
          <Card className="border border-border">
            <CardHeader>
              <CardTitle>Inpatient Ward Bed Registry</CardTitle>
              <CardDescription>Manage active inpatients, assign specific beds, and process discharges</CardDescription>
            </CardHeader>
            <CardContent>
              {activeAdmittedPatients.length > 0 ? (
                <div className="divide-y divide-border/60">
                  {activeAdmittedPatients.map(patient => (
                    <div key={patient.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground">{patient.patientName}</span>
                          <StatusBadge status={patient.severity}>{patient.severity.toUpperCase()}</StatusBadge>
                          <span className="text-xs px-2 py-0.5 rounded bg-muted font-mono">{patient.emergencyType}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Current Bed: <strong className="text-foreground uppercase">{(patient as any).bedTypeAssigned || 'General Acute Bed'}</strong> • Case #{patient.id.substring(0, 8)}
                        </p>
                        {(patient as any).triageNotes && (
                          <p className="text-xs italic bg-muted/60 p-2 rounded text-muted-foreground mt-1">
                            Nurse/Doctor Notes: {(patient as any).triageNotes}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setSelectedCase(patient);
                            setBedAssignment((patient as any).bedTypeAssigned || 'general');
                          }}
                        >
                          Change Bed
                        </Button>
                        <Button 
                          size="sm" 
                          variant="success"
                          disabled={loadingId === patient.id}
                          onClick={() => updateStatus(patient.id, 'resolved')}
                        >
                          Discharge Patient & Free Bed
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-10 text-muted-foreground">No active inpatients in the ward currently.</p>
              )}
            </CardContent>
          </Card>
        )}

        {!isAdmissionsView && !isBedsView && !isWardsView && !isPatientsView && (
          <div className="space-y-6">
            {renderAdmissions()}
            {renderWards()}
          </div>
        )}

        {/* Ward Bed Assignment Modal */}
        {selectedCase && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-card border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="text-lg font-bold">Allocate Ward Bed</h3>
                <button onClick={() => setSelectedCase(null)} className="text-muted-foreground hover:text-foreground font-bold">✕</button>
              </div>
              <div>
                <p className="text-sm font-semibold">{selectedCase.patientName}</p>
                <p className="text-xs text-muted-foreground">Emergency: {selectedCase.emergencyType} • Severity: {selectedCase.severity.toUpperCase()}</p>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-muted-foreground block">Ward & Bed Designation</label>
                <select 
                  value={bedAssignment} 
                  onChange={(e) => setBedAssignment(e.target.value)}
                  className="w-full p-2 border rounded-lg bg-background text-sm cursor-pointer"
                >
                  <option value="general">Ward A - General Acute Care Bed</option>
                  <option value="icu">ICU Trauma Bay - Critical Resuscitation Bed</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-muted-foreground block">Nursing Admission Notes</label>
                <textarea
                  value={wardNote}
                  onChange={(e) => setWardNote(e.target.value)}
                  rows={2}
                  placeholder="e.g. Assigned to Bay 4, IV line established, vitals verified..."
                  className="w-full p-2 border rounded-lg bg-background text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setSelectedCase(null)}>Cancel</Button>
                <Button 
                  variant="primary" 
                  disabled={loadingId === selectedCase.id} 
                  onClick={() => updateStatus(selectedCase.id, selectedCase.status === 'in-transit' ? 'arrived' : selectedCase.status, bedAssignment)}
                >
                  {loadingId === selectedCase.id ? "Updating..." : "Confirm Bed Allocation"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
};
export default NurseDashboard;
