import { createBrowserRouter } from "react-router";
import { Navigate } from "react-router";
import { Home } from "./pages/Home";
import { AmbulanceDashboard } from "./pages/AmbulanceDashboard";
import { HospitalDashboard } from "./pages/HospitalDashboard";
import { HospitalSelection } from "./pages/HospitalSelection";
import { DoctorDashboard } from "./pages/DoctorDashboard";
import { HospitalSettings } from "./pages/HospitalSettings";
import { CommandCenterDashboard } from "./pages/CommandCenterDashboard";
import { NewEmergency } from "./pages/NewEmergency";
import { Login } from "./pages/Login";
import { AuthProvider, useAuth } from "./context/AuthContext";

import { NurseDashboard } from "./pages/NurseDashboard";
import { AuthorityDashboard } from "./pages/AuthorityDashboard";
import { Register } from "./pages/Register";

const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) => {
  const { user, token } = useAuth();
  
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }
  
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

// Wrapper for the entire app to provide auth context
export const AppWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
};

// Global error boundary for router
const RootErrorBoundary = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#06111F] text-[#F8FAFC] p-4">
      <div className="max-w-md w-full bg-[#0B1B2B] border border-white/10 rounded-2xl p-8 text-center shadow-2xl">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-[#FF2A4D]">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">System Telemetry Interrupted</h1>
        <p className="text-sm text-slate-400 mb-6">
          An unexpected interface anomaly occurred. All backend telemetry and emergency dispatch services remain operational.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 rounded-lg bg-[#00E5FF] text-[#06111F] font-semibold text-sm hover:brightness-110 transition-all cursor-pointer"
          >
            Reconnect Session
          </button>
          <a
            href="/"
            className="px-5 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white font-medium text-sm hover:bg-white/10 transition-all inline-flex items-center justify-center"
          >
            Return to Operations
          </a>
        </div>
      </div>
    </div>
  );
};

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Home />,
    errorElement: <RootErrorBoundary />,
  },
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/register",
    element: <Register />,
  },
  // Ambulance Dashboard & Sub-routes
  {
    path: "/ambulance/new-emergency",
    element: <ProtectedRoute allowedRoles={['ambulance', 'admin']}><NewEmergency /></ProtectedRoute>,
  },
  {
    path: "/ambulance/*",
    element: <ProtectedRoute allowedRoles={['ambulance', 'admin']}><AmbulanceDashboard /></ProtectedRoute>,
  },
  // Hospital Dashboard & Sub-routes
  {
    path: "/hospitals",
    element: <ProtectedRoute allowedRoles={['hospital', 'admin']}><HospitalSelection /></ProtectedRoute>,
  },
  {
    path: "/hospital/:hospitalId/settings",
    element: <ProtectedRoute allowedRoles={['hospital', 'admin']}><HospitalSettings /></ProtectedRoute>,
  },
  {
    path: "/hospital/:hospitalId/*",
    element: <ProtectedRoute allowedRoles={['hospital', 'admin']}><HospitalDashboard /></ProtectedRoute>,
  },
  // Nurse Dashboard & Sub-routes
  {
    path: "/nurse/*",
    element: <ProtectedRoute allowedRoles={['nurse', 'hospital', 'admin']}><NurseDashboard /></ProtectedRoute>,
  },
  // Doctor Dashboard & Sub-routes
  {
    path: "/doctor/*",
    element: <ProtectedRoute allowedRoles={['doctor', 'admin']}><DoctorDashboard /></ProtectedRoute>,
  },
  // Command Center
  {
    path: "/command/*",
    element: <ProtectedRoute allowedRoles={['admin']}><CommandCenterDashboard /></ProtectedRoute>,
  },
  // Health Authority
  {
    path: "/authority/*",
    element: <ProtectedRoute allowedRoles={['authority', 'admin']}><AuthorityDashboard /></ProtectedRoute>,
  },
  {
    path: "*",
    element: (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-[var(--primary)] mb-4">404</h1>
          <p className="text-xl text-muted-foreground mb-8">Page not found</p>
          <a
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition-all"
          >
            Return Home
          </a>
        </div>
      </div>
    ),
  },
]);