import * as React from "react";
import { AppShell } from "../components/ierbms/Navigation";
import { StatCard } from "../components/ierbms/StatCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ierbms/Card";
import { StatusBadge } from "../components/ierbms/StatusBadge";
import { Ambulance as AmbIcon, Hospital as HospIcon, Activity, MapPin, Users, Clock } from "lucide-react";
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

  const COLORS = ["#F44336", "#FF9800", "#2196F3", "#4CAF50", "#9C27B0"];

  const [analyticsData, setAnalyticsData] = React.useState<any>(null);

  React.useEffect(() => {
    fetch('/api/command-center/analytics')
      .then(res => res.json())
      .then(data => setAnalyticsData(data))
      .catch(err => console.error("Error fetching analytics data:", err));
  }, []);

  const currentPath = location.pathname;

  const renderMap = () => (
    <Card>
      <CardHeader>
        <CardTitle>Live Emergency Map</CardTitle>
        <CardDescription>Real-time tracking of ambulances and emergencies across the city</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative h-[600px] bg-muted rounded-lg overflow-hidden border">
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
    <Card>
      <CardHeader>
        <CardTitle>Ambulance Fleet Status</CardTitle>
        <CardDescription>Real-time ambulance availability and assignments</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ambulances.map((ambulance) => (
            <div
              key={ambulance.id}
              className="p-4 border rounded-lg"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-[var(--primary)] flex items-center justify-center">
                    <AmbIcon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold">{ambulance.id.substring(0, 8)}...</p>
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
                <p className="text-sm text-muted-foreground">
                  Assigned: {ambulance.assignedEmergency.substring(0, 8)}...
                </p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  const renderHospitals = () => (
    <Card>
      <CardHeader>
        <CardTitle>Active Hospital Network</CardTitle>
        <CardDescription>Emergency capacity and bed coordinates</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {hospitals.map((hospital) => (
            <div
              key={hospital.id}
              className="p-4 border rounded-lg hover:bg-accent transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="font-semibold">{hospital.name}</h4>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <MapPin className="h-3 w-3" />
                    Coordinates: {hospital.location.lat.toFixed(4)}, {hospital.location.lng.toFixed(4)}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                <div className="p-2 bg-muted rounded text-center">
                  <span className="font-bold block text-base">{hospital.availableBeds}</span>
                  <span className="text-xs text-muted-foreground">General Beds</span>
                </div>
                <div className="p-2 bg-muted rounded text-center">
                  <span className="font-bold block text-base text-[var(--danger)]">{hospital.icuBeds.available}</span>
                  <span className="text-xs text-muted-foreground">ICU Beds</span>
                </div>
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
        <Card className="h-96 flex items-center justify-center">
          <p className="text-muted-foreground animate-pulse font-medium">Querying database analytics warehouse...</p>
        </Card>
      );
    }

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Emergency Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Emergency Trends</CardTitle>
            <CardDescription>6-month emergency response overview</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analyticsData.emergencyTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" />
                <YAxis stroke="var(--muted-foreground)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="emergencies"
                  stroke="var(--chart-1)"
                  strokeWidth={2}
                  name="Emergencies"
                />
                <Line
                  type="monotone"
                  dataKey="resolved"
                  stroke="var(--chart-2)"
                  strokeWidth={2}
                  name="Resolved"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Emergency Types Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Emergency Types</CardTitle>
            <CardDescription>Distribution by emergency category</CardDescription>
          </CardHeader>
          <CardContent>
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
                    borderRadius: "8px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Hospital Utilization */}
        <Card>
          <CardHeader>
            <CardTitle>Hospital Bed Occupancy</CardTitle>
            <CardDescription>Current occupancy rates across hospitals</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analyticsData.bedOccupancy}>
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
                <Bar dataKey="occupancy" fill="var(--chart-1)">
                  {analyticsData.bedOccupancy.map((entry: any, index: number) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.occupancy > 85 ? "var(--chart-4)" : "var(--chart-1)"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Response Time Analytics */}
        <Card>
          <CardHeader>
            <CardTitle>Response Time by Hour</CardTitle>
            <CardDescription>Average response times throughout the day</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analyticsData.responseTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="hour" stroke="var(--muted-foreground)" />
                <YAxis stroke="var(--muted-foreground)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="avgTime"
                  stroke="var(--chart-3)"
                  strokeWidth={2}
                  name="Avg Time (min)"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderGlobe = () => (
    <Card>
      <CardHeader>
        <CardTitle>3D Global Emergency View</CardTitle>
        <CardDescription>Interactive 3D globe showing real-time emergency dispatch across Ghana</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative h-[600px] bg-[#0a0a14] rounded-lg overflow-hidden border">
          <WebGLErrorBoundary fallbackText="Interactive 3D Globe telemetry requires WebGL support.">
            <React.Suspense fallback={
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                <div className="flex flex-col items-center gap-2">
                  <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs">Initializing 3D WebGL Globe Engine...</p>
                </div>
              </div>
            }>
              <GlobeView
                emergencies={emergencies}
                ambulances={ambulances}
                hospitals={hospitals}
              />
            </React.Suspense>
          </WebGLErrorBoundary>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <AppShell role="command" userName="Chief Commander Agyeman">
      <div className="space-y-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Active Emergencies"
            value={activeEmergencies.length}
            icon={Activity}
            variant="danger"
            trend={{ value: 5, isPositive: false }}
            onClick={() => navigate("/command/map")}
          />
          <StatCard
            title="Available Ambulances"
            value={availableAmbulances.length}
            icon={AmbIcon}
            variant="success"
            onClick={() => navigate("/command/ambulances")}
          />
          <StatCard
            title="Total Available Beds"
            value={totalBeds}
            icon={HospIcon}
            variant="default"
            onClick={() => navigate("/command/hospitals")}
          />
          <StatCard
            title="Avg Response Time"
            value={analyticsData?.responseTime?.[0]?.avgTime ? `${analyticsData.responseTime[0].avgTime} min` : "9.2 min"}
            icon={Clock}
            variant="warning"
            trend={{ value: 8, isPositive: true }}
            onClick={() => navigate("/command/analytics")}
          />
        </div>

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
            <Card>
              <CardHeader>
                <CardTitle>3D Hospital Occupancy</CardTitle>
                <CardDescription>Interactive 3D visualization of hospital bed occupancy rates</CardDescription>
              </CardHeader>
              <CardContent>
                <WebGLErrorBoundary fallbackText="3D Bar chart visualization requires WebGL support.">
                  <React.Suspense fallback={
                    <div className="h-[400px] flex items-center justify-center text-muted-foreground">
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

        {currentPath === "/command/globe" && (
          <div className="space-y-6">{renderGlobe()}</div>
        )}

        {currentPath === "/command" && (
          <>
            {renderMap()}
            {renderAnalytics()}
            {renderAmbulances()}
          </>
        )}
      </div>
    </AppShell>
  );
};

export default CommandCenterDashboard;