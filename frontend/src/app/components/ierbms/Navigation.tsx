import * as React from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import { cn } from "../ui/utils";
import { useTheme } from "./ThemeProvider";
import { useAuth } from "../../context/AuthContext";
import { X, Check } from "lucide-react";
import { Button } from "./Button";
import {
  Activity,
  Ambulance,
  Bell,
  Hospital,
  LayoutDashboard,
  LogOut,
  Map,
  Settings,
  Users,
  FileText,
  Stethoscope,
  BedDouble,
  Moon,
  Sun,
  Globe,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const roleNavigationMap: Record<string, NavItem[]> = {
  ambulance: [
    { label: "Dashboard", href: "/ambulance", icon: LayoutDashboard },
    { label: "New Emergency", href: "/ambulance/new-emergency", icon: Activity },
    { label: "Active Cases", href: "/ambulance/cases", icon: Ambulance },
    { label: "Hospital Map", href: "/ambulance/map", icon: Map },
  ],
  hospital: [
    { label: "Overview", href: "/hospital", icon: LayoutDashboard },
    { label: "ER Queue", href: "/hospital/er", icon: Activity },
    { label: "Beds Management", href: "/hospital/beds", icon: BedDouble },
    { label: "Ambulance Arrivals", href: "/hospital/arrivals", icon: Ambulance },
    { label: "Settings", href: "/hospital/settings", icon: Settings },
  ],
  doctor: [
    { label: "Dashboard", href: "/doctor", icon: LayoutDashboard },
    { label: "Incoming Patients", href: "/doctor/patients", icon: Users },
    { label: "Triage Queue", href: "/doctor/triage", icon: Stethoscope },
    { label: "EHR Records", href: "/doctor/records", icon: FileText },
  ],
  nurse: [
    { label: "Dashboard", href: "/nurse", icon: LayoutDashboard },
    { label: "Admissions", href: "/nurse/admissions", icon: FileText },
    { label: "Bed Assignment", href: "/nurse/beds", icon: BedDouble },
    { label: "Ward Monitoring", href: "/nurse/wards", icon: Activity },
    { label: "Patients", href: "/nurse/patients", icon: Users },
  ],
  command: [
    { label: "Dashboard", href: "/command", icon: LayoutDashboard },
    { label: "Live Map", href: "/command/map", icon: Map },
    { label: "Ambulances", href: "/command/ambulances", icon: Ambulance },
    { label: "Hospitals", href: "/command/hospitals", icon: Hospital },
    { label: "Analytics", href: "/command/analytics", icon: Activity },
  ],
  authority: [
    { label: "Dashboard", href: "/authority", icon: LayoutDashboard },
    { label: "Statistics", href: "/authority/statistics", icon: Activity },
    { label: "Trends", href: "/authority/trends", icon: FileText },
    { label: "Forecasting", href: "/authority/forecasting", icon: Map },
    { label: "Reports", href: "/authority/reports", icon: FileText },
  ],
};

export interface NavigationProps {
  role: string;
  className?: string;
}

export const Navigation: React.FC<NavigationProps> = ({ role, className }) => {
  const location = useLocation();
  const { hospitalId } = useParams<{ hospitalId: string }>();
  const navItems = roleNavigationMap[role] || [];

  return (
    <nav className={cn("flex flex-col gap-1 p-4", className)}>
      {navItems.map((item) => {
        let href = item.href;
        if (role === "hospital" && hospitalId) {
          href = item.href.replace("/hospital", `/hospital/${hospitalId}`);
        }
        
        const isRootDashboard = href === "/command" || href === "/ambulance" || href === "/hospitals" || href === "/doctor" || href === "/nurse" || href === "/authority";
        
        const isActive = isRootDashboard
          ? location.pathname === href
          : location.pathname === href || location.pathname.startsWith(href);

        const Icon = item.icon;

        return (
          <Link
            key={href}
            to={href}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-lg transition-all",
              isActive
                ? "bg-[var(--primary)] text-white shadow-sm font-semibold"
                : "text-foreground hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)] font-medium"
            )}
          >
            <Icon className="h-5 w-5" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};

export interface AppShellProps {
  role: string;
  userName: string;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ role, userName, children }) => {
  const { theme, setTheme, effectiveTheme } = useTheme();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [showConnectionStatus, setShowConnectionStatus] = React.useState(true);
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [showSettings, setShowSettings] = React.useState(false);

  // Settings State
  const [soundAlerts, setSoundAlerts] = React.useState(true);
  const [mapAutocenter, setMapAutocenter] = React.useState(true);
  const [refreshInterval, setRefreshInterval] = React.useState("5s");

  const toggleTheme = () => {
    setTheme(effectiveTheme === "dark" ? "light" : "dark");
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  React.useEffect(() => {
    const timer = setTimeout(() => setShowConnectionStatus(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-card flex flex-col">
        <div className="p-6 border-b">
          <h1 className="text-xl font-bold text-[var(--primary)]">IERBMS</h1>
          <p className="text-sm text-muted-foreground mt-1 capitalize">{role} Portal</p>
        </div>

        <div className="flex-1 overflow-y-auto">
          <Navigation role={role} />
        </div>

        <div className="p-4 border-t space-y-2">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-foreground hover:bg-accent transition-all cursor-pointer"
          >
            {effectiveTheme === "dark" ? (
              <Sun className="h-5 w-5 text-amber-400" />
            ) : (
              <Moon className="h-5 w-5 text-blue-500" />
            )}
            <span className="font-medium">
              {effectiveTheme === "dark" ? "Light Mode" : "Dark Mode"}
            </span>
          </button>
          <button 
            onClick={() => setShowNotifications(true)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-lg text-foreground hover:bg-accent transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5" />
              <span className="font-medium">Notifications</span>
            </div>
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          </button>
          <button 
            onClick={() => setShowSettings(true)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-foreground hover:bg-accent transition-all cursor-pointer"
          >
            <Settings className="h-5 w-5" />
            <span className="font-medium">Settings</span>
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-500 hover:bg-red-500/10 transition-all cursor-pointer"
          >
            <LogOut className="h-5 w-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="border-b bg-card px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold">Integrated Emergency Response</h2>
          </div>

          <div className="flex items-center gap-4">
            {showConnectionStatus && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-semibold border border-emerald-500/20">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Telemetry Synchronized
              </div>
            )}
            <div className="text-right">
              <p className="font-semibold text-sm">{userName}</p>
              <p className="text-xs text-muted-foreground capitalize">{role} Account</p>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-6 bg-background">
          {children}
        </main>
      </div>

      {/* Notifications Drawer Overlay */}
      {showNotifications && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end">
          <div className="w-96 bg-card h-full border-l shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                <h3 className="font-bold">System Alerts</h3>
              </div>
              <button 
                onClick={() => setShowNotifications(false)}
                className="p-1 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div className="p-3 border rounded-lg bg-red-500/10 border-red-500/20">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-red-500 uppercase">Critical Dispatch</span>
                  <span className="text-[10px] text-muted-foreground">Just Now</span>
                </div>
                <p className="text-xs font-semibold">Trauma Incident at Circle Overhead</p>
                <p className="text-[11px] text-muted-foreground mt-1">Ambulance GA-2041 assigned to Ridge Hospital ER.</p>
              </div>

              <div className="p-3 border rounded-lg bg-amber-500/10 border-amber-500/20">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-amber-500 uppercase">High Capacity Warning</span>
                  <span className="text-[10px] text-muted-foreground">12m ago</span>
                </div>
                <p className="text-xs font-semibold">Korle Bu ER at 88% Capacity</p>
                <p className="text-[11px] text-muted-foreground mt-1">2 ICU beds remaining. Automated rerouting active.</p>
              </div>

              <div className="p-3 border rounded-lg bg-emerald-500/10 border-emerald-500/20">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-emerald-500 uppercase">System Status</span>
                  <span className="text-[10px] text-muted-foreground">1h ago</span>
                </div>
                <p className="text-xs font-semibold">WebSocket Synchronization Active</p>
                <p className="text-[11px] text-muted-foreground mt-1">Telemetry node latency &lt; 45ms across 40 Ghanaian facilities.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card border rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                <h3 className="font-bold">Portal Settings</h3>
              </div>
              <button 
                onClick={() => setShowSettings(false)}
                className="p-1 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">Audio Emergency Alerts</p>
                  <p className="text-xs text-muted-foreground">Play sound chime when critical incident triggers</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={soundAlerts} 
                  onChange={(e) => setSoundAlerts(e.target.checked)}
                  className="h-4 w-4 rounded accent-primary cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between border-t pt-4">
                <div>
                  <p className="text-sm font-semibold">Map Auto-Centering</p>
                  <p className="text-xs text-muted-foreground">Auto-pan map when new ambulance dispatches</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={mapAutocenter} 
                  onChange={(e) => setMapAutocenter(e.target.checked)}
                  className="h-4 w-4 rounded accent-primary cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between border-t pt-4">
                <div>
                  <p className="text-sm font-semibold">Telemetry Refresh Rate</p>
                  <p className="text-xs text-muted-foreground">Polling fallback frequency</p>
                </div>
                <select 
                  value={refreshInterval}
                  onChange={(e) => setRefreshInterval(e.target.value)}
                  className="px-2.5 py-1 text-xs bg-background border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                >
                  <option value="2s">2 seconds</option>
                  <option value="5s">5 seconds</option>
                  <option value="10s">10 seconds</option>
                </select>
              </div>
            </div>
            <div className="p-4 border-t bg-muted/30 flex justify-end">
              <Button 
                onClick={() => setShowSettings(false)}
                className="px-4 py-1.5 text-xs font-semibold"
              >
                Save Preferences
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};