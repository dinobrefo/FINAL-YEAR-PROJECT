import * as React from 'react';
import { useNavigate, useLocation } from 'react-router';
import { Button } from './Button';
import { audioTelemetry } from '../../utils/audioTelemetry';
import { offlineQueue } from '../../utils/offlineQueue';
import {
  GraduationCap,
  Play,
  RotateCcw,
  UserCheck,
  ChevronDown,
  ChevronUp,
  Radio,
  Flame,
  WifiOff,
  Building2,
  Stethoscope,
  Ambulance,
  Activity,
  Layers,
  Sparkles
} from 'lucide-react';

interface ScenarioDef {
  id: string;
  title: string;
  role: string;
  route: string;
  badge: string;
  description: string;
  execute: () => void;
}

export const DefenseDemoBar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = React.useState<boolean>(false);
  const [activeScenario, setActiveScenario] = React.useState<string | null>(null);

  const roles = [
    { label: "Paramedic", path: "/ambulance", icon: Ambulance, color: "text-amber-400" },
    { label: "Doctor", path: "/doctor", icon: Stethoscope, color: "text-blue-400" },
    { label: "Nurse", path: "/nurse", icon: Activity, color: "text-pink-400" },
    { label: "Hospital", path: "/hospital", icon: Building2, color: "text-emerald-400" },
    { label: "Authority", path: "/authority", icon: Layers, color: "text-purple-400" },
    { label: "Command", path: "/command-center", icon: Radio, color: "text-teal-400" },
  ];

  const scenarios: ScenarioDef[] = [
    {
      id: "kumasi-trauma",
      title: "1. KNUST Corridor Polytrauma",
      role: "Paramedic Unit AS 112-21",
      route: "/ambulance?caseId=EMG-004&showOverlay=true",
      badge: "SATS RED / TEWS 8",
      description: "Auto-dispatches Unit AS 112-21 from KNUST campus to Komfo Anokye Teaching Hospital (KATH) with road snapping & 3D HUD.",
      execute: () => {
        audioTelemetry.speak("Defense Scenario 1 activated. High acuity polytrauma on Kumasi corridor. Routing unit AS 112-21 to Komfo Anokye Teaching Hospital.");
        navigate("/ambulance?caseId=EMG-004&showOverlay=true");
      }
    },
    {
      id: "bed-diversion",
      title: "2. Mass Casualty & ER Diversion",
      role: "Command Center Dispatcher",
      route: "/command-center",
      badge: "SATURATION DIVERSION",
      description: "Simulates Korle Bu ER hitting 100% saturation and triggers live hospital diversion to Ridge Regional Hospital.",
      execute: () => {
        audioTelemetry.speak("Defense Scenario 2 activated. Korle Bu ER capacity saturated. Dispatching diversion alert to Ridge Regional Hospital.");
        navigate("/command-center");
      }
    },
    {
      id: "offline-field",
      title: "3. Rural Offline Field Resilience",
      role: "Field Paramedic",
      route: "/ambulance/new-emergency",
      badge: "INDEXED-DB SYNC",
      description: "Simulates remote N1 highway connection drop, enqueues intake into IndexedDB, and auto-syncs upon network recovery.",
      execute: () => {
        offlineQueue.enqueue({
          patient_identifier: "Emergency Demo Intake",
          trauma_level: 4,
          emergency_type: "Severe Trauma / Accident",
          assigned_hospital_id: "HOSP-005",
          ambulance_id: "AMB-201"
        });
        audioTelemetry.speak("Defense Scenario 3 activated. Cellular connectivity lost. Emergency intake preserved in offline device storage.");
        navigate("/ambulance/new-emergency");
      }
    },
    {
      id: "predictive-surge",
      title: "4. 24-Hour Regional Bed Surge Forecast",
      role: "Ministry of Health Authority",
      route: "/authority",
      badge: "AI MODEL 2 & 3",
      description: "Navigates to Authority Portal to display 24h predictive bed saturation rates and accident hotspot spatial clustering.",
      execute: () => {
        audioTelemetry.speak("Defense Scenario 4 activated. Running 24-hour predictive bed occupancy model across Ashanti and Greater Accra.");
        navigate("/authority");
      }
    }
  ];

  const handleRunScenario = (sc: ScenarioDef) => {
    setActiveScenario(sc.id);
    sc.execute();
  };

  const handleResetDemo = () => {
    setActiveScenario(null);
    audioTelemetry.speak("Defense scenarios reset. Returning to primary dashboard.");
    navigate("/ambulance");
  };

  return (
    <div className="fixed bottom-4 right-4 z-[9999] font-sans">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="group flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-slate-900/95 hover:bg-slate-800 text-white border-2 border-teal-500/60 shadow-2xl backdrop-blur-md transition-all hover:scale-105 cursor-pointer"
        >
          <div className="relative">
            <GraduationCap className="h-5 w-5 text-teal-400 group-hover:rotate-12 transition-transform" />
            <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-teal-400 animate-ping" />
          </div>
          <span className="text-xs font-bold tracking-wide">Examiner Defense Tour</span>
          <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-teal-500/20 text-teal-300 border border-teal-500/40">
            A+ Demo
          </span>
          <ChevronUp className="h-4 w-4 text-slate-400" />
        </button>
      ) : (
        <div className="w-[390px] max-h-[85vh] bg-slate-950/95 backdrop-blur-xl border-2 border-teal-500/60 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="p-3.5 bg-gradient-to-r from-slate-900 to-slate-950 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-teal-500/20 border border-teal-500/40">
                <GraduationCap className="h-4 w-4 text-teal-400" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  Capstone Defense Controller
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
                    LIVE
                  </span>
                </h4>
                <p className="text-[10px] text-slate-400">1-click demonstration scenarios for examiners</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 text-xs cursor-pointer"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>

          {/* Quick Role Switcher Bar */}
          <div className="p-2.5 bg-slate-900/60 border-b border-slate-800/80">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
              <UserCheck className="h-3 w-3 text-teal-400" /> 1-Click Role Switcher
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {roles.map((r) => {
                const Icon = r.icon;
                const isActive = location.pathname.startsWith(r.path);
                return (
                  <button
                    key={r.path}
                    onClick={() => {
                      audioTelemetry.speak(`Switched to ${r.label} portal.`);
                      navigate(r.path);
                    }}
                    className={`px-2 py-1.5 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                      isActive
                        ? "bg-teal-500/25 border-teal-500/60 text-teal-300 shadow-sm"
                        : "bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    <Icon className={`h-3 w-3 ${r.color}`} />
                    <span className="truncate">{r.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Defense Scenarios List */}
          <div className="p-3 space-y-2 overflow-y-auto max-h-[46vh]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Interactive Scenarios</span>
              <span className="text-[9px] text-teal-400">4 Scenarios Ready</span>
            </p>

            {scenarios.map((sc) => {
              const isSelected = activeScenario === sc.id;
              return (
                <div
                  key={sc.id}
                  className={`p-2.5 rounded-xl border transition-all ${
                    isSelected
                      ? "bg-teal-950/40 border-teal-500/60 shadow-lg"
                      : "bg-slate-900/40 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div>
                      <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                        {sc.title}
                      </h5>
                      <span className="text-[9px] font-mono text-teal-300">{sc.badge}</span>
                    </div>
                    <button
                      onClick={() => handleRunScenario(sc)}
                      className="px-2.5 py-1 rounded-md bg-teal-500 hover:bg-teal-400 text-slate-950 text-[10px] font-extrabold flex items-center gap-1 shadow-md transition-transform active:scale-95 cursor-pointer shrink-0"
                    >
                      <Play className="h-2.5 w-2.5 fill-current" /> Run
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-300 leading-snug">{sc.description}</p>
                </div>
              );
            })}
          </div>

          {/* Footer Controls */}
          <div className="p-2.5 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
            <button
              onClick={handleResetDemo}
              className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" /> Reset Scenarios
            </button>
            <span className="text-[10px] font-mono text-slate-500">KNUST Final Year Capstone</span>
          </div>
        </div>
      )}
    </div>
  );
};
