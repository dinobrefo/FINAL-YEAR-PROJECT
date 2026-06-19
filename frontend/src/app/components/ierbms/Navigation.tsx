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
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const roleNavigationMap: Record<string, NavItem[]> = {
  ambulance: [
    { label: "Dashboard", href: "/ambulance", icon: LayoutDashboard },
    { label: "New Emergency", href: "/ambulance/new-emergency", icon: Activity },
    { label: "Active Cases", href: "/ambulance/cases", icon: FileText },
    { label: "Navigation", href: "/ambulance/navigation", icon: Map },
    { label: "History", href: "/ambulance/history", icon: FileText },
  ],
  hospital: [
    { label: "Dashboard", href: "/hospital", icon: LayoutDashboard },
    { label: "Bed Management", href: "/hospital/beds", icon: BedDouble },
    { label: "ICU Dashboard", href: "/hospital/icu", icon: Activity },
    { label: "Incoming", href: "/hospital/incoming", icon: Ambulance },
    { label: "Staff", href: "/hospital/staff", icon: Users },
    { label: "Settings", href: "/hospital/settings", icon: Settings },
  ],
  doctor: [
    { label: "Dashboard", href: "/doctor", icon: LayoutDashboard },
    { label: "Assigned Patients", href: "/doctor/patients", icon: Users },
    { label: "Incoming", href: "/doctor/incoming", icon: Activity },
    { label: "Treatment Queue", href: "/doctor/queue", icon: FileText },
    { label: "Records", href: "/doctor/records", icon: Stethoscope },
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
        
        const isActive = location.pathname === href || (item.href !== "/hospital" && location.pathname.startsWith(href));
        const Icon = item.icon;

        return (
          <Link
            key={href}
            to={href}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-lg transition-all",
              isActive
                ? "bg-[var(--primary)] text-white shadow-sm"
                : "text-foreground hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]"
            )}
          >
            <Icon className="h-5 w-5" />
            <span className="font-medium">{item.label}</span>
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
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-foreground hover:bg-accent transition-all"
          >
            {effectiveTheme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
            <span className="font-medium">
              {effectiveTheme === "dark" ? "Light Mode" : "Dark Mode"}
            </span>
          </button>
          <button 
            onClick={() => setShowNotifications(true)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-foreground hover:bg-accent transition-all cursor-pointer"
          >
            <Bell className="h-5 w-5" />
            <span className="font-medium">Notifications</span>
          </button>
          <button 
            onClick={() => setShowSettings(true)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-foreground hover:bg-accent transition-all cursor-pointer"
          >
            <Settings className="h-5 w-5" />
            <span className="font-medium">Preferences</span>
          </button>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-[var(--danger)] hover:bg-accent transition-all cursor-pointer"
          >
            <LogOut className="h-5 w-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <header className="sticky top-0 z-10 bg-card border-b px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold">Welcome back, {userName}</h2>
              <p className="text-sm text-muted-foreground">
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
            <div className="flex items-center gap-4">
              {showConnectionStatus && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--success)]/10 border border-[var(--success)] rounded-lg">
                  <div className="h-2 w-2 bg-[var(--success)] rounded-full animate-pulse" />
                  <span className="text-xs font-medium text-[var(--success)]">Real-time Connected</span>
                </div>
              )}
              <button className="relative p-2 rounded-lg hover:bg-accent transition-colors">
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1 h-2 w-2 bg-[var(--danger)] rounded-full"></span>
              </button>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-[var(--primary)] flex items-center justify-center text-white font-semibold">
                  {userName.charAt(0)}
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="p-8">{children}</div>
      </main>

      {/* Notifications Drawer/Modal */}
      {showNotifications && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md h-full bg-card shadow-2xl p-6 flex flex-col animate-slide-in">
            <div className="flex items-center justify-between border-b pb-4 mb-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Bell className="h-5 w-5 text-[var(--primary)]" />
                Live Notification Center
              </h3>
              <button 
                onClick={() => setShowNotifications(false)}
                className="p-1.5 hover:bg-accent rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-4">
              {[
                { title: "🚨 New Critical Trauma Dispatched", time: "2 mins ago", desc: "Case #2094 assigned to Ridge Hospital ICU Ward.", urgent: true },
                { title: "⚡ Ambulance Unit 4 Status Update", time: "15 mins ago", desc: "Ambulance completed case and is now available.", urgent: false },
                { title: "⚠️ Low Capacity Alert", time: "1 hour ago", desc: "Korle Bu Hospital general beds occupancy has exceeded 90%.", urgent: true },
                { title: "🔄 ML Engine Retraining Complete", time: "2 hours ago", desc: "Routing algorithm successfully fit Random Forest Regressor on 145 resolved cases.", urgent: false },
              ].map((item, idx) => (
                <div 
                  key={idx} 
                  className={cn(
                    "p-4 border rounded-lg transition-all",
                    item.urgent ? "border-[var(--warning)]/50 bg-[var(--warning)]/5" : "bg-accent/40"
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm">{item.title}</span>
                    <span className="text-xs text-muted-foreground">{item.time}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
            
            <div className="border-t pt-4 mt-4">
              <Button 
                variant="outline" 
                className="w-full text-xs font-semibold"
                onClick={() => setShowNotifications(false)}
              >
                Dismiss All Notifications
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-card shadow-2xl rounded-xl p-6 flex flex-col mx-4 animate-scale-in">
            <div className="flex items-center justify-between border-b pb-4 mb-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Settings className="h-5 w-5 text-[var(--primary)]" />
                IERBMS System Preferences
              </h3>
              <button 
                onClick={() => setShowSettings(false)}
                className="p-1.5 hover:bg-accent rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-6 flex-1 py-2">
              <div className="flex items-center justify-between">
                <div>
                  <label className="font-medium text-sm block">Sound Alerts on Dispatch</label>
                  <span className="text-xs text-muted-foreground">Play tone for critical vitals and incoming cases</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={soundAlerts} 
                  onChange={(e) => setSoundAlerts(e.target.checked)}
                  className="h-5 w-5 text-[var(--primary)] rounded focus:ring-[var(--primary)]"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="font-medium text-sm block">Auto-Center Map Navigation</label>
                  <span className="text-xs text-muted-foreground">Keep the view focused on active vehicle route</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={mapAutocenter} 
                  onChange={(e) => setMapAutocenter(e.target.checked)}
                  className="h-5 w-5 text-[var(--primary)] rounded focus:ring-[var(--primary)]"
                />
              </div>

              <div className="space-y-2">
                <label className="font-medium text-sm block">Real-time Polling Interval</label>
                <span className="text-xs text-muted-foreground block">Adjust telemetry ping frequencies for ambulances</span>
                <select 
                  value={refreshInterval} 
                  onChange={(e) => setRefreshInterval(e.target.value)}
                  className="w-full p-2 border rounded-lg bg-background text-sm"
                >
                  <option value="2s">High Frequency (2s)</option>
                  <option value="5s">Balanced (5s)</option>
                  <option value="15s">Optimized (15s)</option>
                </select>
              </div>
            </div>
            
            <div className="border-t pt-4 mt-6 flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowSettings(false)}
              >
                Cancel
              </Button>
              <Button 
                variant="primary" 
                onClick={() => setShowSettings(false)}
                className="flex items-center gap-1.5"
              >
                <Check className="h-4 w-4" />
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};