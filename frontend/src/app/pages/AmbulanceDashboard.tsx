import * as React from "react";
import { AppShell } from "../components/ierbms/Navigation";
import { StatCard } from "../components/ierbms/StatCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ierbms/Card";
import { Button } from "../components/ierbms/Button";
import { StatusBadge } from "../components/ierbms/StatusBadge";
import { Activity, Clock, MapPin, Navigation, AlertCircle, Plus, Compass, Gauge, Hospital as HospitalIcon, Map, Shield, Search, CheckCircle2, ArrowRight } from "lucide-react";
import { useRealTime } from "../components/ierbms/RealTimeProvider";
import { useNavigate, useLocation, useSearchParams } from "react-router";
import { LiveMap } from "../components/ierbms/LiveMap";
import { cn } from "../components/ui/utils";
import { Input } from "../components/ui/input";

import { HospitalCapacityMesh } from "../components/ierbms/HospitalCapacityMesh";

const getCardinalDirection = (deg: number): string => {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const idx = Math.round((deg % 360) / 22.5) % 16;
  return dirs[idx] || 'N';
};

export const AmbulanceDashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { emergencies, ambulances, hospitals, updateEmergencyLocally } = useRealTime();
  const activeEmergencies = emergencies.filter(e => e.status === "active" || e.status === "in-transit" || e.status === "arrived");
  const historyEmergencies = emergencies.filter(e => e.status === "resolved");

  const cleanPath = location.pathname.replace(/\/$/, "");
  const isCasesPage = cleanPath.includes("/ambulance/cases");
  const isMapPage = cleanPath.includes("/ambulance/map") || cleanPath.includes("/ambulance/navigation");
  const isDashboardPage = !isCasesPage && !isMapPage;

  const [caseFilter, setCaseFilter] = React.useState<"all" | "critical" | "in-transit" | "history">("all");
  const [caseSearch, setCaseSearch] = React.useState<string>("");

  const handleUpdateCaseStatus = async (caseId: string, newStatus: 'in-transit' | 'arrived' | 'resolved') => {
    try {
      await fetch(`/api/ambulances/cases/${caseId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (updateEmergencyLocally) {
        updateEmergencyLocally(caseId, newStatus);
      }
    } catch (err) {
      console.error("Failed to update case status:", err);
    }
  };

  const [searchParams] = useSearchParams();
  const activeRouteCaseId = searchParams.get("caseId");
  const showOverlay = searchParams.get("showOverlay") === "true";

  const [selectedAmbulance, setSelectedAmbulance] = React.useState<string>("");
  const [isTracking, setIsTracking] = React.useState(false);
  const [currentCoords, setCurrentCoords] = React.useState<{ lat: number; lng: number } | null>(null);
  const [watchId, setWatchId] = React.useState<number | null>(null);
  const [autoMatchStatus, setAutoMatchStatus] = React.useState<string>("");

  // Telemetry HUD state - defaults to 0 km/h (parked / engine standby)
  const [speed, setSpeed] = React.useState<number>(0);
  const [heading, setHeading] = React.useState<number>(0);
  const [isSimulatingDrive, setIsSimulatingDrive] = React.useState<boolean>(false);

  // Dynamic simulation effect for presentations or testing
  React.useEffect(() => {
    if (isSimulatingDrive) {
      setSpeed(64);
      setHeading(315);
      const interval = setInterval(() => {
        setSpeed(prev => {
          const delta = Math.floor(Math.random() * 9) - 4; // -4 to +4 km/h fluctuation
          return Math.max(48, Math.min(82, prev + delta));
        });
        setHeading(prev => (prev + Math.floor(Math.random() * 7) - 3 + 360) % 360);
      }, 1500);
      return () => clearInterval(interval);
    } else if (!isTracking) {
      setSpeed(0);
      setHeading(0);
    }
  }, [isSimulatingDrive, isTracking]);

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
            if (!isSimulatingDrive) {
              if (geoSpeed !== null && !isNaN(geoSpeed) && geoSpeed > 0.5) {
                setSpeed(Math.round(geoSpeed * 3.6));
              } else {
                setSpeed(0);
              }
              if (geoHeading !== null && !isNaN(geoHeading)) {
                setHeading(Math.round(geoHeading));
              }
            }

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

                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs text-muted-foreground">
                    {emergency.status === "in-transit" ? `ETA: ${emergency.eta || '10 mins'}` : "Awaiting dispatch"}
                  </span>
                  <div className="flex items-center gap-2">
                    {emergency.status === "active" ? (
                      <Button 
                        variant="primary" 
                        size="sm" 
                        className="flex items-center gap-1.5 cursor-pointer font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md text-xs" 
                        onClick={async () => {
                          await handleUpdateCaseStatus(emergency.id, "in-transit");
                          navigate(`/ambulance/map?caseId=${emergency.id}`);
                        }}
                      >
                        <Navigation className="h-3.5 w-3.5" />
                        Take Emergency
                      </Button>
                    ) : (
                      <Button 
                        variant="primary" 
                        size="sm" 
                        className="flex items-center gap-1 cursor-pointer text-xs" 
                        onClick={() => navigate(`/ambulance/map?caseId=${emergency.id}`)}
                      >
                        <Navigation className="h-3.5 w-3.5" />
                        View Live Route
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex items-center gap-1 cursor-pointer text-xs border-slate-700" 
                      onClick={() => navigate(`/ambulance/navigation?caseId=${emergency.id}&showOverlay=true`)}
                    >
                      Cockpit HUD
                    </Button>
                  </div>
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

  const filteredCases = React.useMemo(() => {
    let list = caseFilter === "history" ? historyEmergencies : activeEmergencies;
    if (caseFilter === "critical") {
      list = list.filter(e => e.severity === "critical");
    } else if (caseFilter === "in-transit") {
      list = list.filter(e => e.status === "in-transit");
    }
    if (caseSearch.trim()) {
      const q = caseSearch.toLowerCase();
      list = list.filter(e => 
        e.patientName?.toLowerCase().includes(q) ||
        e.emergencyType?.toLowerCase().includes(q) ||
        e.assignedHospital?.toLowerCase().includes(q) ||
        e.ambulanceId?.toLowerCase().includes(q) ||
        e.id.toLowerCase().includes(q)
      );
    }
    return list;
  }, [caseFilter, caseSearch, activeEmergencies, historyEmergencies]);

  const renderDedicatedCasesView = () => {
    const criticalCount = activeEmergencies.filter(e => e.severity === 'critical').length;
    const inTransitCount = activeEmergencies.filter(e => e.status === 'in-transit').length;

    return (
      <div className="space-y-6">
        {/* Cases Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2.5">
              <span>🚑</span> Emergency Dispatch & Active Cases Queue
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Live paramedic dispatch queue, clinical vitals monitoring, and hospital handover tracking
            </p>
          </div>
          <Button
            variant="primary"
            className="flex items-center gap-2 cursor-pointer shadow-md"
            onClick={() => navigate(`/ambulance/new-emergency?ambulanceId=${selectedAmbulance}`)}
          >
            <Plus className="h-4 w-4" />
            New Emergency Intake
          </Button>
        </div>

        {/* Mini KPI Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-card border rounded-xl shadow-sm">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Active Incidents</p>
            <p className="text-2xl font-extrabold text-foreground mt-1">{activeEmergencies.length}</p>
          </div>
          <div className="p-4 bg-card border rounded-xl shadow-sm">
            <p className="text-xs font-semibold uppercase text-rose-500 flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5" /> Critical (Red)
            </p>
            <p className="text-2xl font-extrabold text-rose-500 mt-1">{criticalCount}</p>
          </div>
          <div className="p-4 bg-card border rounded-xl shadow-sm">
            <p className="text-xs font-semibold uppercase text-amber-500 flex items-center gap-1">
              <Activity className="h-3.5 w-3.5" /> In-Transit to ER
            </p>
            <p className="text-2xl font-extrabold text-amber-500 mt-1">{inTransitCount}</p>
          </div>
          <div className="p-4 bg-card border rounded-xl shadow-sm">
            <p className="text-xs font-semibold uppercase text-emerald-500 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Resolved Today
            </p>
            <p className="text-2xl font-extrabold text-emerald-500 mt-1">{historyEmergencies.length}</p>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="p-4 bg-card border rounded-xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filter by patient, condition, hospital..."
              value={caseSearch}
              onChange={(e) => setCaseSearch(e.target.value)}
              className="pl-9 text-sm"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
            <button
              onClick={() => setCaseFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                caseFilter === "all"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              All Active ({activeEmergencies.length})
            </button>
            <button
              onClick={() => setCaseFilter("critical")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                caseFilter === "critical"
                  ? "bg-rose-600 text-white shadow-sm"
                  : "bg-muted/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              🚨 Critical Only ({criticalCount})
            </button>
            <button
              onClick={() => setCaseFilter("in-transit")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                caseFilter === "in-transit"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "bg-muted/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              🚑 In-Transit ({inTransitCount})
            </button>
            <button
              onClick={() => setCaseFilter("history")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                caseFilter === "history"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-muted/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              ✅ Resolved History ({historyEmergencies.length})
            </button>
          </div>
        </div>

        {/* Case Cards Grid */}
        {filteredCases.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="p-12 text-center text-muted-foreground">
              <AlertCircle className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-base font-semibold">No emergency cases match your search or filter.</p>
              <p className="text-xs text-muted-foreground mt-1">Try selecting another filter or clear the search query.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredCases.map((emergency) => {
              const isCritical = emergency.severity === "critical";
              const isResolved = emergency.status === "resolved";
              return (
                <Card
                  key={emergency.id}
                  className={`border-2 transition-all shadow-md ${
                    isCritical && !isResolved
                      ? "border-rose-500/40 bg-card hover:border-rose-500/80"
                      : "border-border bg-card hover:border-primary/50"
                  }`}
                >
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <h3 className="font-bold text-base text-foreground">{emergency.patientName}</h3>
                          <StatusBadge status={emergency.severity} pulse={isCritical && !isResolved}>
                            {emergency.severity.toUpperCase()}
                          </StatusBadge>
                          <StatusBadge status={emergency.status === "in-transit" ? "warning" : emergency.status === "resolved" ? "success" : "info"}>
                            {emergency.status.toUpperCase()}
                          </StatusBadge>
                        </div>
                        <p className="text-xs font-medium text-muted-foreground">{emergency.emergencyType}</p>
                      </div>
                      <span className="text-[11px] font-mono text-muted-foreground px-2 py-0.5 rounded bg-muted/80">
                        {emergency.id.substring(0, 8)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs bg-muted/40 p-3 rounded-lg border border-border/40">
                      <div>
                        <span className="text-[10px] text-muted-foreground font-semibold uppercase block mb-0.5">Location</span>
                        <p className="text-foreground font-medium flex items-center gap-1 truncate">
                          <MapPin className="h-3 w-3 text-rose-500 shrink-0" />
                          {emergency.location?.address || "Kumasi Metro"}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground font-semibold uppercase block mb-0.5">Assigned Facility</span>
                        <p className="text-blue-400 font-semibold truncate">
                          🏥 {emergency.assignedHospital || "Awaiting AI Match"}
                        </p>
                      </div>
                    </div>

                    {emergency.vitalSigns && (
                      <div className="grid grid-cols-4 gap-2 text-center p-2.5 bg-muted/60 rounded-lg border border-border/50 text-xs">
                        <div>
                          <p className="text-[10px] text-muted-foreground font-semibold">Pulse</p>
                          <p className="font-bold text-foreground mt-0.5">{emergency.vitalSigns.heartRate} <span className="text-[9px] font-normal text-muted-foreground">bpm</span></p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground font-semibold">BP</p>
                          <p className="font-bold text-foreground mt-0.5">{emergency.vitalSigns.bloodPressure}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground font-semibold">SpO2</p>
                          <p className="font-bold text-blue-400 mt-0.5">{emergency.vitalSigns.oxygenSaturation}%</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground font-semibold">Temp</p>
                          <p className="font-bold text-foreground mt-0.5">{emergency.vitalSigns.temperature}°C</p>
                        </div>
                      </div>
                    )}

                    {!isResolved && (
                      <div className="pt-2 border-t border-border/40 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {emergency.status === "active" ? (
                            <Button
                              variant="primary"
                              size="sm"
                              className="flex items-center gap-1.5 cursor-pointer text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow"
                              onClick={async () => {
                                await handleUpdateCaseStatus(emergency.id, "in-transit");
                                navigate(`/ambulance/map?caseId=${emergency.id}`);
                              }}
                            >
                              <Navigation className="h-3.5 w-3.5" />
                              Take Emergency & Route
                            </Button>
                          ) : (
                            <Button
                              variant="primary"
                              size="sm"
                              className="flex items-center gap-1.5 cursor-pointer text-xs"
                              onClick={() => navigate(`/ambulance/map?caseId=${emergency.id}`)}
                            >
                              <Navigation className="h-3.5 w-3.5" />
                              View Route on Map
                            </Button>
                          )}

                          <Button
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-1.5 cursor-pointer text-xs border-slate-700"
                            onClick={() => navigate(`/ambulance/navigation?caseId=${emergency.id}&showOverlay=true`)}
                          >
                            Cockpit HUD
                          </Button>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {emergency.status === "in-transit" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs border-amber-500/40 text-amber-400 hover:bg-amber-500/10 cursor-pointer"
                              onClick={() => handleUpdateCaseStatus(emergency.id, "arrived")}
                            >
                              Arrived at ER
                            </Button>
                          )}
                          <Button
                            variant="success"
                            size="sm"
                            className="text-xs cursor-pointer"
                            onClick={() => handleUpdateCaseStatus(emergency.id, "resolved")}
                          >
                            Complete Handover
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderDedicatedMapView = () => {
    const inTransitCase = emergencies.find(e => e.status === "in-transit");
    const activeCase = activeRouteCaseId 
      ? emergencies.find(e => e.id === activeRouteCaseId) 
      : inTransitCase;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Map className="h-6 w-6 text-teal-500" />
              Live Emergency Geospatial Navigation
            </h2>
            <p className="text-sm text-muted-foreground">
              Turn-by-turn road snapping to assigned hospital, telemetry tracking & tactical focus
            </p>
          </div>

          {/* Active Cases Switcher */}
          {activeEmergencies.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap bg-muted/60 p-1.5 rounded-xl border border-border/50 text-xs">
              <span className="text-[11px] font-bold text-muted-foreground px-2 flex items-center gap-1">
                <Activity className="h-3.5 w-3.5 text-rose-500 animate-pulse" />
                Dispatch Target:
              </span>
              {activeEmergencies.map(e => {
                const isSelected = activeCase?.id === e.id;
                return (
                  <button
                    key={e.id}
                    onClick={() => {
                      const params = new URLSearchParams(searchParams);
                      params.set("caseId", e.id);
                      navigate(`${location.pathname}?${params.toString()}`);
                    }}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1",
                      isSelected
                        ? "bg-teal-600 text-white font-bold shadow"
                        : "hover:bg-accent text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <span>{e.patientName || e.emergencyType}</span>
                    <span className="text-[10px] font-mono opacity-80">({e.severity})</span>
                    {isSelected && <span className="text-[10px] text-teal-200">✓</span>}
                  </button>
                );
              })}
              {activeRouteCaseId && (
                <button
                  onClick={() => {
                    const params = new URLSearchParams(searchParams);
                    params.delete("caseId");
                    navigate(`${location.pathname}?${params.toString()}`);
                  }}
                  className="px-2 py-1 rounded-lg text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
                  title="Show all regional facilities"
                >
                  Show All
                </button>
              )}
            </div>
          )}
        </div>

        <Card className="rounded-[24px] border border-border shadow-2xl overflow-hidden">
          <CardContent className="p-0">
            <div className="h-[680px] w-full">
              <LiveMap
                emergencies={emergencies}
                ambulances={ambulances}
                hospitals={hospitals}
                activeRouteCaseId={activeCase?.id || activeRouteCaseId}
                isEmergencyMode={Boolean(activeCase)}
                userCoords={currentCoords ? [currentCoords.lat, currentCoords.lng] : null}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

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
              isEmergencyMode={true}
              userCoords={currentCoords ? [currentCoords.lat, currentCoords.lng] : null}
            />
          </div>
        </div>
      )}

      <div className="space-y-8">
        {/* Cockpit Overview (Only on /ambulance) */}
        {isDashboardPage && (
          <>
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
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                      isSimulatingDrive 
                        ? "bg-amber-500/15 text-amber-400 border-amber-500/30 animate-pulse"
                        : speed > 0 
                          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                          : "bg-slate-500/15 text-slate-400 border-slate-500/30"
                    }`}>
                      {isSimulatingDrive ? "Simulated Run" : speed > 0 ? "In Motion" : "Parked / Idle"}
                    </span>
                  </CardTitle>
                  <CardDescription>
                    {speed === 0 
                      ? "Vehicle stationary • Engine on standby" 
                      : `Real-time vehicle dynamics • ${isSimulatingDrive ? "Siren Run Active" : "Telemetry Active"}`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 p-3 bg-muted/60 rounded-xl border border-border/50 text-center">
                    <div className="p-2 bg-background rounded-lg border border-border/40">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase flex items-center justify-center gap-1">
                        <Gauge className="h-3 w-3 text-blue-500" /> Speed
                      </p>
                      <p className="text-xl font-extrabold text-foreground mt-1">
                        {speed} <span className="text-xs font-normal text-muted-foreground">km/h</span>
                      </p>
                    </div>
                    <div className="p-2 bg-background rounded-lg border border-border/40">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase flex items-center justify-center gap-1">
                        <Compass className="h-3 w-3 text-violet-500" /> Heading
                      </p>
                      <p className="text-xl font-extrabold text-foreground mt-1">
                        {heading}° <span className="text-xs font-normal text-muted-foreground">{getCardinalDirection(heading)}</span>
                      </p>
                    </div>
                  </div>

                  {/* Simulation Mode Toggle Button */}
                  <div>
                    <Button 
                      size="sm" 
                      variant={isSimulatingDrive ? "destructive" : "outline"} 
                      className="w-full text-xs font-semibold cursor-pointer flex items-center justify-center gap-1.5"
                      onClick={() => setIsSimulatingDrive(!isSimulatingDrive)}
                    >
                      <Activity className="h-3.5 w-3.5" />
                      {isSimulatingDrive ? "Stop Simulation (Park Vehicle)" : "Simulate Emergency Drive (Demo)"}
                    </Button>
                  </div>

                  <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Shield className="h-5 w-5 text-blue-500" />
                      <div>
                        <p className="text-xs font-bold text-foreground">
                          {speed > 0 ? "AI Traffic Rerouting Active" : "AI Rerouting on Standby"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {speed > 0 ? "Dynamic congestion avoidance enabled" : "Awaiting vehicle departure"}
                        </p>
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
                  <div className="min-h-[280px] w-full rounded-xl overflow-hidden border border-border bg-slate-950">
                    <HospitalCapacityMesh hospitals={hospitals} />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions Grid */}
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

            {/* Recent Emergencies Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" />
                    Active Emergency Dispatches
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Current active assignments. Go to Active Cases Queue for clinical vitals & hospital handovers.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="cursor-pointer text-xs flex items-center gap-1 hover:border-primary/50"
                  onClick={() => navigate("/ambulance/cases")}
                >
                  View Full Triage Queue ({activeEmergencies.length}) →
                </Button>
              </div>
              {renderActiveCases()}
            </div>
          </>
        )}

        {/* Dedicated Active Cases & Triage Queue (/ambulance/cases) */}
        {isCasesPage && renderDedicatedCasesView()}

        {/* Dedicated Navigation Map View (/ambulance/map) */}
        {isMapPage && renderDedicatedMapView()}
      </div>
    </AppShell>
  );
};