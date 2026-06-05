import * as React from "react";
import { useNavigate, useSearchParams } from "react-router";
import { AppShell } from "../components/ierbms/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ierbms/Card";
import { Button } from "../components/ierbms/Button";
import { Input } from "../components/ierbms/Input";
import { StatusBadge } from "../components/ierbms/StatusBadge";
import { MapPin, User, Activity, AlertCircle, Hospital, CheckCircle } from "lucide-react";
import { useRealTime } from "../components/ierbms/RealTimeProvider";
import { type Hospital as UIHospital } from "../../utils/mockData";

export const NewEmergency: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const ambulanceIdParam = searchParams.get("ambulanceId");
  const { hospitals, ambulances } = useRealTime();
  const [error, setError] = React.useState<string | null>(null);
  
  const [formData, setFormData] = React.useState({
    patientName: "",
    emergencyType: "",
    severity: "moderate" as "critical" | "moderate" | "stable",
    location: "5.6037,-0.1870", // Defaulting to a lat,lng for simplicity in demo
    heartRate: "",
    bloodPressure: "",
    oxygenSaturation: "",
    temperature: "",
  });

  const [showRecommendations, setShowRecommendations] = React.useState(false);
  const [recommendedHospitals, setRecommendedHospitals] = React.useState<(UIHospital & { score: number, distance_estimate: number })[]>([]);
  const [loading, setLoading] = React.useState(false);

  const ambulanceExists = ambulances.some(a => a.id === ambulanceIdParam);
  const selectedAmbulanceId = (ambulanceIdParam && ambulanceExists) 
    ? ambulanceIdParam 
    : (ambulances.length > 0 ? ambulances[0].id : "");
  const currentAmbulance = ambulances.find(a => a.id === selectedAmbulanceId);

  React.useEffect(() => {
    if (currentAmbulance && currentAmbulance.location && formData.location === "5.6037,-0.1870") {
      setFormData(prev => ({
        ...prev,
        location: `${currentAmbulance.location.lat.toFixed(6)},${currentAmbulance.location.lng.toFixed(6)}`
      }));
    }
  }, [currentAmbulance, formData.location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const [lat, lng] = formData.location.split(',').map(Number);
      
      const payload = {
        ambulance_id: selectedAmbulanceId || "AMB-DEMO",
        latitude: lat || 5.6037,
        longitude: lng || -0.1870,
        trauma_level: formData.severity === "critical" ? 5 : formData.severity === "moderate" ? 3 : 1,
        hospitals: hospitals.map(h => ({
          id: h.id,
          latitude: h.location.lat,
          longitude: h.location.lng,
          occupied_general_beds: h.totalBeds - h.availableBeds,
          total_general_beds: h.totalBeds,
          occupied_icu_beds: h.icuBeds.total - h.icuBeds.available,
          total_icu_beds: h.icuBeds.total
        }))
      };

      const res = await fetch('/ml-api/predict/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      
      if (data.recommended_hospitals) {
        // Merge AI score/distance with the full hospital info
        const recs = data.recommended_hospitals.map((rec: any) => {
          const h = hospitals.find(h => h.id === rec.hospital_id);
          return h ? { ...h, score: rec.score, distance_estimate: rec.distance_estimate } : null;
        }).filter(Boolean);
        
        setRecommendedHospitals(recs);
      }
      setShowRecommendations(true);
    } catch (err) {
      console.error("Error fetching AI recommendations:", err);
      setError("Error getting AI hospital recommendation. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmHospital = async (hospitalId: string) => {
    setError(null);
    try {
      const [lat, lng] = formData.location.split(',').map(Number);
      const vitals = {
        heartRate: formData.heartRate,
        bloodPressure: formData.bloodPressure,
        oxygenSaturation: formData.oxygenSaturation,
        temperature: formData.temperature,
        latitude: lat || 5.6037,
        longitude: lng || -0.1870,
        address: `Emergency Site (${(lat || 5.6037).toFixed(4)}, ${(lng || -0.1870).toFixed(4)})`
      };

      const res = await fetch('/api/ambulances/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ambulance_id: selectedAmbulanceId,
          assigned_hospital_id: hospitalId,
          patient_identifier: formData.patientName,
          trauma_level: formData.severity === "critical" ? 5 : formData.severity === "moderate" ? 3 : 1,
          patient_vitals: vitals,
          status: 'in-transit'
        })
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(errorData.error || `HTTP ${res.status}`);
      }
      
      const createdCase = await res.json();
      navigate(`/ambulance?caseId=${createdCase.id}&showOverlay=true`);
    } catch (err: any) {
      console.error("Error saving case to backend:", err);
      setError(err.message || "Failed to save emergency case");
    }
  };

  return (
    <AppShell role="ambulance" userName="Samuel Osei">
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">New Emergency</h1>
          <p className="text-muted-foreground">
            Enter patient information to receive AI-powered hospital recommendations
          </p>
        </div>

        {error && (
          <Card className="border-[var(--danger)] bg-[var(--danger)]/10 text-[var(--danger)]">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-red-500">Database / Telemetry Error</h4>
                <p className="text-sm text-red-400">{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {!showRecommendations ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Patient Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Patient Information
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

                <div>
                  <label className="block text-sm font-medium mb-2">Emergency Type</label>
                  <select
                    className="flex h-10 w-full rounded-lg border border-input bg-input-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all"
                    value={formData.emergencyType}
                    onChange={(e) => setFormData({ ...formData, emergencyType: e.target.value })}
                    required
                  >
                    <option value="">Select emergency type</option>
                    <option value="Cardiac Arrest">Cardiac Arrest</option>
                    <option value="Road Traffic Accident">Road Traffic Accident</option>
                    <option value="Stroke">Stroke</option>
                    <option value="Respiratory Distress">Respiratory Distress</option>
                    <option value="Trauma">Trauma</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Severity Level</label>
                  <div className="flex gap-3">
                    {(["stable", "moderate", "critical"] as const).map((severity) => (
                      <button
                        key={severity}
                        type="button"
                        onClick={() => setFormData({ ...formData, severity })}
                        className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                          formData.severity === severity
                            ? "border-[var(--primary)] bg-[var(--accent)]"
                            : "border-border hover:border-[var(--primary)]/50"
                        }`}
                      >
                        <StatusBadge status={severity} className="mx-auto">
                          {severity.toUpperCase()}
                        </StatusBadge>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Location (Lat,Lng)</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="e.g. 5.6037,-0.1870"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Vital Signs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Vital Signs
                </CardTitle>
                <CardDescription>Enter current patient vital signs</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Heart Rate (bpm)</label>
                    <Input
                      type="number"
                      placeholder="e.g., 80"
                      value={formData.heartRate}
                      onChange={(e) => setFormData({ ...formData, heartRate: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Blood Pressure</label>
                    <Input
                      placeholder="e.g., 120/80"
                      value={formData.bloodPressure}
                      onChange={(e) => setFormData({ ...formData, bloodPressure: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Oxygen Saturation (%)</label>
                    <Input
                      type="number"
                      placeholder="e.g., 98"
                      value={formData.oxygenSaturation}
                      onChange={(e) => setFormData({ ...formData, oxygenSaturation: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Temperature (°C)</label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="e.g., 37.0"
                      value={formData.temperature}
                      onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => navigate("/ambulance")}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" className="flex-1" disabled={loading}>
                <AlertCircle className="h-4 w-4" />
                {loading ? "Analyzing..." : "Get Hospital Recommendations"}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-6">
            {/* Success Alert */}
            <Card className="border-[var(--success)] bg-[var(--success)]/10">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-[var(--success)]" />
                  <div className="flex-1">
                    <h4 className="font-semibold">Emergency Case Analyzed</h4>
                    <p className="text-sm text-muted-foreground">
                      AI analysis complete. Here are the recommended hospitals based on patient condition and availability.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recommended Hospitals */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Hospital className="h-5 w-5" />
                  Recommended Hospitals
                </CardTitle>
                <CardDescription>
                  Ranked by ML Engine based on severity, distance, bed availability, and specialist availability
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recommendedHospitals.map((hospital, idx) => (
                    <div
                      key={hospital.id}
                      className={`p-6 border-2 rounded-lg transition-all ${
                        idx === 0
                          ? "border-[var(--success)] bg-[var(--success)]/5"
                          : "border-border hover:border-[var(--primary)]"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            {idx === 0 && (
                              <span className="inline-flex items-center justify-center h-6 w-6 bg-[var(--success)] text-white rounded-full text-xs font-bold">
                                ✓
                              </span>
                            )}
                            <h3 className="text-xl font-semibold">{hospital.name}</h3>
                          </div>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {hospital.location.address} • {hospital.distance_estimate.toFixed(2)} units away
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-bold text-[var(--primary)]">{hospital.score}</div>
                          <p className="text-xs text-muted-foreground">AI Match Score</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-3 mb-4">
                        <div className="text-center p-3 bg-muted rounded-lg">
                          <p className="text-lg font-semibold">{hospital.availableBeds}</p>
                          <p className="text-xs text-muted-foreground">Available Beds</p>
                        </div>
                        <div className="text-center p-3 bg-muted rounded-lg">
                          <p className="text-lg font-semibold">{hospital.icuBeds.available}</p>
                          <p className="text-xs text-muted-foreground">ICU Beds</p>
                        </div>
                        <div className="text-center p-3 bg-muted rounded-lg">
                          <p className="text-lg font-semibold">{hospital.specialists.length}</p>
                          <p className="text-xs text-muted-foreground">Specialists</p>
                        </div>
                        <div className="text-center p-3 bg-muted rounded-lg">
                          <p className="text-lg font-semibold">{Math.round(hospital.distance_estimate * 1.5)}</p>
                          <p className="text-xs text-muted-foreground">ETA (min)</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-4">
                        {hospital.specialists.map((specialist, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center px-3 py-1 rounded-full bg-[var(--accent)] text-xs"
                          >
                            {specialist}
                          </span>
                        ))}
                      </div>

                      {idx === 0 && (
                        <Button
                          variant="success"
                          className="w-full"
                          onClick={() => handleConfirmHospital(hospital.id)}
                        >
                          <CheckCircle className="h-4 w-4" />
                          Confirm & Navigate to Hospital
                        </Button>
                      )}
                      {idx > 0 && (
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => handleConfirmHospital(hospital.id)}
                        >
                          Select This Hospital
                        </Button>
                      )}
                    </div>
                  ))}
                  {recommendedHospitals.length === 0 && (
                    <p className="text-muted-foreground">No hospitals found matching the criteria.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowRecommendations(false)}
              >
                Back to Form
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                onClick={() => navigate("/ambulance")}
              >
                Return to Dashboard
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
};
