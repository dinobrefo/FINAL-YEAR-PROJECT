import * as React from "react";
import { AppShell } from "../components/ierbms/Navigation";
import { StatCard } from "../components/ierbms/StatCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ierbms/Card";
import { Button } from "../components/ierbms/Button";
import { StatusBadge } from "../components/ierbms/StatusBadge";
import { Activity, Clock, MapPin, Navigation, AlertCircle, Plus } from "lucide-react";
import { useRealTime } from "../components/ierbms/RealTimeProvider";
import { useNavigate, useLocation, useSearchParams } from "react-router";
import { LiveMap } from "../components/ierbms/LiveMap";
import { cn } from "../components/ui/utils";

export const AmbulanceDashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { emergencies, ambulances, hospitals } = useRealTime();
  const activeEmergencies = emergencies.filter(e => e.status === "active" || e.status === "in-transit" || e.status === "arrived");
  const historyEmergencies = emergencies.filter(e => e.status === "resolved");

  const currentPath = location.pathname;
  const [searchParams] = useSearchParams();
  const activeRouteCaseId = searchParams.get("caseId");

  const [selectedAmbulance, setSelectedAmbulance] = React.useState<string>("");
  const [isTracking, setIsTracking] = React.useState(false);
  const [currentCoords, setCurrentCoords] = React.useState<{ lat: number; lng: number } | null>(null);
  const [watchId, setWatchId] = React.useState<number | null>(null);

  // Auto-select first ambulance if none is selected or currently selected doesn't exist
  React.useEffect(() => {
    if (ambulances.length > 0) {
      const exists = ambulances.some(a => a.id === selectedAmbulance);
      if (!exists) {
        setSelectedAmbulance(ambulances[0].id);
      }
    }
  }, [ambulances, selectedAmbulance]);

  React.useEffect(() => {
    if (isTracking && selectedAmbulance) {
      if ("geolocation" in navigator) {
        const id = navigator.geolocation.watchPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            setCurrentCoords({ lat: latitude, lng: longitude });

            // Stream actual coordinates (e.g. Kumasi) to DB & Socket.IO
            try {
              await fetch(`/api/ambulances/${selectedAmbulance}/location`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ latitude, longitude }),
              });
            } catch (err) {
              console.error("GPS telemetry error:", err);
            }
          },
          (err) => console.error("GPS sensor error:", err),
          { enableHighAccuracy: true, maximumAge: 5000 }
        );
        setWatchId(id);
      } else {
        alert("Geolocation is not supported by your browser");
        setIsTracking(false);
      }
    } else {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        setWatchId(null);
      }
      setCurrentCoords(null);
    }

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [isTracking, selectedAmbulance]);

  const renderActiveCases = () => (
    <Card>
      <CardHeader>
        <CardTitle>Active Emergencies</CardTitle>
        <CardDescription>Currently assigned emergency cases</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activeEmergencies.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground border-2 border-dashed rounded-lg">
              No active emergencies.
            </div>
          ) : (
            activeEmergencies.map((emergency) => (
              <div
                key={emergency.id}
                className="p-4 border rounded-lg hover:bg-accent transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold">{emergency.patientName}</h4>
                      <StatusBadge status={emergency.severity} pulse={emergency.severity === "critical"}>
                        {emergency.severity.toUpperCase()}
                      </StatusBadge>
                      <StatusBadge status={emergency.status === "in-transit" ? "warning" : "info"}>
                        {emergency.status.toUpperCase()}
                      </StatusBadge>
                    </div>
                    <p className="text-sm text-muted-foreground">{emergency.emergencyType}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {emergency.id.substring(0, 8)}...
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Location</p>
                    <p className="text-sm flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {emergency.location?.address || "Unknown Location"}
                    </p>
                  </div>
                  {emergency.assignedHospital && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Hospital</p>
                      <p className="text-sm">{emergency.assignedHospital}</p>
                    </div>
                  )}
                </div>

                {emergency.vitalSigns && (
                  <div className="grid grid-cols-4 gap-3 p-3 bg-muted rounded-lg mb-3">
                    <div>
                      <p className="text-xs text-muted-foreground">HR</p>
                      <p className="text-sm font-semibold">{emergency.vitalSigns.heartRate} bpm</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">BP</p>
                      <p className="text-sm font-semibold">{emergency.vitalSigns.bloodPressure}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">SpO2</p>
                      <p className="text-sm font-semibold">{emergency.vitalSigns.oxygenSaturation}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Temp</p>
                      <p className="text-sm font-semibold">{emergency.vitalSigns.temperature}°C</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {emergency.status === "in-transit" ? `ETA: ${emergency.eta || '10 mins'}` : "Awaiting dispatch"}
                  </span>
                  <Button variant="outline" size="sm" className="flex items-center gap-1" onClick={() => navigate(`/ambulance/navigation?caseId=${emergency.id}`)}>
                    <Navigation className="h-4 w-4" />
                    Navigate
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );

  const renderHistory = () => (
    <Card>
      <CardHeader>
        <CardTitle>Case History</CardTitle>
        <CardDescription>Recently resolved emergency cases</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {historyEmergencies.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground border-2 border-dashed rounded-lg">
              No resolved cases yet.
            </div>
          ) : (
            historyEmergencies.map((emergency) => (
              <div
                key={emergency.id}
                className="p-4 border rounded-lg opacity-85 hover:opacity-100 transition-opacity bg-card"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold">{emergency.patientName}</h4>
                      <StatusBadge status="success">RESOLVED</StatusBadge>
                    </div>
                    <p className="text-xs text-muted-foreground">{emergency.emergencyType}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {emergency.id.substring(0, 8)}...
                  </span>
                </div>
                {emergency.assignedHospital && (
                  <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    Dropped off at: <strong className="text-foreground">{emergency.assignedHospital}</strong>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );

  const renderNavigation = () => (
    <Card className="h-[600px] flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Navigation className="h-5 w-5 text-[var(--primary)]" />
          Live Navigation Map
        </CardTitle>
        <CardDescription>Real-time location, traffic, and emergency routing</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 p-0 overflow-hidden rounded-b-xl relative z-0">
        <LiveMap 
          emergencies={emergencies}
          ambulances={ambulances}
          hospitals={hospitals}
          activeRouteCaseId={activeRouteCaseId}
        />
      </CardContent>
    </Card>
  );

  return (
    <AppShell role="ambulance" userName="Samuel Osei">
      <div className="space-y-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Active Cases"
            value={activeEmergencies.length}
            icon={Activity}
            variant="default"
          />
          <StatCard
            title="Today's Emergencies"
            value={activeEmergencies.length + historyEmergencies.length}
            icon={AlertCircle}
            variant="warning"
            trend={{ value: 8, isPositive: false }}
          />
          <StatCard
            title="Avg Response Time"
            value="8.5 min"
            icon={Clock}
            variant="success"
            trend={{ value: 12, isPositive: true }}
          />
          <StatCard
            title="Total Distance"
            value="156 km"
            icon={MapPin}
            variant="default"
          />
        </div>

        {/* Quick Actions Grid */}
        {currentPath === "/ambulance" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* New Emergency Card */}
            <Card className="border-[var(--primary)] bg-[var(--accent)] flex flex-col justify-between">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Create Emergency</CardTitle>
                <CardDescription>
                  Report a new emergency case and compute AI hospital matches
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 flex-1 flex flex-col justify-end">
                <Button
                  variant="primary"
                  className="w-full mt-4 flex items-center justify-center gap-1.5"
                  onClick={() => navigate(`/ambulance/new-emergency?ambulanceId=${selectedAmbulance}`)}
                >
                  <Plus className="h-5 w-5" />
                  New Emergency Intake
                </Button>
              </CardContent>
            </Card>

            {/* Live GPS Tracker Card */}
            <Card className="border-border bg-card flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Navigation className="h-5 w-5 text-[var(--primary)]" />
                    Device GPS Transmitter
                  </CardTitle>
                  <span className={cn(
                    "text-xs font-semibold px-2.5 py-1 rounded-full uppercase flex items-center gap-1.5",
                    isTracking 
                      ? "bg-[var(--success)]/10 text-[var(--success)] animate-pulse" 
                      : "bg-muted text-muted-foreground"
                  )}>
                    <span className={cn("h-1.5 w-1.5 rounded-full", isTracking ? "bg-[var(--success)]" : "bg-muted-foreground")} />
                    {isTracking ? "Transmitting" : "Inactive"}
                  </span>
                </div>
                <CardDescription>
                  Bind your device's physical location to an active ambulance unit
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Ambulance Unit</label>
                    <select
                      value={selectedAmbulance}
                      onChange={(e) => setSelectedAmbulance(e.target.value)}
                      disabled={isTracking}
                      className="w-full p-2 border rounded-lg bg-background text-sm"
                    >
                      {ambulances.map(a => (
                        <option key={a.id} value={a.id}>{a.plateNumber} ({a.id.substring(0, 8)})</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Show coordinates */}
                {isTracking && currentCoords && (
                  <div className="p-3 bg-muted rounded-lg border text-xs space-y-1">
                    <p className="flex justify-between">
                      <span className="font-semibold text-muted-foreground">Device Latitude:</span>
                      <span className="font-mono text-foreground font-semibold">{currentCoords.lat.toFixed(6)}</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="font-semibold text-muted-foreground">Device Longitude:</span>
                      <span className="font-mono text-foreground font-semibold">{currentCoords.lng.toFixed(6)}</span>
                    </p>
                    <p className="flex justify-between text-[var(--primary)] font-semibold mt-1 pt-1 border-t">
                      <span>Mapped Region:</span>
                      <span>{currentCoords.lat > 6.0 ? "Kumasi Metro (Ashanti)" : "Accra Metro (Greater Accra)"}</span>
                    </p>
                  </div>
                )}

                <Button
                  variant={isTracking ? "outline" : "primary"}
                  className="w-full flex items-center justify-center gap-1.5"
                  onClick={() => setIsTracking(!isTracking)}
                >
                  <Activity className="h-4 w-4" />
                  {isTracking ? "Deactivate GPS Stream" : "Connect Device GPS Live"}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Conditional Layout Routing */}
        {currentPath === "/ambulance/cases" && (
          <div className="space-y-6">{renderActiveCases()}</div>
        )}

        {currentPath === "/ambulance/history" && (
          <div className="space-y-6">{renderHistory()}</div>
        )}

        {currentPath === "/ambulance/navigation" && (
          <div className="space-y-6">{renderNavigation()}</div>
        )}

        {currentPath === "/ambulance" && (
          <div className="grid grid-cols-12 gap-6">
            {/* Cases Column */}
            <div className="col-span-12 lg:col-span-7 space-y-6">
              {renderActiveCases()}
              {renderHistory()}
            </div>

            {/* Navigation Map Column */}
            <div className="col-span-12 lg:col-span-5">
              <Card className="h-[600px] flex flex-col sticky top-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Navigation className="h-5 w-5 text-[var(--primary)]" />
                    Live Navigation
                  </CardTitle>
                  <CardDescription>Real-time location, traffic, and emergency routing</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 p-0 overflow-hidden rounded-b-xl relative z-0">
                  <LiveMap 
                    emergencies={emergencies}
                    ambulances={ambulances}
                    hospitals={hospitals}
                    activeRouteCaseId={activeRouteCaseId}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
};