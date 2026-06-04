import { RouterProvider } from 'react-router';
import { router } from './routes';
import { ThemeProvider } from './components/ierbms/ThemeProvider';
import { RealTimeProvider } from './components/ierbms/RealTimeProvider';
import { AuthProvider } from './context/AuthContext';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RealTimeProvider>
          <RouterProvider router={router} />
        </RealTimeProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}