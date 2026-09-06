import * as React from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import { cn } from "../ui/utils";
import { useTheme } from "./ThemeProvider";
import { useAuth } from "../../context/AuthContext";
import { X, Check, Search } from "lucide-react";
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
  Wifi,
  WifiOff
} from "lucide-react";
import { DefenseDemoBar } from "./DefenseDemoBar";
import { offlineQueue } from "../../utils/offlineQueue";

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
    <nav className={cn("flex flex-col gap-2 p-4", className)}>
      {navItems.map((item) => {
        let href = item.href;
        if (role === "hospital") {
          const pathHospId = hospitalId || (location.pathname.match(/\/hospital\/([a-zA-Z0-9_-]+)/)?.[1]);
          if (pathHospId && pathHospId !== "settings") {
            href = item.href.replace("/hospital", `/hospital/${pathHospId}`);
          }
        }
        
        const isRootDashboard =
          item.href === "/ambulance" ||
          item.href === "/hospital" ||
          item.href === "/doctor" ||
          item.href === "/nurse" ||
          item.href === "/command" ||
          item.href === "/authority";

        const currentPath = location.pathname.replace(/\/$/, "");
        const targetPath = href.replace(/\/$/, "");

        const isActive = isRootDashboard
          ? currentPath === targetPath || (currentPath === "/hospitals" && item.href === "/hospital")
          : currentPath === targetPath || currentPath.startsWith(`${targetPath}/`);

        const Icon = item.icon;

        return (
          <Link
            key={href}
            to={href}
            className={cn(
              "flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-200 group font-mono text-sm",
              isActive
                ? "bg-red-500/15 text-red-400 border border-red-500/30 shadow-lg shadow-red-500/10 font-bold"
                : "text-slate-400 hover:bg-white/5 hover:text-white border border-transparent font-medium"
            )}
          >
            <Icon className={cn("h-5 w-5 transition-transform group-hover:scale-110", isActive ? "text-red-400" : "text-slate-400 group-hover:text-red-400")} />
            <span className="text-sm">{item.label}</span>
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
  const location = useLocation();
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [showSettings, setShowSettings] = React.useState(false);

  // Settings State
  const [soundAlerts, setSoundAlerts] = React.useState(true);
  const [mapAutocenter, setMapAutocenter] = React.useState(true);
  const [refreshInterval, setRefreshInterval] = React.useState("5s");

  // Real-time Field Network & Sync State
  const [isOnline, setIsOnline] = React.useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [pendingSyncCount, setPendingSyncCount] = React.useState<number>(offlineQueue.getQueue().length);
  const [isSyncing, setIsSyncing] = React.useState<boolean>(false);

  React.useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      setIsSyncing(true);
      try {
        await offlineQueue.syncPendingItems();
      } finally {
        setPendingSyncCount(offlineQueue.getQueue().length);
        setIsSyncing(false);
      }
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const interval = setInterval(() => {
      setPendingSyncCount(offlineQueue.getQueue().length);
    }, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const toggleTheme = () => {
    setTheme(effectiveTheme === "dark" ? "light" : "dark");
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Derive current page title
  const pageTitle = React.useMemo(() => {
    const p = location.pathname;
    if (p.includes("/map")) return "Live Map Telemetry";
    if (p.includes("/ambulances")) return "Ambulance Fleet";
    if (p.includes("/hospitals")) return "Hospital Directory";
    if (p.includes("/analytics")) return "System Analytics";
    if (p.includes("/new-emergency")) return "Emergency Intake";
    if (p.includes("/cases")) return "Active Emergency Cases";
    if (p.includes("/er")) return "Emergency Department & Triage Queue";
    if (p.includes("/beds")) return "Bed Capacity & Allocation";
    if (p.includes("/arrivals")) return "Ambulance Arrivals";
    if (p.includes("/patients")) return "Incoming Emergency Patients";
    if (p.includes("/triage")) return "Clinical Triage Queue";
    if (p.includes("/records")) return "EHR Patient Records";
    if (p.includes("/admissions")) return "Ward Admissions";
    if (p.includes("/wards")) return "Ward Monitoring";
    if (p.includes("/settings")) return "Facility Settings";
    if (p.includes("/statistics")) return "National Health Statistics";
    if (p.includes("/trends")) return "Epidemiological Trends";
    if (p.includes("/forecasting")) return "Capacity Forecasting";
    if (p.includes("/reports")) return "Policy & Audit Reports";
    return "Operations Dashboard";
  }, [location.pathname]);

  return (
    <div className="h-screen w-screen bg-[#06111F] text-[#F8FAFC] p-3 sm:p-6 transition-colors duration-300 overflow-hidden flex flex-col relative font-sans">
      <div className="absolute inset-0 bg-grid [background-size:28px_28px] opacity-35 pointer-events-none" />

      {/* Outer Container Shell */}
      <div className="max-w-[1600px] w-full mx-auto h-full flex flex-col md:flex-row gap-6 items-stretch overflow-hidden relative z-10">
        
        {/* Sticky Fixed Sidebar */}
        <aside className="w-full md:w-64 bg-[#081827]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-black/40 flex flex-col h-full overflow-hidden shrink-0 z-10">
          <div className="p-5 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center shadow-lg shadow-red-500/20 text-[#EF4444]">
                <Activity className="h-5 w-5 text-[#EF4444]" />
              </div>
              <div>
                <h1 className="text-lg font-black tracking-tight text-white font-mono">IERBMS</h1>
                <p className="text-[11px] font-semibold text-red-400 capitalize font-mono">{role} Portal</p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto py-2">
            <Navigation role={role} />
          </div>

          <div className="p-4 border-t border-white/10 space-y-1.5 font-mono">
            <button
              onClick={toggleTheme}
              className="w-full flex items-center gap-3 px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer text-xs font-semibold"
            >
              {effectiveTheme === "dark" ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4 text-slate-400" />
              )}
              <span>{effectiveTheme === "dark" ? "Light Mode" : "Dark Mode"}</span>
            </button>

            <button 
              onClick={() => setShowNotifications(true)}
              className="w-full flex items-center justify-between px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer text-xs font-semibold"
            >
              <div className="flex items-center gap-3">
                <Bell className="h-4 w-4 text-slate-400" />
                <span>Notifications</span>
              </div>
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            </button>

            <button 
              onClick={() => setShowSettings(true)}
              className="w-full flex items-center gap-3 px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer text-xs font-semibold"
            >
              <Settings className="h-4 w-4 text-slate-400" />
              <span>Settings</span>
            </button>

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2 rounded-xl text-red-400 hover:bg-red-500/10 transition-all cursor-pointer text-xs font-semibold"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* Main Content Workspace Panel */}
        <main className="flex-1 bg-[#111C2D]/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-5 md:p-7 flex flex-col min-w-0 h-full overflow-hidden relative z-10">
          
          {/* Top Header Bar */}
          <header className="sticky top-0 bg-[#081827]/95 backdrop-blur-md z-30 pb-4 pt-1 mb-4 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
            <div>
              <p className="text-xs font-mono font-semibold text-red-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                TELEMETRY ACTIVE · {userName || "Officer"}
              </p>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-0.5 font-mono">{pageTitle}</h2>
            </div>

            <div className="flex items-center gap-3">
              {/* Real-time Field Sync Status Badge */}
              <div className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border font-mono transition-all",
                !isOnline
                  ? "bg-amber-500/10 text-amber-500 border-amber-500/30 animate-pulse"
                  : isSyncing
                  ? "bg-blue-500/10 text-blue-400 border-blue-500/30"
                  : pendingSyncCount > 0
                  ? "bg-amber-500/15 text-amber-400 border-amber-500/40"
                  : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
              )}>
                <span className={cn(
                  "h-2 w-2 rounded-full",
                  !isOnline ? "bg-amber-500" : isSyncing ? "bg-blue-400 animate-spin" : pendingSyncCount > 0 ? "bg-amber-400" : "bg-emerald-400"
                )} />
                <span>
                  {!isOnline
                    ? `Offline (${pendingSyncCount} queued)`
                    : isSyncing
                    ? "Syncing Queue..."
                    : pendingSyncCount > 0
                    ? `${pendingSyncCount} pending sync`
                    : "Grid Synced"}
                </span>
              </div>

              <button 
                onClick={() => setShowSettings(true)}
                className="h-10 w-10 rounded-xl bg-[#081827] border border-white/10 hover:bg-white/5 flex items-center justify-center text-slate-300 hover:text-white transition-all cursor-pointer shadow-sm"
                title="Search Dashboard"
              >
                <Search className="h-4 w-4" />
              </button>

              <button 
                onClick={() => setShowNotifications(true)}
                className="h-10 w-10 rounded-xl bg-[#081827] border border-white/10 hover:bg-white/5 flex items-center justify-center text-slate-300 hover:text-white transition-all relative cursor-pointer shadow-sm"
                title="Notifications"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-red-500" />
              </button>

              {/* User Profile Avatar Pill */}
              <div className="flex items-center gap-2.5 pl-2 py-1 pr-3 bg-[#081827] border border-white/10 rounded-full shadow-sm font-mono">
                <img 
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80" 
                  alt="Profile" 
                  className="h-8 w-8 rounded-full object-cover ring-2 ring-red-500/40"
                />
                <span className="text-xs font-bold text-white hidden sm:inline-block">{userName || "Chief Commander"}</span>
              </div>
            </div>
          </header>

          {/* Scrollable Body Content Area BELOW Header */}
          <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-6">
            {children}
          </div>
        </main>

      </div>

      {/* Notifications Drawer */}
      {showNotifications && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-md bg-card border-l h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-teal-500" />
                <h3 className="font-bold">System Alerts</h3>
              </div>
              <button 
                onClick={() => setShowNotifications(false)}
                className="p-1 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 flex-1 overflow-y-auto space-y-3">
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-2xl">
                <p className="text-xs font-bold text-red-500">Critical Dispatch Alert</p>
                <p className="text-xs text-muted-foreground mt-1">Ambulance GAR-0192 dispatched to Circle Interchange trauma case.</p>
              </div>
              <div className="p-3 bg-teal-500/10 border border-teal-500/30 rounded-2xl">
                <p className="text-xs font-bold text-teal-500">Bed Capacity Updated</p>
                <p className="text-xs text-muted-foreground mt-1">Ridge Regional Hospital added 3 ICU emergency beds.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card border rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-teal-500" />
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
                  <p className="text-sm font-semibold">Audio Telemetry HUD</p>
                  <p className="text-xs text-muted-foreground">Voice prompts for navigation and critical vital warnings</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={soundAlerts} 
                  onChange={(e) => setSoundAlerts(e.target.checked)}
                  className="h-4 w-4 rounded accent-teal-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between border-t pt-4">
                <div>
                  <p className="text-sm font-semibold">3D Building Extrusions</p>
                  <p className="text-xs text-muted-foreground">Enable 3D tilt & building structures on map</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={mapAutocenter} 
                  onChange={(e) => setMapAutocenter(e.target.checked)}
                  className="h-4 w-4 rounded accent-teal-500 cursor-pointer"
                />
              </div>
            </div>
            <div className="p-4 border-t bg-muted/30 flex justify-end">
              <Button 
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-teal-600 hover:bg-teal-500 text-white"
              >
                Save Preferences
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Global Examiner Defense Presentation Bar */}
      <DefenseDemoBar />
    </div>
  );
};