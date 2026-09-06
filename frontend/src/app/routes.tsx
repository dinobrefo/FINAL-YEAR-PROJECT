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

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Home />,
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