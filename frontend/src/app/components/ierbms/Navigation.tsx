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
    <nav className={cn("flex flex-col gap-2 p-4", className)}>
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
              "flex items-center gap-3.5 px-4 py-3 rounded-2xl transition-all duration-300 group",
              isActive
                ? "bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-lg shadow-teal-500/30 font-bold"
                : "text-muted-foreground hover:bg-teal-500/10 hover:text-teal-600 dark:hover:text-teal-400 font-medium"
            )}
          >
            <Icon className={cn("h-5 w-5 transition-transform group-hover:scale-110", isActive ? "text-white" : "text-teal-600/70 dark:text-teal-400/70")} />
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

  const toggleTheme = () => {
    setTheme(effectiveTheme === "dark" ? "light" : "dark");
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Derive current page title for CoachPro header
  const pageTitle = React.useMemo(() => {
    const p = location.pathname;
    if (p.includes("/map")) return "Live Map Telemetry";
    if (p.includes("/ambulances")) return "Ambulance Fleet";
    if (p.includes("/hospitals")) return "Hospital Directory";
    if (p.includes("/analytics")) return "System Analytics";
    if (p.includes("/new-emergency")) return "Emergency Intake";
    if (p.includes("/cases")) return "Active Emergency Cases";
    return "Dashboard";
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-teal-50/40 to-purple-50/30 dark:from-[#0b1320] dark:via-[#0c1a24] dark:to-[#140e28] text-foreground p-3 sm:p-6 transition-colors duration-500">
      {/* Outer CoachPro Container Shell */}
      <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row gap-6 items-start">
        
        {/* Sticky Fixed-Height Sidebar (Fits in window, never disappears on scroll) */}
        <aside className="w-full md:w-64 bg-card/80 backdrop-blur-xl border border-white/60 dark:border-white/10 rounded-[32px] shadow-2xl shadow-teal-500/5 flex flex-col md:sticky md:top-6 md:max-h-[calc(100vh-3rem)] overflow-hidden shrink-0">
          <div className="p-6 border-b border-border/40">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-teal-600 to-cyan-500 flex items-center justify-center shadow-md shadow-teal-500/30 text-white font-black text-lg">
                I
              </div>
              <div>
                <h1 className="text-lg font-black tracking-tight text-foreground">IERBMS</h1>
                <p className="text-[11px] font-semibold text-teal-600 dark:text-teal-400 capitalize">{role} Portal</p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto py-2">
            <Navigation role={role} />
          </div>

          <div className="p-4 border-t border-border/40 space-y-1.5">
            <button
              onClick={toggleTheme}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-muted-foreground hover:text-foreground hover:bg-teal-500/10 transition-all cursor-pointer text-xs font-semibold"
            >
              {effectiveTheme === "dark" ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4 text-blue-500" />
              )}
              <span>{effectiveTheme === "dark" ? "Light Mode" : "Dark Mode"}</span>
            </button>

            <button 
              onClick={() => setShowNotifications(true)}
              className="w-full flex items-center justify-between px-4 py-2.5 rounded-2xl text-muted-foreground hover:text-foreground hover:bg-teal-500/10 transition-all cursor-pointer text-xs font-semibold"
            >
              <div className="flex items-center gap-3">
                <Bell className="h-4 w-4 text-teal-500" />
                <span>Notifications</span>
              </div>
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            </button>

            <button 
              onClick={() => setShowSettings(true)}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-muted-foreground hover:text-foreground hover:bg-teal-500/10 transition-all cursor-pointer text-xs font-semibold"
            >
              <Settings className="h-4 w-4 text-teal-500" />
              <span>Settings</span>
            </button>

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-red-500 hover:bg-red-500/10 transition-all cursor-pointer text-xs font-semibold"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* Scrollable Main Content Workspace Panel */}
        <main className="flex-1 bg-card/70 backdrop-blur-xl border border-white/60 dark:border-white/10 rounded-[32px] shadow-2xl shadow-teal-500/5 p-6 md:p-8 flex flex-col min-w-0">
          {/* CoachPro Top Header Bar */}
          <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <p className="text-xs font-semibold text-teal-600 dark:text-teal-400 flex items-center gap-1.5">
                Welcome back, {userName || "Officer"} <span className="animate-bounce inline-block">👋</span>
              </p>
              <h2 className="text-3xl font-black text-foreground tracking-tight mt-0.5">{pageTitle}</h2>
            </div>

            <div className="flex items-center gap-3">
              <button 
                onClick={() => setShowSettings(true)}
                className="h-10 w-10 rounded-2xl bg-card/80 border border-border/60 hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground transition-all cursor-pointer shadow-sm"
                title="Search Dashboard"
              >
                <Search className="h-4 w-4" />
              </button>

              <button 
                onClick={() => setShowNotifications(true)}
                className="h-10 w-10 rounded-2xl bg-card/80 border border-border/60 hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground transition-all relative cursor-pointer shadow-sm"
                title="Notifications"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-red-500" />
              </button>

              {/* User Profile Avatar Pill */}
              <div className="flex items-center gap-2.5 pl-2 py-1 pr-3 bg-card/90 border border-border/60 rounded-full shadow-sm">
                <img 
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80" 
                  alt="Profile" 
                  className="h-8 w-8 rounded-full object-cover ring-2 ring-teal-500/40"
                />
                <span className="text-xs font-bold text-foreground hidden sm:inline-block">{userName || "Chief Commander"}</span>
              </div>
            </div>
          </header>

          {/* Children Content Area (Scrolls naturally) */}
          <div className="flex-1 min-w-0">
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
    </div>
  );
};