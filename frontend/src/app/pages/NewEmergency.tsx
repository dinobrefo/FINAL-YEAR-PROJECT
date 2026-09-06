import * as React from "react";
import { AppShell } from "../components/ierbms/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ierbms/Card";
import { Button } from "../components/ierbms/Button";
import { Input } from "../components/ui/input";
import { StatusBadge } from "../components/ierbms/StatusBadge";
import { User, Activity, MapPin, Hospital, AlertCircle, Heart, Thermometer, ShieldAlert, Check, LocateFixed, WifiOff, RefreshCw } from "lucide-react";
import { useRealTime } from "../components/ierbms/RealTimeProvider";
import { useNavigate, useSearchParams } from "react-router";
import { offlineQueue } from "../utils/offlineQueue";
import { audioTelemetry } from "../utils/audioTelemetry";
import { calculateTEWS, MobilityStatus, AvpuStatus } from "../utils/tewsCalculator";

// Mathematical Haversine Geodesic Distance (km)
export const computeHaversineKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371.0;
  const dLat = ((lat2 - lat1) * Math.PI) / 180.0;
  const dLon = ((lon2 - lon1) * Math.PI) / 180.0;
  const a =
    Math.sin(dLat / 2.0) * Math.sin(dLat / 2.0) +
    Math.cos((lat1 * Math.PI) / 180.0) *
      Math.cos((lat2 * Math.PI) / 180.0) *
      Math.sin(dLon / 2.0) *
      Math.sin(dLon / 2.0);
  const c = 2.0 * Math.atan2(Math.sqrt(a), Math.sqrt(1.0 - a));
  return R * c;
};

export const getDetectedRegionName = (locStr: string): string => {
  const [lat, lng] = locStr.split(',').map(s => parseFloat(s.trim()));
  if (!lat || !lng || isNaN(lat) || isNaN(lng)) return "Ghana Emergency Grid";
  if (lat >= 6.4 && lat <= 7.2 && lng >= -2.0 && lng <= -1.2) return "Ashanti Region (Kumasi Metro)";
  if (lat >= 5.3 && lat <= 6.0 && lng >= -0.5 && lng <= 0.2) return "Greater Accra Region (Accra Metro)";
  if (lat >= 4.8 && lat <= 5.5 && lng >= -2.5 && lng <= -1.0) return "Central & Western Coastal Region";
  if (lat >= 9.0) return "Northern Region (Tamale Metro)";
  if (lat >= 6.8 && lng <= -2.0) return "Bono Region (Sunyani Metro)";
  if (lat >= 6.0 && lat <= 7.2 && lng >= 0.0) return "Volta Region (Ho Metro)";
  return "Ghana Healthcare Network";
};

