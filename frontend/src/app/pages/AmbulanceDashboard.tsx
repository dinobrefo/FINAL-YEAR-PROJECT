import * as React from "react";
import { AppShell } from "../components/ierbms/Navigation";
import { StatCard } from "../components/ierbms/StatCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ierbms/Card";
import { Button } from "../components/ierbms/Button";
import { StatusBadge } from "../components/ierbms/StatusBadge";
import { Activity, Clock, MapPin, Navigation, AlertCircle, Plus, Compass, Gauge, Hospital as HospitalIcon, Map, Shield } from "lucide-react";
import { useRealTime } from "../components/ierbms/RealTimeProvider";
import { useNavigate, useLocation, useSearchParams } from "react-router";
import { LiveMap } from "../components/ierbms/LiveMap";
import { cn } from "../components/ui/utils";

const Analytics3D = React.lazy(() => import("../components/ierbms/Analytics3D"));

class WebGLErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: any, errorInfo: any) {
    console.warn("WebGL Context fallback in AmbulanceDashboard:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="h-64 w-full flex items-center justify-center bg-card border rounded-xl p-4 text-center">
          <p className="text-sm text-muted-foreground">3D Mesh active in standard mode.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

export const AmbulanceDashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { emergencies, ambulances, hospitals } = useRealTime();
  const activeEmergencies = emergencies.filter(e => e.status === "active" || e.status === "in-transit" || e.status === "arrived");
  const historyEmergencies = emergencies.filter(e => e.status === "resolved");

  const currentPath = location.pathname;
  const [searchParams] = useSearchParams();
  const activeRouteCaseId = searchParams.get("caseId");
  const showOverlay = searchParams.get("showOverlay") === "true";

  const [selectedAmbulance, setSelectedAmbulance] = React.useState<string>("");
  const [isTracking, setIsTracking] = React.useState(false);
  const [currentCoords, setCurrentCoords] = React.useState<{ lat: number; lng: number } | null>(null);
  const [watchId, setWatchId] = React.useState<number | null>(null);
  const [autoMatchStatus, setAutoMatchStatus] = React.useState<string>("");

  // Telemetry HUD state
  const [speed, setSpeed] = React.useState<number>(48);
  const [heading, setHeading] = React.useState<number>(145);

  // Auto-select the ambulance closest to physical location
  React.useEffect(() => {
    if (ambulances.length > 0 && !selectedAmbulance) {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const userLat = position.coords.latitude;
            const userLng = position.coords.longitude;
            
            let closestAmb = ambulances[0];
            let minDistance = Infinity;
            
            const getDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
              const dLat = lat2 - lat1;
              const dLng = lng2 - lng1;
              return Math.sqrt(dLat * dLat + dLng * dLng);
            };
            
            ambulances.forEach(a => {
              if (a.location?.lat && a.location?.lng) {
                const dist = getDistance(userLat, userLng, a.location.lat, a.location.lng);
                if (dist < minDistance) {
                  minDistance = dist;
                  closestAmb = a;
                }
              }
            });
            
            setSelectedAmbulance(closestAmb.id);
            const ambName = closestAmb.plateNumber || closestAmb.id.substring(0, 8);
            const region = userLat > 6.0 ? "Kumasi Metro (KNUST)" : "Accra Metro";
            setAutoMatchStatus(`Linked to unit ${ambName} based on physical proximity in ${region}.`);
          },
          (err) => {
            console.error("Could not obtain user location for auto-matching:", err);
            setSelectedAmbulance(ambulances[0].id);
          },
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 }
        );
      } else {
        setSelectedAmbulance(ambulances[0].id);
      }
    } else if (ambulances.length > 0 && selectedAmbulance) {
      const exists = ambulances.some(a => a.id === selectedAmbulance);
      if (!exists) {
        setSelectedAmbulance(ambulances[0].id);
        setAutoMatchStatus("");
      }
    }
  }, [ambulances, selectedAmbulance]);

  React.useEffect(() => {
    if (isTracking && selectedAmbulance) {
      if ("geolocation" in navigator) {
        const id = navigator.geolocation.watchPosition(
          async (position) => {
            const { latitude, longitude, speed: geoSpeed, heading: geoHeading } = position.coords;
            setCurrentCoords({ lat: latitude, lng: longitude });
            if (geoSpeed !== null && !isNaN(geoSpeed)) setSpeed(Math.round(geoSpeed * 3.6));
            if (geoHeading !== null && !isNaN(geoHeading)) setHeading(Math.round(geoHeading));

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
                      <MapPin className="h-3 w-3 text-red-500" />
                      {emergency.location?.address || "Unknown Location"}
                    </p>
                  </div>
                  {emergency.assignedHospital && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Hospital</p>
                      <p className="text-sm font-semibold text-blue-500">{emergency.assignedHospital}</p>
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
                  <Button 
                    variant="primary" 
                    size="sm" 
                    className="flex items-center gap-1 cursor-pointer" 
                    onClick={() => navigate(`/ambulance/navigation?caseId=${emergency.id}&showOverlay=true`)}
                  >
                    <Navigation className="h-4 w-4" />
                    Launch 3D Cockpit HUD
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

  return (
    <AppShell role="ambulance" userName="Paramedic Team Unit #1">
      {showOverlay && activeRouteCaseId && (
        <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col animate-in fade-in duration-300">
          <div className="bg-slate-900 border-b border-slate-800 p-4 flex items-center justify-between z-10 text-white shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
              <div>
                <h3 className="font-bold text-lg text-white flex items-center gap-2">
                  <span>🕹️ 3D Emergency Cockpit Navigation</span>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    60° Camera HUD Active
                  </span>
                </h3>
                <p className="text-xs text-slate-400">Turn-by-turn turn-around, 3D building extrusions, and live traffic telemetry</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="border-slate-700 hover:bg-slate-800 text-white cursor-pointer"
                onClick={() => {
                  const params = new URLSearchParams(searchParams);
                  params.delete("showOverlay");
                  navigate(`${location.pathname}?${params.toString()}`);
                }}
              >
                Exit 3D HUD
              </Button>
              <Button 
                variant="danger" 
                size="sm"
                className="cursor-pointer"
                onClick={async () => {
                  try {
                    await fetch(`/api/ambulances/cases/${activeRouteCaseId}/status`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ status: 'resolved' })
                    });
                    navigate("/ambulance");
                  } catch (err) {
                    console.error("Failed to resolve case:", err);
                  }
                }}
              >
                Complete Dropoff
              </Button>
            </div>
          </div>
          
          <div className="flex-1 relative overflow-hidden">
            <LiveMap 
              emergencies={emergencies}
              ambulances={ambulances}
              hospitals={hospitals}
              activeRouteCaseId={activeRouteCaseId}
            />
          </div>
        </div>
      )}

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

        {/* 3D Telemetry Cockpit & Destination Recommender Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 3D Cockpit HUD Card */}
          <Card className="border-2 border-primary/20 bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <Gauge className="h-5 w-5 text-blue-500" />
                  3D Cockpit Telemetry HUD
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                  Live Sensor
                </span>
              </CardTitle>
              <CardDescription>Real-time vehicle dynamics & telemetry</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3 p-3 bg-muted/60 rounded-xl border border-border/50 text-center">
                <div className="p-2 bg-background rounded-lg border border-border/40">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase flex items-center justify-center gap-1">
                    <Gauge className="h-3 w-3 text-blue-500" /> Speed
                  </p>
                  <p className="text-xl font-extrabold text-foreground mt-1">{speed} <span className="text-xs font-normal text-muted-foreground">km/h</span></p>
                </div>
                <div className="p-2 bg-background rounded-lg border border-border/40">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase flex items-center justify-center gap-1">
                    <Compass className="h-3 w-3 text-violet-500" /> Heading
                  </p>
                  <p className="text-xl font-extrabold text-foreground mt-1">{heading}° <span className="text-xs font-normal text-muted-foreground">SE</span></p>
                </div>
              </div>

              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Shield className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-xs font-bold text-foreground">AI Traffic Rerouting Active</p>
                    <p className="text-[10px] text-muted-foreground">Dynamic congestion avoidance enabled</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 3D Hospital Bed Recommender Mesh Card */}
          <Card className="lg:col-span-2 border-2 border-primary/20 bg-card overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <HospitalIcon className="h-5 w-5 text-emerald-500" />
                  3D Hospital Capacity Mesh
                </CardTitle>
                <CardDescription>Real-time ER & ICU bed availability across regional hospitals</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <WebGLErrorBoundary>
                <React.Suspense fallback={
                  <div className="h-52 w-full flex items-center justify-center text-xs text-muted-foreground animate-pulse">
                    Loading 3D Hospital Mesh...
                  </div>
                }>
                  <div className="h-[210px] w-full rounded-xl overflow-hidden border border-border bg-slate-950">
                    <Analytics3D hospitals={hospitals} />
                  </div>
                </React.Suspense>
              </WebGLErrorBoundary>
            </CardContent>
          </Card>
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
                  className="w-full mt-4 flex items-center justify-center gap-1.5 cursor-pointer"
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
                {autoMatchStatus && (
                  <div className="p-3 bg-[var(--success)]/10 text-[var(--success)] text-xs rounded-lg border border-[var(--success)]/20 font-medium">
                    {autoMatchStatus}
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Ambulance Unit</label>
                    <select
                      value={selectedAmbulance}
                      onChange={(e) => setSelectedAmbulance(e.target.value)}
                      disabled={isTracking}
                      className="w-full p-2 border rounded-lg bg-background text-sm cursor-pointer"
                    >
                      {ambulances.map(a => (
                        <option key={a.id} value={a.id}>{a.plateNumber} ({a.id.substring(0, 8)})</option>
                      ))}
                    </select>
                  </div>
                </div>

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
                  </div>
                )}

                <Button
                  variant={isTracking ? "danger" : "success"}
                  className="w-full cursor-pointer"
                  onClick={() => setIsTracking(!isTracking)}
                >
                  {isTracking ? "Stop Live Telemetry" : "Start Live GPS Telemetry"}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tab Specific Content */}
        {currentPath === "/ambulance" && renderActiveCases()}
        {currentPath === "/ambulance/cases" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {renderActiveCases()}
            {renderHistory()}
          </div>
        )}
        {currentPath === "/ambulance/map" && (
          <Card className="border-2 border-primary/20 overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Map className="h-5 w-5 text-blue-500" />
                Live 3D Emergency Map View
              </CardTitle>
              <CardDescription>Full interactive 3D map with building extrusions & search</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[550px] w-full">
                <LiveMap
                  emergencies={emergencies}
                  ambulances={ambulances}
                  hospitals={hospitals}
                  activeRouteCaseId={activeRouteCaseId}
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
};