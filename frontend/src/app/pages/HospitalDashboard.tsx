import * as React from "react";
import { AppShell } from "../components/ierbms/Navigation";
import { StatCard } from "../components/ierbms/StatCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ierbms/Card";
import { Button } from "../components/ierbms/Button";
import { StatusBadge } from "../components/ierbms/StatusBadge";
import { BedDouble, Activity, Ambulance, Users, AlertTriangle, CheckCircle } from "lucide-react";
import { useRealTime } from "../components/ierbms/RealTimeProvider";
import { useNavigate, useLocation } from "react-router";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export const HospitalDashboard: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { emergencies, hospitals } = useRealTime();
  const hospital = hospitals[0] || {
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

  const bedData = [
    { name: "General", total: hospital.totalBeds - hospital.icuBeds.total, occupied: (hospital.totalBeds - hospital.icuBeds.total) - hospital.availableBeds, available: hospital.availableBeds },
    { name: "ICU", total: hospital.icuBeds.total, occupied: hospital.icuBeds.total - hospital.icuBeds.available, available: hospital.icuBeds.available },
    { name: "ER", total: 40, occupied: 28, available: 12 },
    { name: "Maternity", total: 30, occupied: 22, available: 8 },
  ];

  const occupancyRate = Math.round((hospital.totalBeds - hospital.availableBeds) / hospital.totalBeds * 100);
  const currentPath = location.pathname;

  const renderBeds = () => (
    <Card>
      <CardHeader>
        <CardTitle>Bed Capacity & Department Allocation</CardTitle>
        <CardDescription>Current bed occupancy across all hospital wards</CardDescription>
      </CardHeader>
      <CardContent>
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
                  <div className="grid grid-cols-4 gap-3 p-3 bg-background rounded-lg mb-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Heart Rate</p>
                      <p className="text-sm font-semibold">{emergency.vitalSigns.heartRate} bpm</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Blood Pressure</p>
                      <p className="text-sm font-semibold">{emergency.vitalSigns.bloodPressure}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">SpO2</p>
                      <p className="text-sm font-semibold">{emergency.vitalSigns.oxygenSaturation}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Temperature</p>
                      <p className="text-sm font-semibold">{emergency.vitalSigns.temperature}°C</p>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button 
                    variant="primary" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => updateEmergencyStatus(emergency.id, 'arrived')}
                    disabled={loadingId === emergency.id}
                  >
                    <CheckCircle className="h-4 w-4" />
                    {loadingId === emergency.id ? "Updating..." : "Mark Arrived"}
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    Assign Team
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Ambulance className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No incoming ambulances at the moment</p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderStaff = () => (
    <Card>
      <CardHeader>
        <CardTitle>Specialists On Duty</CardTitle>
        <CardDescription>Available medical specialists in-house</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {hospital.specialists.map((specialist, idx) => (
            <div
              key={idx}
              className="p-4 border rounded-lg flex items-center gap-3"
            >
              <div className="h-10 w-10 rounded-full bg-[var(--primary)] flex items-center justify-center text-white font-semibold">
                {specialist.charAt(0)}
              </div>
              <div className="flex-1">
                <p className="font-medium">{specialist}</p>
                <p className="text-xs text-[var(--success)]">● Available</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  const renderICU = () => (
    <Card>
      <CardHeader>
        <CardTitle>ICU Wards & Mechanical Ventilation</CardTitle>
        <CardDescription>Emergency critical care stats</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 border rounded-lg bg-accent text-center">
            <h3 className="text-3xl font-bold text-[var(--danger)]">{hospital.icuBeds.total - hospital.icuBeds.available}</h3>
            <p className="text-xs text-muted-foreground">Occupied ICU Beds</p>
          </div>
          <div className="p-4 border rounded-lg bg-accent text-center">
            <h3 className="text-3xl font-bold text-[var(--success)]">{hospital.icuBeds.available}</h3>
            <p className="text-xs text-muted-foreground">Available ICU Beds</p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Mechanical Ventilators</span>
              <span className="text-sm text-muted-foreground">{hospital.equipment.ventilators}/20 available</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-[var(--success)]" style={{ width: `${(hospital.equipment.ventilators/20)*100}%` }} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <AppShell role="hospital" userName="Dr. Akosua Mensah">
      <div className="space-y-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Available Beds"
            value={hospital.availableBeds}
            icon={BedDouble}
            variant="success"
            onClick={() => navigate("/hospital/beds")}
          />
          <StatCard
            title="ICU Capacity"
            value={`${hospital.icuBeds.available}/${hospital.icuBeds.total}`}
            icon={Activity}
            variant={hospital.icuBeds.available < 5 ? "danger" : "default"}
            onClick={() => navigate("/hospital/icu")}
          />
          <StatCard
            title="Incoming Ambulances"
            value={incomingEmergencies.length}
            icon={Ambulance}
            variant="warning"
            onClick={() => navigate("/hospital/incoming")}
          />
          <StatCard
            title="Occupancy Rate"
            value={`${occupancyRate}%`}
            icon={Users}
            variant={occupancyRate > 85 ? "danger" : "default"}
            onClick={() => navigate("/hospital/staff")}
          />
        </div>

        {/* Alerts */}
        {hospital.icuBeds.available < 5 && (
          <Card className="border-[var(--warning)] bg-[var(--warning)]/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-[var(--warning)]" />
                <div className="flex-1">
                  <h4 className="font-semibold">Low ICU Capacity Alert</h4>
                  <p className="text-sm text-muted-foreground">
                    Only {hospital.icuBeds.available} ICU beds remaining. Consider preparing for transfers.
                  </p>
                </div>
                <Button variant="outline" size="sm">View Details</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Conditional Layout Routing */}
        {currentPath === "/hospital/beds" && (
          <div className="space-y-6">{renderBeds()}</div>
        )}

        {currentPath === "/hospital/icu" && (
          <div className="space-y-6">{renderICU()}</div>
        )}

        {currentPath === "/hospital/incoming" && (
          <div className="space-y-6">{renderIncoming()}</div>
        )}

        {currentPath === "/hospital/staff" && (
          <div className="space-y-6">{renderStaff()}</div>
        )}

        {currentPath === "/hospital" && (
          <>
            {renderIncoming()}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {renderBeds()}
              <Card>
                <CardHeader>
                  <CardTitle>Equipment Status</CardTitle>
                  <CardDescription>Critical medical equipment availability</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { name: "Ventilators", count: hospital.equipment.ventilators, total: 20 },
                      { name: "CT Scanners", count: hospital.equipment.ctScanners, total: 3 },
                      { name: "MRI Machines", count: hospital.equipment.mriMachines, total: 2 },
                      { name: "Oxygen Units", count: hospital.equipment.oxygenUnits, total: 50 },
                    ].map((equipment) => (
                      <div key={equipment.name} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{equipment.name}</span>
                          <span className="text-sm text-muted-foreground">{equipment.count}/{equipment.total}</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-[var(--success)]" style={{ width: `${(equipment.count/equipment.total)*100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
            {renderStaff()}
          </>
        )}
      </div>
    </AppShell>
  );
};