import * as React from "react";
import { AppShell } from "../components/ierbms/Navigation";
import { StatCard } from "../components/ierbms/StatCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ierbms/Card";
import { StatusBadge } from "../components/ierbms/StatusBadge";
import { Ambulance as AmbIcon, Hospital as HospIcon, Activity, MapPin, Users, Clock, Flame, Calendar, ArrowRight, Zap, PieChart as PieIcon, ShieldAlert, Award } from "lucide-react";
import { useRealTime } from "../components/ierbms/RealTimeProvider";
import { LiveMap } from "../components/ierbms/LiveMap";
import { useLocation, useNavigate } from "react-router";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";

import { HospitalCapacityMesh } from "../components/ierbms/HospitalCapacityMesh";

export const CommandCenterDashboard: React.FC = () => {
  const { emergencies, hospitals, ambulances } = useRealTime();
  const location = useLocation();
  const navigate = useNavigate();
  const activeEmergencies = emergencies.filter(e => e.status !== "completed");
  const availableAmbulances = ambulances.filter(a => a.status === "available");
  const totalBeds = hospitals.reduce((sum, h) => sum + h.availableBeds, 0);

  const COLORS = ["#0d9488", "#06b6d4", "#3b82f6", "#f59e0b", "#ec4899"];

  const [analyticsData, setAnalyticsData] = React.useState<any>(null);
  const [rerouteCase, setRerouteCase] = React.useState<any | null>(null);
  const [targetHospitalId, setTargetHospitalId] = React.useState("");
  const [assignAmbulanceCase, setAssignAmbulanceCase] = React.useState<any | null>(null);
  const [targetAmbulanceId, setTargetAmbulanceId] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    fetch('/api/command-center/analytics')
      .then(res => res.json())
      .then(data => setAnalyticsData(data))
      .catch(err => console.error("Error fetching analytics data:", err));
  }, []);

  const handleReroute = async () => {
    if (!rerouteCase || !targetHospitalId) return;
    setIsSubmitting(true);
    try {
      await fetch(`/api/ambulances/cases/${rerouteCase.id}/reroute`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hospital_id: targetHospitalId })
      });
      setRerouteCase(null);
    } catch (err) {
      console.error("Failed to reroute case:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignAmbulance = async () => {
    if (!assignAmbulanceCase || !targetAmbulanceId) return;
    setIsSubmitting(true);
    try {
      await fetch(`/api/ambulances/cases/${assignAmbulanceCase.id}/assign-ambulance`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ambulance_id: targetAmbulanceId })
      });
      setAssignAmbulanceCase(null);
    } catch (err) {
      console.error("Failed to assign ambulance:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolve = async (caseId: string) => {
    try {
      await fetch(`/api/ambulances/cases/${caseId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'resolved' })
      });
    } catch (err) {
      console.error("Failed to resolve case:", err);
    }
  };

  const renderActiveIncidents = () => (
    <Card className="rounded-[28px] border border-border/50 shadow-xl">
      <CardHeader className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-bold">Active Incidents & Dispatch Control</CardTitle>
            <CardDescription>Direct ambulance rerouting, diversion management, and load balancing</CardDescription>
          </div>
          <span className="px-3 py-1 bg-teal-500/15 text-teal-600 dark:text-teal-400 font-bold rounded-full text-xs">
            {activeEmergencies.length} Active Emergencies
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-6 pt-0">
        {activeEmergencies.length > 0 ? (
          <div className="divide-y divide-border/50">
            {activeEmergencies.map((emg) => {
              const assignedHosp = hospitals.find(h => h.id === emg.assignedHospital);
              const assignedAmb = ambulances.find(a => a.id === emg.ambulanceId);
              return (
                <div key={emg.id} className="py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground text-sm">{emg.patientName}</span>
                      <StatusBadge status={emg.severity}>{emg.severity.toUpperCase()}</StatusBadge>
                      <span className="text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 font-semibold">
                        {emg.emergencyType}
                      </span>
                      <span className="text-xs font-mono text-muted-foreground">
                        [{emg.status.toUpperCase()}]
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Destination: <strong className="text-foreground">{assignedHosp?.name || "Unassigned"}</strong> • Unit: <strong className="text-foreground">{assignedAmb?.plateNumber || "Pending"}</strong>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setRerouteCase(emg);
                        setTargetHospitalId(emg.assignedHospital || (hospitals[0]?.id || ""));
                      }}
                      className="px-3 py-1.5 text-xs font-bold rounded-xl border border-border hover:bg-muted text-foreground cursor-pointer transition-colors"
                    >
                      Divert / Reroute
                    </button>
                    {!emg.ambulanceId && (
                      <button
                        onClick={() => {
                          setAssignAmbulanceCase(emg);
                          setTargetAmbulanceId(availableAmbulances[0]?.id || "");
                        }}
                        className="px-3 py-1.5 text-xs font-bold rounded-xl bg-teal-600 hover:bg-teal-700 text-white cursor-pointer transition-colors"
                      >
                        Dispatch Unit
                      </button>
                    )}
                    <button
                      onClick={() => handleResolve(emg.id)}
                      className="px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-600 cursor-pointer transition-colors"
                    >
                      Resolve Case
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-center py-8 text-muted-foreground text-sm">No active emergency dispatches currently in progress.</p>
        )}
      </CardContent>
    </Card>
  );

  const currentPath = location.pathname.replace(/\/$/, "");

  const renderMap = () => (
    <Card className="rounded-[28px] border border-border/50 shadow-xl overflow-hidden">
      <CardHeader className="p-6 border-b border-border/40">
        <CardTitle className="text-lg font-bold">Live Emergency Map Telemetry</CardTitle>
        <CardDescription>Real-time tracking of ambulances and emergencies across Greater Accra</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="relative h-[650px] bg-muted overflow-hidden">
          <LiveMap 
            emergencies={emergencies}
            ambulances={ambulances}
            hospitals={hospitals}
          />
        </div>
      </CardContent>
    </Card>
  );

  const renderAmbulances = () => (
    <Card className="rounded-[28px] border border-border/50 shadow-xl">
      <CardHeader className="p-6">
        <CardTitle className="text-lg font-bold">Ambulance Fleet Status</CardTitle>
        <CardDescription>Real-time ambulance availability and active emergency assignments</CardDescription>
      </CardHeader>
      <CardContent className="p-6 pt-0">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ambulances.map((ambulance) => (
            <div
              key={ambulance.id}
              className="p-4 bg-card/80 border border-border/60 rounded-2xl shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-teal-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-teal-500/20">
                    <AmbIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-foreground">{ambulance.id.substring(0, 8)}...</p>
                    <p className="text-xs text-muted-foreground">{ambulance.plateNumber}</p>
                  </div>
                </div>
                <StatusBadge
                  status={
                    ambulance.status === "available" ? "stable" :
                    ambulance.status === "maintenance" ? "moderate" : "info"
                  }
                >
                  {ambulance.status.toUpperCase()}
                </StatusBadge>
              </div>
              {ambulance.assignedEmergency && (
                <p className="text-xs text-teal-600 dark:text-teal-400 font-semibold mt-2 pt-2 border-t border-border/40">
                  Assigned Case: {ambulance.assignedEmergency.substring(0, 8)}...
                </p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  const renderHospitals = () => (
    <Card className="rounded-[28px] border border-border/50 shadow-xl">
      <CardHeader className="p-6">
        <CardTitle className="text-lg font-bold">Hospital Network Capacity</CardTitle>
        <CardDescription>Real-time bed availability and ICU readiness across regional hospitals</CardDescription>
      </CardHeader>
      <CardContent className="p-6 pt-0">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {hospitals.map((hospital) => (
            <div
              key={hospital.id}
              className="p-4 bg-card/80 border border-border/60 rounded-2xl shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                    <HospIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-foreground truncate">{hospital.name}</p>
                    <p className="text-xs text-muted-foreground">{hospital.location?.address || 'Ghana'}</p>
                  </div>
                </div>
                <span className={`px-2.5 py-1 text-xs font-bold rounded-full text-white ${hospital.availableBeds > 5 ? 'bg-emerald-600' : hospital.availableBeds > 0 ? 'bg-amber-600' : 'bg-red-600'}`}>
                  {hospital.availableBeds} Beds
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  const renderAnalytics = () => {
    if (!analyticsData) {
      return (
        <div className="p-8 text-center text-muted-foreground bg-card border rounded-2xl animate-pulse">
          Loading system telemetry...
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="rounded-[28px] border border-border/50 shadow-xl">
          <CardHeader className="p-6">
            <CardTitle className="text-lg font-bold">Emergency Trends</CardTitle>
            <CardDescription>Monthly incident intake vs. resolution rate</CardDescription>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analyticsData.emergencyTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" />
                <YAxis stroke="var(--muted-foreground)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "16px",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="emergencies"
                  stroke="#0d9488"
                  strokeWidth={3}
                  name="Emergencies"
                />
                <Line
                  type="monotone"
                  dataKey="resolved"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  name="Resolved"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-[28px] border border-border/50 shadow-xl">
          <CardHeader className="p-6">
            <CardTitle className="text-lg font-bold">Emergency Types</CardTitle>
            <CardDescription>Distribution by medical category</CardDescription>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analyticsData.emergencyTypes}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ type, percentage }) => `${type} (${percentage}%)`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {analyticsData.emergencyTypes.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "16px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // CoachPro UI Dashboard Layout Replica (Main Content Scrolls Smoothly)
  // ---------------------------------------------------------------------------
  const renderCoachProDashboard = () => (
    <div className="space-y-6">
      {/* Top Main Section: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column (7/12 Width): Next Dispatch + Standings Table */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Card 1: Next Emergency Dispatch */}
          <div className="bg-card/90 backdrop-blur-md border border-white/60 dark:border-white/10 rounded-[28px] p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base text-foreground">Next Emergency Dispatch</h3>
              <button 
                onClick={() => navigate("/command/map")}
                className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer flex items-center gap-1"
              >
                View calendar <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground flex items-center gap-1.5 mb-6">
              <Calendar className="h-3.5 w-3.5 text-teal-500" />
              <span>GAR-0192 • 21:00, 11 November, 2026</span>
            </p>

            {/* Vs Matchup Pill Box */}
            <div className="flex items-center justify-center gap-4 sm:gap-8 bg-muted/40 dark:bg-slate-900/40 border border-border/50 rounded-2xl p-4 sm:p-6">
              {/* Left Unit */}
              <div className="flex items-center gap-3">
                <span className="font-bold text-sm text-foreground">Ambulance GAR-0192</span>
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-teal-500 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-teal-500/25">
                  <AmbIcon className="h-6 w-6" />
                </div>
              </div>

              {/* Middle VS Badge */}
              <div className="h-9 w-9 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 flex items-center justify-center text-white text-xs font-black shadow-md shadow-pink-500/30 shrink-0">
                vs
              </div>

              {/* Right Unit */}
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
                  <HospIcon className="h-6 w-6" />
                </div>
                <span className="font-bold text-sm text-foreground">Ridge Regional</span>
              </div>
            </div>
          </div>

          {/* Card 2: Hospital Readiness Standings Table */}
          <div className="bg-card/90 backdrop-blur-md border border-white/60 dark:border-white/10 rounded-[28px] p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base text-foreground">Hospital Readiness Standings</h3>
              <button 
                onClick={() => navigate("/command/hospitals")}
                className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer flex items-center gap-1"
              >
                View all <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-muted-foreground border-b border-border/40 font-bold uppercase tracking-wider">
                    <th className="pb-3 pl-2">#</th>
                    <th className="pb-3">HOSPITAL</th>
                    <th className="pb-3 text-center">MP</th>
                    <th className="pb-3 text-center">W</th>
                    <th className="pb-3 text-center">D</th>
                    <th className="pb-3 text-center">L</th>
                    <th className="pb-3 text-center">BEDS</th>
                    <th className="pb-3 text-right pr-2">PTS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30 font-medium">
                  {[
                    { rank: 1, name: "Ridge Regional Hospital", mp: 8, w: 6, d: 1, l: 1, beds: "13:5", pts: 19 },
                    { rank: 2, name: "Korle Bu Teaching Hospital", mp: 8, w: 5, d: 1, l: 3, beds: "10:2", pts: 16 },
                    { rank: 3, name: "37 Military Hospital", mp: 8, w: 5, d: 0, l: 3, beds: "10:3", pts: 15 },
                    { rank: 4, name: "Greater Accra Regional", mp: 8, w: 4, d: 1, l: 3, beds: "14:6", pts: 13 },
                    { rank: 5, name: "Nyaho Medical Centre", mp: 8, w: 4, d: 1, l: 3, beds: "8:4", pts: 13 },
                    { rank: 6, name: "Tema General Hospital", mp: 8, w: 4, d: 0, l: 4, beds: "7:3", pts: 12 },
                  ].map((row) => (
                    <tr key={row.rank} className="hover:bg-teal-500/5 transition-colors">
                      <td className="py-3 pl-2 font-bold text-muted-foreground">{row.rank}</td>
                      <td className="py-3 font-bold text-foreground flex items-center gap-2">
                        <div className="h-6 w-6 rounded-lg bg-teal-500/15 text-teal-600 flex items-center justify-center font-black text-[10px]">
                          🏥
                        </div>
                        <span>{row.name}</span>
                      </td>
                      <td className="py-3 text-center">{row.mp}</td>
                      <td className="py-3 text-center text-emerald-500 font-bold">{row.w}</td>
                      <td className="py-3 text-center text-amber-500">{row.d}</td>
                      <td className="py-3 text-center text-red-500">{row.l}</td>
                      <td className="py-3 text-center font-bold text-teal-600 dark:text-teal-400">{row.beds}</td>
                      <td className="py-3 text-right pr-2 font-black text-foreground">{row.pts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Right Column (5/12 Width): Response Statistics + 2x2 Tiles + Callout Promo Banner */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Card 3: Response Statistics */}
          <div className="bg-card/90 backdrop-blur-md border border-white/60 dark:border-white/10 rounded-[28px] p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base text-foreground">Response Statistics</h3>
              <button 
                onClick={() => navigate("/command/analytics")}
                className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer flex items-center gap-1"
              >
                View all statistic <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Segmented Progress Bar */}
            <div className="h-3 w-full rounded-full bg-muted overflow-hidden flex mb-6">
              <div className="h-full bg-teal-500" style={{ width: '75%' }} />
              <div className="h-full bg-cyan-400" style={{ width: '12.5%' }} />
              <div className="h-full bg-slate-300 dark:bg-slate-700" style={{ width: '6.25%' }} />
              <div className="h-full bg-rose-500" style={{ width: '6.25%' }} />
            </div>

            {/* Metric breakdown labels */}
            <div className="grid grid-cols-4 gap-2 text-center">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase">TOTAL</p>
                <p className="text-lg font-black text-foreground mt-0.5">8</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase">RESOLVED</p>
                <p className="text-lg font-black text-emerald-500 mt-0.5">6</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase">EN ROUTE</p>
                <p className="text-lg font-black text-amber-500 mt-0.5">1</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase">DIVERTED</p>
                <p className="text-lg font-black text-rose-500 mt-0.5">1</p>
              </div>
            </div>
          </div>

          {/* Card 4-7: 2x2 Metric Cards Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Tile 1: ICU Occupancy */}
            <div className="bg-card/90 backdrop-blur-md border border-white/60 dark:border-white/10 rounded-[24px] p-5 shadow-lg flex items-center gap-3.5">
              <div className="h-10 w-10 rounded-2xl bg-purple-500/20 text-purple-500 flex items-center justify-center shrink-0">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">ICU OCCUPANCY</p>
                <p className="text-xl font-black text-foreground mt-0.5">65%</p>
              </div>
            </div>

            {/* Tile 2: Overall Capacity */}
            <div className="bg-card/90 backdrop-blur-md border border-white/60 dark:border-white/10 rounded-[24px] p-5 shadow-lg flex items-center gap-3.5">
              <div className="h-10 w-10 rounded-2xl bg-pink-500/20 text-pink-500 flex items-center justify-center shrink-0">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">SYSTEM HEALTH</p>
                <p className="text-xl font-black text-foreground mt-0.5">98.4%</p>
              </div>
            </div>

            {/* Tile 3: Avg Response */}
            <div className="bg-card/90 backdrop-blur-md border border-white/60 dark:border-white/10 rounded-[24px] p-5 shadow-lg flex items-center gap-3.5">
              <div className="h-10 w-10 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">AVG RESPONSE</p>
                <p className="text-xl font-black text-foreground mt-0.5">4.2 min</p>
              </div>
            </div>

            {/* Tile 4: AI Score */}
            <div className="bg-card/90 backdrop-blur-md border border-white/60 dark:border-white/10 rounded-[24px] p-5 shadow-lg flex items-center gap-3.5">
              <div className="h-10 w-10 rounded-2xl bg-teal-500/20 text-teal-500 flex items-center justify-center shrink-0">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">AI ACCURACY</p>
                <p className="text-xl font-black text-foreground mt-0.5">9.4</p>
              </div>
            </div>
          </div>

          {/* Card 8: Bottom Callout Promo Banner */}
          <div className="bg-gradient-to-r from-teal-700 via-cyan-800 to-teal-900 rounded-[28px] p-6 shadow-2xl relative overflow-hidden text-white border border-teal-500/30">
            {/* Background 3D spheres glowing decoration */}
            <div className="absolute right-3 bottom-2 opacity-30 pointer-events-none">
              <div className="h-24 w-24 rounded-full bg-gradient-to-tr from-cyan-300 to-teal-400 blur-md animate-pulse" />
            </div>

            <div className="relative z-10 space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-teal-200">DON'T FORGET</p>
              <h4 className="text-lg font-black tracking-tight leading-tight max-w-[220px]">
                Setup emergency protocol for next shift
              </h4>
              <button 
                onClick={() => navigate("/command/map")}
                className="mt-2 px-5 py-2.5 rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-md text-xs font-bold transition-all border border-white/40 cursor-pointer shadow-lg inline-flex items-center gap-1.5"
              >
                Go to action center <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );

  return (
    <AppShell role="command" userName="Chief Commander Agyeman">
      <div className="space-y-8">
        
        {/* Conditional Layout Routing */}
        {currentPath === "/command/map" && (
          <div className="space-y-6">{renderMap()}</div>
        )}

        {currentPath === "/command/ambulances" && (
          <div className="space-y-6">{renderAmbulances()}</div>
        )}

        {currentPath === "/command/hospitals" && (
          <div className="space-y-6">{renderHospitals()}</div>
        )}

        {currentPath === "/command/analytics" && (
          <div className="space-y-6">
            {renderAnalytics()}
            {/* 3D Hospital Occupancy Visualization */}
            <Card className="rounded-[28px] border border-border/50 shadow-xl">
              <CardHeader className="p-6">
                <CardTitle className="text-lg font-bold">3D Hospital Occupancy</CardTitle>
                <CardDescription>Interactive 3D visualization of hospital bed occupancy rates</CardDescription>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <HospitalCapacityMesh analyticsData={analyticsData} hospitals={hospitals} height={400} />
              </CardContent>
            </Card>
          </div>
        )}

        {(currentPath === "/command" || !["/command/map", "/command/ambulances", "/command/hospitals", "/command/analytics"].includes(currentPath)) && (
          <>
            {renderCoachProDashboard()}
            {renderActiveIncidents()}
            {renderMap()}
          </>
        )}

        {/* Reroute Hospital Modal */}
        {rerouteCase && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-card border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="text-lg font-bold">Divert / Reroute Emergency Case</h3>
                <button onClick={() => setRerouteCase(null)} className="text-muted-foreground hover:text-foreground font-bold">✕</button>
              </div>
              <p className="text-sm">Reroute patient <strong>{rerouteCase.patientName}</strong> to alternative healthcare facility:</p>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-muted-foreground block">Select New Destination Hospital</label>
                <select
                  value={targetHospitalId}
                  onChange={(e) => setTargetHospitalId(e.target.value)}
                  className="w-full p-2.5 border rounded-lg bg-background text-sm cursor-pointer"
                >
                  {hospitals.map(h => (
                    <option key={h.id} value={h.id}>{h.name} ({h.availableBeds} beds free)</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setRerouteCase(null)} className="px-4 py-2 border rounded-lg text-sm cursor-pointer">Cancel</button>
                <button onClick={handleReroute} disabled={isSubmitting} className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-bold cursor-pointer">
                  {isSubmitting ? "Rerouting..." : "Confirm Diversion"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Assign Ambulance Modal */}
        {assignAmbulanceCase && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-card border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="text-lg font-bold">Dispatch Ambulance Unit</h3>
                <button onClick={() => setAssignAmbulanceCase(null)} className="text-muted-foreground hover:text-foreground font-bold">✕</button>
              </div>
              <p className="text-sm">Assign available ambulance unit to incident <strong>{assignAmbulanceCase.patientName}</strong>:</p>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-muted-foreground block">Select Available Unit</label>
                <select
                  value={targetAmbulanceId}
                  onChange={(e) => setTargetAmbulanceId(e.target.value)}
                  className="w-full p-2.5 border rounded-lg bg-background text-sm cursor-pointer"
                >
                  {availableAmbulances.map(a => (
                    <option key={a.id} value={a.id}>{a.plateNumber} (Stationed)</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setAssignAmbulanceCase(null)} className="px-4 py-2 border rounded-lg text-sm cursor-pointer">Cancel</button>
                <button onClick={handleAssignAmbulance} disabled={isSubmitting} className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-bold cursor-pointer">
                  {isSubmitting ? "Dispatching..." : "Confirm Dispatch"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
};

export default CommandCenterDashboard;