export const NewEmergency: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedAmbulanceId = searchParams.get("ambulanceId") || "AMB-DEMO";
  const { hospitals } = useRealTime();

  const [formData, setFormData] = React.useState({
    patientName: "",
    age: "",
    gender: "male",
    emergencyType: "Severe Trauma / Accident",
    severity: "critical",
    location: "6.6885, -1.6244",
    heartRate: "118",
    bloodPressure: "140/90",
    oxygenSaturation: "93",
    temperature: "37.5",
    respiratoryRate: "24",
    mobility: "stretcher" as MobilityStatus,
    avpu: "A" as AvpuStatus,
  });

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [offlineNotice, setOfflineNotice] = React.useState<string | null>(null);
  const [gpsDetecting, setGpsDetecting] = React.useState(false);
  const [recommendedHospitals, setRecommendedHospitals] = React.useState<any[]>([]);
  const [showRecommendations, setShowRecommendations] = React.useState(false);
  const [pendingOfflineCount, setPendingOfflineCount] = React.useState(0);

  // Auto-detect user's physical GPS location & check offline queue on mount
  React.useEffect(() => {
    detectUserGPS();
    checkOfflineQueue();

    const handleOnline = async () => {
      const synced = await offlineQueue.syncPendingItems();
      if (synced > 0) {
        audioTelemetry.speak(`Online. ${synced} queued emergency intakes synced successfully.`);
        setOfflineNotice(`Synced ${synced} offline emergency intakes to central DB.`);
        setTimeout(() => setOfflineNotice(null), 5000);
      }
      checkOfflineQueue();
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  const checkOfflineQueue = () => {
    setPendingOfflineCount(offlineQueue.getQueue().length);
  };

  const detectUserGPS = () => {
    if ("geolocation" in navigator) {
      setGpsDetecting(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude.toFixed(6);
          const lng = position.coords.longitude.toFixed(6);
          setFormData((prev) => ({
            ...prev,
            location: `${lat}, ${lng}`,
          }));
          setGpsDetecting(false);
        },
        (err) => {
          console.warn("GPS auto-detect fallback:", err);
          setGpsDetecting(false);
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    }
  };

  // GHS adapted SATS TEWS Clinical Calculation
  const tewsResult = React.useMemo(() => {
    const sbp = parseInt(formData.bloodPressure.split('/')[0]) || 120;
    const hasTrauma = formData.emergencyType.toLowerCase().includes('trauma') || formData.emergencyType.toLowerCase().includes('accident');
    return calculateTEWS({
      heartRate: formData.heartRate,
      systolicBp: sbp,
      respiratoryRate: formData.respiratoryRate,
      temperature: formData.temperature,
      oxygenSaturation: formData.oxygenSaturation,
      mobility: formData.mobility,
      avpu: formData.avpu,
      hasTrauma,
    });
  }, [formData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    const [userLat, userLng] = formData.location.split(',').map(Number);
    const originLat = userLat || 6.6885;
    const originLng = userLng || -1.6244;
    const isCritical = tewsResult.traumaLevel >= 4;

    // 1. Intelligent Candidate Spatial Pre-filtering:
    // Rank all hospitals by geographic proximity to the patient so we don't route patients 200+ km away
    // and keep the payload within optimal OSRM routing limits (<30 facilities).
    const candidateHospitalsWithDistance = hospitals.map(h => ({
      hospital: h,
      distKm: computeHaversineKm(originLat, originLng, h.location.lat, h.location.lng)
    }));
    candidateHospitalsWithDistance.sort((a, b) => a.distKm - b.distKm);

    // Prioritize reachable facilities within the clinical Golden Hour boundary (<= 60 km)
    const localCandidates = candidateHospitalsWithDistance.filter(c => c.distKm <= 60);
    const focusedCandidates = (localCandidates.length >= 4 ? localCandidates : candidateHospitalsWithDistance)
      .slice(0, 25)
      .map(c => c.hospital);

    try {
      const payload = {
        ambulance_id: selectedAmbulanceId || "AMB-DEMO",
        latitude: originLat,
        longitude: originLng,
        trauma_level: tewsResult.traumaLevel,
        emergency_type: formData.emergencyType,
        hospitals: focusedCandidates.map(h => ({
          id: h.id,
          latitude: h.location.lat,
          longitude: h.location.lng,
          occupied_general_beds: h.totalBeds - h.availableBeds,
          total_general_beds: h.totalBeds,
          occupied_icu_beds: h.icuBeds.total - h.icuBeds.available,
          total_icu_beds: h.icuBeds.total,
          specialists: h.specialists,
          equipment: h.equipment
        }))
      };

      const res = await fetch('/ml-api/predict/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      
      if (data.recommended_hospitals && data.recommended_hospitals.length > 0) {
        const recs = data.recommended_hospitals.map((rec: any) => {
          const h = hospitals.find(h => h.id === rec.hospital_id);
          const normalizedScore = Math.max(0, Math.min(100, Math.round(rec.score ?? 85)));
          return h ? { ...h, score: normalizedScore, distance_estimate: rec.distance_estimate } : null;
        }).filter(Boolean);
        
        // Priority 1: Reachable hospitals in current geographic cluster (score > 0 and distance <= 60km)
        const localRecs = recs.filter((r: any) => r.score > 0 && (r.distance_estimate == null || r.distance_estimate <= 60));
        // Priority 2: If none within 60km, take the closest facilities
        const finalRecs = localRecs.length > 0 ? localRecs : recs.slice(0, 4);
        setRecommendedHospitals(finalRecs);
      } else {
        throw new Error("Empty recommendation payload");
      }
      setShowRecommendations(true);
      audioTelemetry.speak("AI hospital rankings generated.");
    } catch (err) {
      console.warn("ML Engine offline fallback activated:", err);
      // High-accuracy Client-side Geodesic Multi-Criteria Ranking Fallback
      const scoredList = focusedCandidates.map(h => {
        const distKm = computeHaversineKm(originLat, originLng, h.location.lat, h.location.lng);
        const availIcu = h.icuBeds?.available ?? 0;
        const availGen = h.availableBeds ?? 0;
        
        // 1. Proximity score (35%)
        const sDist = distKm <= 60 ? Math.max(10, 100 * (1 - distKm / 60)) : Math.max(5, 30 * (1 - (distKm - 60) / 140));
        // 2. Capacity score (35%)
        const sCap = isCritical
          ? (availIcu <= 0 ? 0 : Math.min(100, 50 + availIcu * 10))
          : (availGen <= 0 ? 0 : Math.min(100, 50 + availGen * 1.5));
        // 3. Clinical readiness (30%)
        const specMatch = h.specialists && h.specialists.length > 0;
        const sRes = specMatch ? 90 : 60;
        
        let score = 0;
        if (sCap > 0) {
          const distScale = distKm <= 60 ? 1.0 : Math.max(0.25, 1 - (distKm - 60) / 80);
          score = Math.round(((sDist * 0.35) + (sCap * 0.35) + (sRes * 0.30)) * distScale);
          score = Math.max(15, Math.min(99, score));
        }

        return {
          ...h,
          score,
          distance_estimate: Math.round(distKm * 100) / 100
        };
      });

      scoredList.sort((a, b) => {
        if ((a.score > 0) !== (b.score > 0)) return a.score > 0 ? -1 : 1;
        if (a.score !== b.score) return b.score - a.score;
        return (a.distance_estimate || 0) - (b.distance_estimate || 0);
      });

      const localOnly = scoredList.filter(h => h.score > 0 && (h.distance_estimate || 0) <= 60);
      setRecommendedHospitals(localOnly.length > 0 ? localOnly : scoredList.slice(0, 4));
      setShowRecommendations(true);
      audioTelemetry.speak("Geodesic hospital rankings generated.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmHospital = async (hospitalId: string) => {
    setError(null);
    const vitals = {
      heartRate: formData.heartRate,
      bloodPressure: formData.bloodPressure,
      oxygenSaturation: formData.oxygenSaturation,
      temperature: formData.temperature,
    };

    const casePayload = {
      ambulance_id: selectedAmbulanceId,
      assigned_hospital_id: hospitalId,
      patient_identifier: formData.patientName,
      trauma_level: tewsResult.traumaLevel,
      emergency_type: formData.emergencyType,
      bed_type_assigned: tewsResult.traumaLevel >= 4 ? "icu" : "general",
      patient_vitals: {
        ...vitals,
        respiratoryRate: formData.respiratoryRate,
        tewsScore: tewsResult.tewsScore,
        triageColor: tewsResult.triageColor
      },
      triage_notes: `GHS/SATS TEWS: ${tewsResult.tewsScore} (${tewsResult.triageName}). Response Target: ${tewsResult.targetResponseTime}. Clinical Action: ${tewsResult.clinicalAction}`,
      status: 'in-transit'
    };

    try {
      const res = await fetch('/api/ambulances/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(casePayload)
      });
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      
      const createdCase = await res.json();
      audioTelemetry.speak(`Emergency registered. Launching 3D cockpit HUD.`);
      navigate(`/ambulance?caseId=${createdCase.id}&showOverlay=true`);
    } catch (err: any) {
      console.warn("Server unavailable. Enqueuing emergency intake into offline storage:", err);
      const offlineItem = offlineQueue.enqueue(casePayload);
      checkOfflineQueue();
      audioTelemetry.speak("Offline mode active. Emergency intake saved locally to device queue.");
      setOfflineNotice("Network/Server offline. Emergency intake saved to local device queue and will auto-sync.");
      navigate(`/ambulance?caseId=${offlineItem.id}&showOverlay=true`);
    }
  };

  return (
    <AppShell role="ambulance" userName="Paramedic Team Unit #1">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">New Emergency Intake</h1>
            <p className="text-muted-foreground">
              Enter patient telemetry to compute AI hospital matching scores & 3D route dispatches
            </p>
          </div>
          {pendingOfflineCount > 0 && (
            <div className="px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/30 text-xs font-bold flex items-center gap-2">
              <WifiOff className="h-4 w-4" />
              {pendingOfflineCount} Queued Offline
            </div>
          )}
        </div>

        {offlineNotice && (
          <Card className="border-amber-500/40 bg-amber-500/10 text-amber-400">
            <CardContent className="p-4 flex items-center gap-3">
              <RefreshCw className="h-5 w-5 flex-shrink-0 animate-spin text-amber-400" />
              <p className="text-sm font-semibold">{offlineNotice}</p>
            </CardContent>
          </Card>
        )}

        {error && (
          <Card className="border-red-500/40 bg-red-500/10 text-red-500">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-red-500">Telemetry & Registration Error</h4>
                <p className="text-sm text-red-400">{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {!showRecommendations ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-500" />
                  Patient Information & Live GPS
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Patient Name</label>
                  <Input
                    placeholder="Enter patient name"
                    value={formData.patientName}
                    onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Age</label>
                    <Input
                      type="number"
                      placeholder="Age"
                      value={formData.age}
                      onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Gender</label>
                    <select
                      className="w-full p-2.5 border rounded-lg bg-background text-foreground text-sm cursor-pointer"
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Emergency Type</label>
                  <select
                    className="w-full p-2.5 border rounded-lg bg-background text-foreground text-sm cursor-pointer"
                    value={formData.emergencyType}
                    onChange={(e) => setFormData({ ...formData, emergencyType: e.target.value })}
                  >
                    <option value="Cardiac Arrest">Cardiac Arrest</option>
                    <option value="Stroke / Neurological">Stroke / Neurological</option>
                    <option value="Severe Trauma / Accident">Severe Trauma / Accident</option>
                    <option value="Respiratory Distress">Respiratory Distress</option>
                    <option value="Obstetric Emergency">Obstetric Emergency</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Severity Level</label>
                  <select
                    className="w-full p-2.5 border rounded-lg bg-background text-foreground text-sm cursor-pointer"
                    value={formData.severity}
                    onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                  >
                    <option value="critical">Critical (Priority Red - Immediate)</option>
                    <option value="moderate">Moderate (Priority Yellow - Urgent)</option>
                    <option value="stable">Stable (Priority Green - Standard)</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <label className="block text-sm font-medium">GPS Coordinates</label>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">
                        {getDetectedRegionName(formData.location)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={detectUserGPS}
                      disabled={gpsDetecting}
                      className="text-xs text-blue-500 hover:text-blue-400 flex items-center gap-1 font-semibold cursor-pointer disabled:opacity-50"
                    >
                      <LocateFixed className="h-3.5 w-3.5" />
                      {gpsDetecting ? "Detecting GPS..." : "Auto-Detect My GPS"}
                    </button>
                  </div>
                  <Input
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="6.6885, -1.6244"
                    required
                  />

                  {/* Quick Select Presets */}
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="text-muted-foreground font-medium mr-1">Quick Presets:</span>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, location: "6.6885, -1.6244" }))}
                      className={`px-2.5 py-1 rounded-md border text-xs font-semibold cursor-pointer transition-all ${
                        formData.location.includes("6.6885")
                          ? "bg-blue-500/20 border-blue-500 text-blue-400"
                          : "bg-muted/40 border-border hover:border-muted-foreground/50 text-foreground"
                      }`}
                    >
                      📍 KNUST (Kumasi)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, location: "6.6961, -1.6284" }))}
                      className={`px-2.5 py-1 rounded-md border text-xs font-semibold cursor-pointer transition-all ${
                        formData.location.includes("6.6961")
                          ? "bg-blue-500/20 border-blue-500 text-blue-400"
                          : "bg-muted/40 border-border hover:border-muted-foreground/50 text-foreground"
                      }`}
                    >
                      🏙️ Kejetia (Kumasi)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, location: "5.5600, -0.2050" }))}
                      className={`px-2.5 py-1 rounded-md border text-xs font-semibold cursor-pointer transition-all ${
                        formData.location.includes("5.5600")
                          ? "bg-blue-500/20 border-blue-500 text-blue-400"
                          : "bg-muted/40 border-border hover:border-muted-foreground/50 text-foreground"
                      }`}
                    >
                      🇬🇭 Accra Circle
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, location: "5.5850, -0.1950" }))}
                      className={`px-2.5 py-1 rounded-md border text-xs font-semibold cursor-pointer transition-all ${
                        formData.location.includes("5.5850")
                          ? "bg-blue-500/20 border-blue-500 text-blue-400"
                          : "bg-muted/40 border-border hover:border-muted-foreground/50 text-foreground"
                      }`}
                    >
                      🏥 Accra Ridge
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Vital Signs Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-red-500" />
                    Live Vital Signs Telemetry
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    GHS SATS Compatible
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1 flex items-center gap-1">
                      <Heart className="h-3.5 w-3.5 text-red-500" /> Pulse / HR (bpm)
                    </label>
                    <Input
                      value={formData.heartRate}
                      onChange={(e) => setFormData({ ...formData, heartRate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1 flex items-center gap-1">
                      <Activity className="h-3.5 w-3.5 text-blue-500" /> Systolic BP
                    </label>
                    <Input
                      value={formData.bloodPressure}
                      onChange={(e) => setFormData({ ...formData, bloodPressure: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1 flex items-center gap-1">
                      <Activity className="h-3.5 w-3.5 text-purple-500" /> Resp. Rate (/min)
                    </label>
                    <Input
                      value={formData.respiratoryRate}
                      onChange={(e) => setFormData({ ...formData, respiratoryRate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1 flex items-center gap-1">
                      <ShieldAlert className="h-3.5 w-3.5 text-emerald-500" /> SpO2 (%)
                    </label>
                    <Input
                      value={formData.oxygenSaturation}
                      onChange={(e) => setFormData({ ...formData, oxygenSaturation: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1 flex items-center gap-1">
                      <Thermometer className="h-3.5 w-3.5 text-amber-500" /> Temp (°C)
                    </label>
                    <Input
                      value={formData.temperature}
                      onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
                      Patient Mobility
                    </label>
                    <select
                      className="w-full p-2 border rounded-lg bg-background text-foreground text-xs"
                      value={formData.mobility}
                      onChange={(e) => setFormData({ ...formData, mobility: e.target.value as MobilityStatus })}
                    >
                      <option value="walking">Walking (0)</option>
                      <option value="with_help">With Help (+1)</option>
                      <option value="stretcher">Stretcher / Immobile (+2)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-border/50">
                  <div>
                    <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
                      Consciousness (AVPU)
                    </label>
                    <select
                      className="w-full p-2 border rounded-lg bg-background text-foreground text-xs"
                      value={formData.avpu}
                      onChange={(e) => setFormData({ ...formData, avpu: e.target.value as AvpuStatus })}
                    >
                      <option value="A">Alert (A - 0)</option>
                      <option value="V">Responds to Voice (V - +1)</option>
                      <option value="P">Responds to Pain (P - +2)</option>
                      <option value="U">Unresponsive (U - Resus Red)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
                      Clinical Trauma Flag
                    </label>
                    <div className="p-2 border rounded-lg bg-muted/40 text-xs flex items-center justify-between">
                      <span>Acute Trauma / Road Injury</span>
                      <span className="font-bold text-foreground">
                        {formData.emergencyType.toLowerCase().includes('trauma') || formData.emergencyType.toLowerCase().includes('accident') ? "+1 Modifier Active" : "No Modifier (0)"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* SATS / TEWS Live Score Indicator */}
                <div className={`p-4 rounded-xl border ${
                  tewsResult.triageColor === 'red'
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                    : tewsResult.triageColor === 'orange'
                    ? 'bg-orange-500/10 border-orange-500/30 text-orange-400'
                    : tewsResult.triageColor === 'yellow'
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                }`}>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-extrabold flex items-center gap-1.5">
                        <span className={`h-3 w-3 rounded-full animate-pulse ${
                          tewsResult.triageColor === 'red' ? 'bg-rose-500' : tewsResult.triageColor === 'orange' ? 'bg-orange-500' : tewsResult.triageColor === 'yellow' ? 'bg-amber-500' : 'bg-emerald-500'
                        }`} />
                        GHS SATS TEWS: {tewsResult.tewsScore}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded font-bold uppercase tracking-wider bg-background/80 border border-current">
                        {tewsResult.triageName}
                      </span>
                    </div>
                    <span className="text-xs font-medium text-foreground bg-card/80 px-2 py-0.5 rounded border border-border">
                      Physician Response: <strong>{tewsResult.targetResponseTime}</strong>
                    </span>
                  </div>
                  <p className="text-xs opacity-90 leading-relaxed">
                    {tewsResult.clinicalAction}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Button type="submit" variant="primary" className="w-full py-3 text-sm font-bold cursor-pointer" disabled={loading}>
              {loading ? "Computing AI Hospital Rankings..." : "Calculate AI Hospital Recommendations"}
            </Button>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">AI Hospital Rankings</h2>
                <p className="text-sm text-muted-foreground">Optimal facilities ranked by bed capacity, specialist match & ETA</p>
              </div>
              <Button variant="outline" onClick={() => setShowRecommendations(false)}>
                Modify Patient Input
              </Button>
            </div>

            <div className="space-y-4">
              {recommendedHospitals.map((hospital, idx) => {
                const displayScore = Math.max(0, Math.min(100, Math.round(hospital.score ?? 85)));
                return (
                  <div
                    key={hospital.id}
                    className={`p-6 border-2 rounded-xl transition-all shadow-md ${
                      idx === 0
                        ? "border-emerald-500 bg-emerald-500/10"
                        : "border-border bg-card hover:border-primary"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {idx === 0 && (
                            <span className="inline-flex items-center justify-center h-6 w-6 bg-emerald-500 text-white rounded-full text-xs font-bold">
                              ✓
                            </span>
                          )}
                          <h3 className="text-xl font-bold text-foreground">{hospital.name}</h3>
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-red-500" />
                          {hospital.location?.address || `${hospital.name}, Ghana`} • {hospital.distance_estimate?.toFixed(2) || "3.5"} km away
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-extrabold text-blue-500">{displayScore}%</div>
                        <p className="text-xs font-semibold text-muted-foreground">AI Match Score</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-3 mb-4">
                      <div className="text-center p-3 bg-muted/60 rounded-lg border border-border/40">
                        <p className="text-lg font-bold text-foreground">{hospital.availableBeds}</p>
                        <p className="text-[10px] text-muted-foreground font-semibold">Available Beds</p>
                      </div>
                      <div className="text-center p-3 bg-muted/60 rounded-lg border border-border/40">
                        <p className="text-lg font-bold text-blue-500">{hospital.icuBeds?.available ?? 0}</p>
                        <p className="text-[10px] text-muted-foreground font-semibold">ICU Beds</p>
                      </div>
                      <div className="text-center p-3 bg-muted/60 rounded-lg border border-border/40">
                        <p className="text-lg font-bold text-foreground">{hospital.specialists?.length ?? 2}</p>
                        <p className="text-[10px] text-muted-foreground font-semibold">Specialists</p>
                      </div>
                      <div className="text-center p-3 bg-muted/60 rounded-lg border border-border/40">
                        <p className="text-lg font-bold text-emerald-500">{Math.round((hospital.distance_estimate || 3) * 1.5)} min</p>
                        <p className="text-[10px] text-muted-foreground font-semibold">ETA</p>
                      </div>
                    </div>

                    <Button
                      variant={idx === 0 ? "success" : "primary"}
                      className="w-full py-2.5 font-bold cursor-pointer flex items-center justify-center gap-2"
                      onClick={() => handleConfirmHospital(hospital.id)}
                    >
                      <Check className="h-4 w-4" />
                      Select {hospital.name} & Launch 3D Cockpit Navigation
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
};
