import * as React from "react";
import { AppShell } from "../components/ierbms/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ierbms/Card";
import { Button } from "../components/ierbms/Button";
import { useAuth } from "../context/AuthContext";
import { useParams } from "react-router";
import { Save, User, Building, Activity, Lock } from "lucide-react";

export const HospitalSettings: React.FC = () => {
  const { user } = useAuth();
  const { hospitalId } = useParams<{ hospitalId: string }>();
  
  const [activeTab, setActiveTab] = React.useState<"profile" | "security" | "facility">("profile");
  const [loading, setLoading] = React.useState(false);
  const [initialFetchDone, setInitialFetchDone] = React.useState(false);

  const [profileData, setProfileData] = React.useState({ name: "", latitude: "", longitude: "" });
  const [securityData, setSecurityData] = React.useState({ email: user?.email || "", password: "", confirmPassword: "" });
  const [facilityData, setFacilityData] = React.useState({
    total_general_beds: 0, occupied_general_beds: 0,
    total_icu_beds: 0, occupied_icu_beds: 0,
    ventilators: 0, oxygenUnits: 0, mriMachines: 0, ctScanners: 0,
    specialists: ""
  });

  React.useEffect(() => {
    // Fetch static profile data directly from REST API instead of real-time stream
    const fetchHospitalData = async () => {
      try {
        const res = await fetch('/api/hospitals');
        const hospitals = await res.json();
        const me = hospitals.find((h: any) => h.id === hospitalId);
        if (me) {
          setProfileData({
            name: me.name || "",
            latitude: me.latitude || "",
            longitude: me.longitude || ""
          });
          setFacilityData({
            total_general_beds: me.total_general_beds || 0,
            occupied_general_beds: me.occupied_general_beds || 0,
            total_icu_beds: me.total_icu_beds || 0,
            occupied_icu_beds: me.occupied_icu_beds || 0,
            ventilators: me.equipment?.ventilators || 0,
            oxygenUnits: me.equipment?.oxygenUnits || 0,
            mriMachines: me.equipment?.mriMachines || 0,
            ctScanners: me.equipment?.ctScanners || 0,
            specialists: (me.specialists || []).join(", ")
          });
        }
      } catch (err) {
        console.error("Failed to fetch hospital settings", err);
      } finally {
        setInitialFetchDone(true);
      }
    };
    fetchHospitalData();
  }, [hospitalId]);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profileData.name || profileData.name.trim() === '') {
      alert("Hospital name cannot be empty.");
      return;
    }
    const numLat = parseFloat(profileData.latitude);
    const numLng = parseFloat(profileData.longitude);
    if (isNaN(numLat) || numLat < -90 || numLat > 90 || isNaN(numLng) || numLng < -180 || numLng > 180) {
      alert("Invalid geographical coordinates.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/hospitals/${hospitalId}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData)
      });
      if (!res.ok) throw new Error("Failed to save profile");
      alert("Profile updated successfully!");
    } catch (err) {
      alert("Error saving profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSecuritySave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (securityData.password && securityData.password !== securityData.confirmPassword) {
      alert("Passwords do not match!");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        email: securityData.email,
        ...(securityData.password ? { password: securityData.password } : {})
      };
      // user.id would be ideal here if it's available in context, else we might need an endpoint based on JWT
      // Assuming user object has id
      if (!user?.id) throw new Error("User ID not found in context");
      const res = await fetch(`/api/auth/account/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Failed to save security settings");
      alert("Account security updated successfully!");
      setSecurityData(prev => ({ ...prev, password: "", confirmPassword: "" }));
    } catch (err) {
      alert("Error saving security settings");
    } finally {
      setLoading(false);
    }
  };

  const handleFacilitySave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (facilityData.total_general_beds < 0 || facilityData.occupied_general_beds < 0 ||
        facilityData.total_icu_beds < 0 || facilityData.occupied_icu_beds < 0) {
      alert("Bed counts cannot be negative.");
      return;
    }
    if (facilityData.occupied_general_beds > facilityData.total_general_beds) {
      alert("Occupied general beds cannot exceed total general beds.");
      return;
    }
    if (facilityData.occupied_icu_beds > facilityData.total_icu_beds) {
      alert("Occupied ICU beds cannot exceed total ICU beds.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...facilityData,
        specialists: facilityData.specialists.split(',').map(s => s.trim()).filter(Boolean),
        equipment: {
          ventilators: facilityData.ventilators,
          oxygenUnits: facilityData.oxygenUnits,
          mriMachines: facilityData.mriMachines,
          ctScanners: facilityData.ctScanners,
        }
      };
      const res = await fetch(`/api/hospitals/${hospitalId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Failed to save facility settings");
      alert("Facility capabilities updated successfully!");
    } catch (err) {
      alert("Error saving facility settings");
    } finally {
      setLoading(false);
    }
  };

  if (!initialFetchDone) {
    return (
      <AppShell role="hospital" userName={user?.email || "Admin"}>
        <div className="flex h-[80vh] items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell role="hospital" userName={profileData.name || user?.email || "Admin"}>
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
          <p className="text-muted-foreground mt-2">
            Manage your hospital's profile, user account security, and facility configuration.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar Tabs */}
          <div className="w-full md:w-64 space-y-1 shrink-0">
            <button
              onClick={() => setActiveTab("profile")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${activeTab === 'profile' ? 'bg-[var(--primary)] text-white' : 'hover:bg-accent hover:text-accent-foreground text-foreground'}`}
            >
              <Building className="h-5 w-5" />
              Hospital Profile
            </button>
            <button
              onClick={() => setActiveTab("security")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${activeTab === 'security' ? 'bg-[var(--primary)] text-white' : 'hover:bg-accent hover:text-accent-foreground text-foreground'}`}
            >
              <Lock className="h-5 w-5" />
              Account & Security
            </button>
            <button
              onClick={() => setActiveTab("facility")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${activeTab === 'facility' ? 'bg-[var(--primary)] text-white' : 'hover:bg-accent hover:text-accent-foreground text-foreground'}`}
            >
              <Activity className="h-5 w-5" />
              Facility Config
            </button>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {activeTab === "profile" && (
              <Card>
                <CardHeader>
                  <CardTitle>Hospital Profile</CardTitle>
                  <CardDescription>Update your facility's static identity and location information.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleProfileSave} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Hospital Name</label>
                      <input 
                        type="text" 
                        value={profileData.name} 
                        onChange={e => setProfileData(p => ({ ...p, name: e.target.value }))}
                        className="w-full px-3 py-2 border rounded-md bg-background" 
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Latitude</label>
                        <input 
                          type="text" 
                          value={profileData.latitude} 
                          onChange={e => setProfileData(p => ({ ...p, latitude: e.target.value }))}
                          className="w-full px-3 py-2 border rounded-md bg-background" 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Longitude</label>
                        <input 
                          type="text" 
                          value={profileData.longitude} 
                          onChange={e => setProfileData(p => ({ ...p, longitude: e.target.value }))}
                          className="w-full px-3 py-2 border rounded-md bg-background" 
                        />
                      </div>
                    </div>
                    <Button type="submit" variant="primary" disabled={loading} className="w-full sm:w-auto mt-4">
                      {loading ? "Saving..." : "Save Profile"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            {activeTab === "security" && (
              <Card>
                <CardHeader>
                  <CardTitle>Account & Security</CardTitle>
                  <CardDescription>Manage the administrative login credentials for this hospital portal.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSecuritySave} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Login Email</label>
                      <input 
                        type="email" 
                        value={securityData.email} 
                        onChange={e => setSecurityData(p => ({ ...p, email: e.target.value }))}
                        className="w-full px-3 py-2 border rounded-md bg-background" 
                        required
                      />
                    </div>
                    <div className="border-t pt-4 mt-4">
                      <h4 className="font-medium mb-4">Change Password</h4>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">New Password (leave blank to keep current)</label>
                          <input 
                            type="password" 
                            value={securityData.password} 
                            onChange={e => setSecurityData(p => ({ ...p, password: e.target.value }))}
                            className="w-full px-3 py-2 border rounded-md bg-background" 
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Confirm New Password</label>
                          <input 
                            type="password" 
                            value={securityData.confirmPassword} 
                            onChange={e => setSecurityData(p => ({ ...p, confirmPassword: e.target.value }))}
                            className="w-full px-3 py-2 border rounded-md bg-background" 
                          />
                        </div>
                      </div>
                    </div>
                    <Button type="submit" variant="primary" disabled={loading} className="w-full sm:w-auto mt-4">
                      {loading ? "Updating Security..." : "Save Security Settings"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            {activeTab === "facility" && (
              <Card>
                <CardHeader>
                  <CardTitle>Facility Configuration</CardTitle>
                  <CardDescription>Update dynamic capacity and equipment information.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleFacilitySave} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h3 className="font-semibold border-b pb-2">General Wards</h3>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Total General Beds</label>
                          <input type="number" value={facilityData.total_general_beds} onChange={e => setFacilityData(p => ({...p, total_general_beds: parseInt(e.target.value) || 0}))} className="w-full px-3 py-2 border rounded-md bg-background" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Occupied General Beds</label>
                          <input type="number" value={facilityData.occupied_general_beds} onChange={e => setFacilityData(p => ({...p, occupied_general_beds: parseInt(e.target.value) || 0}))} className="w-full px-3 py-2 border rounded-md bg-background" />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h3 className="font-semibold border-b pb-2">Intensive Care Unit</h3>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Total ICU Beds</label>
                          <input type="number" value={facilityData.total_icu_beds} onChange={e => setFacilityData(p => ({...p, total_icu_beds: parseInt(e.target.value) || 0}))} className="w-full px-3 py-2 border rounded-md bg-background" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Occupied ICU Beds</label>
                          <input type="number" value={facilityData.occupied_icu_beds} onChange={e => setFacilityData(p => ({...p, occupied_icu_beds: parseInt(e.target.value) || 0}))} className="w-full px-3 py-2 border rounded-md bg-background" />
                        </div>
                      </div>

                      <div className="space-y-4 md:col-span-2">
                        <h3 className="font-semibold border-b pb-2">Critical Equipment Inventory</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="space-y-2"><label className="text-sm font-medium">Ventilators</label><input type="number" value={facilityData.ventilators} onChange={e => setFacilityData(p => ({...p, ventilators: parseInt(e.target.value) || 0}))} className="w-full px-3 py-2 border rounded-md bg-background" /></div>
                          <div className="space-y-2"><label className="text-sm font-medium">Oxygen Units</label><input type="number" value={facilityData.oxygenUnits} onChange={e => setFacilityData(p => ({...p, oxygenUnits: parseInt(e.target.value) || 0}))} className="w-full px-3 py-2 border rounded-md bg-background" /></div>
                          <div className="space-y-2"><label className="text-sm font-medium">MRI Machines</label><input type="number" value={facilityData.mriMachines} onChange={e => setFacilityData(p => ({...p, mriMachines: parseInt(e.target.value) || 0}))} className="w-full px-3 py-2 border rounded-md bg-background" /></div>
                          <div className="space-y-2"><label className="text-sm font-medium">CT Scanners</label><input type="number" value={facilityData.ctScanners} onChange={e => setFacilityData(p => ({...p, ctScanners: parseInt(e.target.value) || 0}))} className="w-full px-3 py-2 border rounded-md bg-background" /></div>
                        </div>
                      </div>

                      <div className="space-y-4 md:col-span-2">
                        <h3 className="font-semibold border-b pb-2">Available Specialists</h3>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-muted-foreground">Comma-separated list</label>
                          <input type="text" value={facilityData.specialists} onChange={e => setFacilityData(p => ({...p, specialists: e.target.value}))} className="w-full px-3 py-2 border rounded-md bg-background" />
                        </div>
                      </div>
                    </div>
                    
                    <Button type="submit" variant="primary" disabled={loading} className="mt-6">
                      {loading ? "Saving..." : "Save Facility Config"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
};
