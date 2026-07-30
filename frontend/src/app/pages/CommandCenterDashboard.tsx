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

// Lazy load 3D components for performance and WebGL safety
const GlobeView = React.lazy(() => import("../components/ierbms/GlobeView"));
const Analytics3D = React.lazy(() => import("../components/ierbms/Analytics3D"));

// Simple Error Boundary for WebGL fallback
class WebGLErrorBoundary extends React.Component<{ children: React.ReactNode, fallbackText?: string }, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: any, errorInfo: any) {
    console.error("3D View Error Boundary caught error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="h-[400px] w-full flex flex-col items-center justify-center bg-card border rounded-lg p-6 text-center text-muted-foreground">
          <p className="font-semibold text-foreground mb-1">3D Graphics Fallback Active</p>
          <p className="text-sm">{this.props.fallbackText || "Your device or browser is displaying standard dashboard telemetry."}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

export const CommandCenterDashboard: React.FC = () => {
  const { emergencies, hospitals, ambulances } = useRealTime();
  const location = useLocation();
  const navigate = useNavigate();
  const activeEmergencies = emergencies.filter(e => e.status !== "completed");
  const availableAmbulances = ambulances.filter(a => a.status === "available");
  const totalBeds = hospitals.reduce((sum, h) => sum + h.availableBeds, 0);

  const COLORS = ["#0d9488", "#06b6d4", "#3b82f6", "#f59e0b", "#ec4899"];

  const [analyticsData, setAnalyticsData] = React.useState<any>(null);

  React.useEffect(() => {
    fetch('/api/command-center/analytics')
      .then(res => res.json())
      .then(data => setAnalyticsData(data))
      .catch(err => console.error("Error fetching analytics data:", err));
  }, []);

  const currentPath = location.pathname;

  const renderMap = () => (
    <Card className="rounded-[28px] border border-border/50 shadow-xl overflow-hidden h-full flex flex-col">
      <CardHeader className="p-4 border-b border-border/40 shrink-0">
        <CardTitle className="text-base font-bold">Live Emergency Map Telemetry</CardTitle>
        <CardDescription className="text-xs">Real-time tracking of ambulances and emergencies across Greater Accra</CardDescription>
      </CardHeader>
      <CardContent className="p-0 flex-1 min-h-0">
        <div className="relative h-full w-full bg-muted overflow-hidden">
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
    <Card className="rounded-[28px] border border-border/50 shadow-xl h-full flex flex-col overflow-hidden">
      <CardHeader className="p-4 border-b border-border/40 shrink-0">
        <CardTitle className="text-base font-bold">Ambulance Fleet Status</CardTitle>
        <CardDescription className="text-xs">Real-time ambulance availability and active emergency assignments</CardDescription>
      </CardHeader>
      <CardContent className="p-4 flex-1 min-h-0 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {ambulances.map((ambulance) => (
            <div
              key={ambulance.id}
              className="p-3 bg-card/80 border border-border/60 rounded-2xl shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-teal-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-teal-500/20">
                    <AmbIcon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-bold text-xs text-foreground">{ambulance.id.substring(0, 8)}...</p>
                    <p className="text-[10px] text-muted-foreground">{ambulance.plateNumber}</p>
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
                <p className="text-[11px] text-teal-600 dark:text-teal-400 font-semibold mt-1.5 pt-1.5 border-t border-border/40">
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
    <Card className="rounded-[28px] border border-border/50 shadow-xl h-full flex flex-col overflow-hidden">
      <CardHeader className="p-4 border-b border-border/40 shrink-0">
        <CardTitle className="text-base font-bold">Hospital Network Capacity</CardTitle>
        <CardDescription className="text-xs">Real-time bed availability and ICU readiness across regional hospitals</CardDescription>
      </CardHeader>
      <CardContent className="p-4 flex-1 min-h-0 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {hospitals.map((hospital) => (
            <div
              key={hospital.id}
              className="p-3 bg-card/80 border border-border/60 rounded-2xl shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                    <HospIcon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-bold text-xs text-foreground truncate">{hospital.name}</p>
                    <p className="text-[10px] text-muted-foreground">{hospital.location?.address || 'Ghana'}</p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full text-white ${hospital.availableBeds > 5 ? 'bg-emerald-600' : hospital.availableBeds > 0 ? 'bg-amber-600' : 'bg-red-600'}`}>
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full overflow-hidden">
        <Card className="rounded-[28px] border border-border/50 shadow-xl h-full flex flex-col overflow-hidden">
          <CardHeader className="p-4 shrink-0">
            <CardTitle className="text-base font-bold">Emergency Trends</CardTitle>
            <CardDescription className="text-xs">Monthly incident intake vs. resolution rate</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0 flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
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

        <Card className="rounded-[28px] border border-border/50 shadow-xl h-full flex flex-col overflow-hidden">
          <CardHeader className="p-4 shrink-0">
            <CardTitle className="text-base font-bold">Emergency Types</CardTitle>
            <CardDescription className="text-xs">Distribution by medical category</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0 flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analyticsData.emergencyTypes}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ type, percentage }) => `${type} (${percentage}%)`}
                  outerRadius={85}
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
  // CoachPro UI Dashboard Layout Replica (Strict Window Height, No Scroll)
  // ---------------------------------------------------------------------------
  const renderCoachProDashboard = () => (
    <div className="h-full w-full grid grid-cols-1 lg:grid-cols-12 gap-4 overflow-hidden">
      
      {/* Left Column (7/12 Width): Next Dispatch + Standings Table */}
      <div className="lg:col-span-7 flex flex-col gap-4 h-full overflow-hidden">
        
        {/* Card 1: Next Emergency Dispatch (Compact CoachPro Card) */}
        <div className="bg-card/90 backdrop-blur-md border border-white/60 dark:border-white/10 rounded-[24px] p-4 shadow-xl shrink-0">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-sm text-foreground">Next Emergency Dispatch</h3>
            <button 
              onClick={() => navigate("/command/map")}
              className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer flex items-center gap-1"
            >
              View calendar <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 mb-3">
            <Calendar className="h-3 w-3 text-teal-500" />
            <span>GAR-0192 • 21:00, 11 November, 2026</span>
          </p>

          {/* Vs Matchup Pill Box */}
          <div className="flex items-center justify-center gap-3 sm:gap-6 bg-muted/40 dark:bg-slate-900/40 border border-border/50 rounded-2xl p-3">
            {/* Left Unit */}
            <div className="flex items-center gap-2.5">
              <span className="font-bold text-xs sm:text-sm text-foreground">Ambulance GAR-0192</span>
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-teal-500 to-cyan-400 flex items-center justify-center text-white shadow-md shadow-teal-500/20">
                <AmbIcon className="h-4.5 w-4.5" />
              </div>
            </div>

            {/* Middle VS Badge */}
            <div className="h-7 w-7 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 flex items-center justify-center text-white text-[10px] font-black shadow-md shadow-pink-500/30 shrink-0">
              vs
            </div>

            {/* Right Unit */}
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                <HospIcon className="h-4.5 w-4.5" />
              </div>
              <span className="font-bold text-xs sm:text-sm text-foreground">Ridge Regional</span>
            </div>
          </div>
        </div>

        {/* Card 2: Hospital Readiness Standings Table (Fills Remaining Left Column Height) */}
        <div className="bg-card/90 backdrop-blur-md border border-white/60 dark:border-white/10 rounded-[24px] p-4 shadow-xl flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-3 shrink-0">
            <h3 className="font-bold text-sm text-foreground">Hospital Readiness Standings</h3>
            <button 
              onClick={() => navigate("/command/hospitals")}
              className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer flex items-center gap-1"
            >
              View all <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto pr-1">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-card/95 backdrop-blur-md z-10">
                <tr className="text-muted-foreground border-b border-border/40 font-bold uppercase tracking-wider text-[10px]">
                  <th className="pb-2 pl-1">#</th>
                  <th className="pb-2">HOSPITAL</th>
                  <th className="pb-2 text-center">MP</th>
                  <th className="pb-2 text-center">W</th>
                  <th className="pb-2 text-center">D</th>
                  <th className="pb-2 text-center">L</th>
                  <th className="pb-2 text-center">BEDS</th>
                  <th className="pb-2 text-right pr-1">PTS</th>
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
                    <td className="py-2 pl-1 font-bold text-muted-foreground text-[11px]">{row.rank}</td>
                    <td className="py-2 font-bold text-foreground flex items-center gap-2">
                      <div className="h-5 w-5 rounded-md bg-teal-500/15 text-teal-600 flex items-center justify-center font-black text-[9px]">
                        🏥
                      </div>
                      <span className="truncate text-xs">{row.name}</span>
                    </td>
                    <td className="py-2 text-center text-xs">{row.mp}</td>
                    <td className="py-2 text-center text-emerald-500 font-bold text-xs">{row.w}</td>
                    <td className="py-2 text-center text-amber-500 text-xs">{row.d}</td>
                    <td className="py-2 text-center text-red-500 text-xs">{row.l}</td>
                    <td className="py-2 text-center font-bold text-teal-600 dark:text-teal-400 text-xs">{row.beds}</td>
                    <td className="py-2 text-right pr-1 font-black text-foreground text-xs">{row.pts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Right Column (5/12 Width): Response Statistics + 2x2 Tiles + Callout Promo Banner */}
      <div className="lg:col-span-5 flex flex-col gap-4 h-full overflow-hidden">
        
        {/* Card 3: Response Statistics (Compact) */}
        <div className="bg-card/90 backdrop-blur-md border border-white/60 dark:border-white/10 rounded-[24px] p-4 shadow-xl shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm text-foreground">Response Statistics</h3>
            <button 
              onClick={() => navigate("/command/analytics")}
              className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer flex items-center gap-1"
            >
              View all <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          {/* Segmented Progress Bar */}
          <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden flex mb-4">
            <div className="h-full bg-teal-500" style={{ width: '75%' }} />
            <div className="h-full bg-cyan-400" style={{ width: '12.5%' }} />
            <div className="h-full bg-slate-300 dark:bg-slate-700" style={{ width: '6.25%' }} />
            <div className="h-full bg-rose-500" style={{ width: '6.25%' }} />
          </div>

          {/* Metric breakdown labels */}
          <div className="grid grid-cols-4 gap-1 text-center">
            <div>
              <p className="text-[9px] font-bold text-muted-foreground uppercase">TOTAL</p>
              <p className="text-base font-black text-foreground mt-0.5">8</p>
            </div>
            <div>
              <p className="text-[9px] font-bold text-muted-foreground uppercase">RESOLVED</p>
              <p className="text-base font-black text-emerald-500 mt-0.5">6</p>
            </div>
            <div>
              <p className="text-[9px] font-bold text-muted-foreground uppercase">EN ROUTE</p>
              <p className="text-base font-black text-amber-500 mt-0.5">1</p>
            </div>
            <div>
              <p className="text-[9px] font-bold text-muted-foreground uppercase">DIVERTED</p>
              <p className="text-base font-black text-rose-500 mt-0.5">1</p>
            </div>
          </div>
        </div>

        {/* Card 4-7: 2x2 Metric Cards Grid */}
        <div className="grid grid-cols-2 gap-3 shrink-0">
          {/* Tile 1: ICU Occupancy */}
          <div className="bg-card/90 backdrop-blur-md border border-white/60 dark:border-white/10 rounded-[20px] p-3.5 shadow-lg flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-purple-500/20 text-purple-500 flex items-center justify-center shrink-0">
              <Activity className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase text-muted-foreground tracking-wider">ICU OCCUPANCY</p>
              <p className="text-base font-black text-foreground mt-0.5">65%</p>
            </div>
          </div>

          {/* Tile 2: Overall Capacity */}
          <div className="bg-card/90 backdrop-blur-md border border-white/60 dark:border-white/10 rounded-[20px] p-3.5 shadow-lg flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-pink-500/20 text-pink-500 flex items-center justify-center shrink-0">
              <Award className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase text-muted-foreground tracking-wider">SYSTEM HEALTH</p>
              <p className="text-base font-black text-foreground mt-0.5">98.4%</p>
            </div>
          </div>

          {/* Tile 3: Avg Response */}
          <div className="bg-card/90 backdrop-blur-md border border-white/60 dark:border-white/10 rounded-[20px] p-3.5 shadow-lg flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase text-muted-foreground tracking-wider">AVG RESPONSE</p>
              <p className="text-base font-black text-foreground mt-0.5">4.2 min</p>
            </div>
          </div>

          {/* Tile 4: AI Score */}
          <div className="bg-card/90 backdrop-blur-md border border-white/60 dark:border-white/10 rounded-[20px] p-3.5 shadow-lg flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-teal-500/20 text-teal-500 flex items-center justify-center shrink-0">
              <Zap className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase text-muted-foreground tracking-wider">AI ACCURACY</p>
              <p className="text-base font-black text-foreground mt-0.5">9.4</p>
            </div>
          </div>
        </div>

        {/* Card 8: Bottom Callout Promo Banner (Fills Remaining Right Column Height) */}
        <div className="bg-gradient-to-r from-teal-700 via-cyan-800 to-teal-900 rounded-[24px] p-5 shadow-xl relative overflow-hidden text-white border border-teal-500/30 flex-1 min-h-0 flex flex-col justify-center">
          {/* Background 3D spheres glowing decoration */}
          <div className="absolute right-2 bottom-1 opacity-25 pointer-events-none">
            <div className="h-20 w-20 rounded-full bg-gradient-to-tr from-cyan-300 to-teal-400 blur-md animate-pulse" />
          </div>

          <div className="relative z-10 space-y-2">
            <p className="text-[9px] font-bold uppercase tracking-widest text-teal-200">DON'T FORGET</p>
            <h4 className="text-base font-black tracking-tight leading-tight max-w-[200px]">
              Setup emergency protocol for next shift
            </h4>
            <button 
              onClick={() => navigate("/command/map")}
              className="mt-1 px-4 py-2 rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-md text-xs font-bold transition-all border border-white/40 cursor-pointer shadow-lg inline-flex items-center gap-1"
            >
              Go to action center <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>

      </div>

    </div>
  );

  return (
    <AppShell role="command" userName="Chief Commander Agyeman">
      <div className="h-full w-full flex flex-col min-h-0 overflow-hidden">
        
        {/* Conditional Layout Routing */}
        {currentPath === "/command/map" && (
          <div className="h-full w-full">{renderMap()}</div>
        )}

        {currentPath === "/command/ambulances" && (
          <div className="h-full w-full">{renderAmbulances()}</div>
        )}

        {currentPath === "/command/hospitals" && (
          <div className="h-full w-full">{renderHospitals()}</div>
        )}

        {currentPath === "/command/analytics" && (
          <div className="h-full w-full flex flex-col gap-4 overflow-hidden">
            <div className="h-1/2">{renderAnalytics()}</div>
            {/* 3D Hospital Occupancy Visualization */}
            <Card className="rounded-[28px] border border-border/50 shadow-xl h-1/2 flex flex-col overflow-hidden">
              <CardHeader className="p-4 shrink-0">
                <CardTitle className="text-base font-bold">3D Hospital Occupancy</CardTitle>
                <CardDescription className="text-xs">Interactive 3D visualization of hospital bed occupancy rates</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0 flex-1 min-h-0">
                <WebGLErrorBoundary fallbackText="3D Bar chart visualization requires WebGL support.">
                  <React.Suspense fallback={
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      <p className="animate-pulse text-xs">Loading 3D Analytics Canvas...</p>
                    </div>
                  }>
                    <Analytics3D analyticsData={analyticsData} />
                  </React.Suspense>
                </WebGLErrorBoundary>
              </CardContent>
            </Card>
          </div>
        )}

        {currentPath === "/command" && renderCoachProDashboard()}
      </div>
    </AppShell>
  );
};

export default CommandCenterDashboard;