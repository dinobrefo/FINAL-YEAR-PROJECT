import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ierbms/Card';
import { Button } from '../components/ierbms/Button';
import { Activity, Building2 } from 'lucide-react';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [hospitalLogins, setHospitalLogins] = useState<{email: string, hospital_name: string}[]>([]);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch dynamically generated hospital logins for demo purposes
    fetch('/api/auth/hospital-logins')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setHospitalLogins(data);
        }
      })
      .catch(err => console.error("Failed to fetch hospital logins", err));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      login(data.token, data.user);
      
      // Route based on role
      switch (data.user.role) {
        case 'doctor':
          navigate('/doctor');
          break;
        case 'hospital':
          if (data.user.hospital_id) {
            navigate(`/hospital/${data.user.hospital_id}`);
          } else {
            navigate('/hospitals');
          }
          break;
        case 'ambulance':
          navigate('/ambulance');
          break;
        case 'admin':
          navigate('/command');
          break;
        default:
          navigate('/');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="mb-8 flex items-center gap-3">
        <div className="h-12 w-12 bg-[var(--primary)] rounded-xl flex items-center justify-center shadow-lg">
          <Activity className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">IERBMS</h1>
          <p className="text-sm text-muted-foreground font-medium">Secured Portal</p>
        </div>
      </div>

      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <CardTitle>Welcome back</CardTitle>
          <CardDescription>Enter your credentials to access your dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                placeholder="staff@ierbms.gov"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                placeholder="••••••••"
              />
            </div>
            {error && (
              <div className="p-3 text-sm text-[var(--danger)] bg-[var(--danger)]/10 rounded-md">
                {error}
              </div>
            )}
            <Button type="submit" variant="primary" className="w-full" disabled={loading}>
              {loading ? 'Authenticating...' : 'Sign In'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Demo Credentials Section */}
      <div className="w-full max-w-md mt-6 bg-accent rounded-lg p-4 border shadow-sm">
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
          <Building2 className="h-4 w-4" /> Available Hospital Portals (Demo)
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          Password for all accounts is <strong>password123</strong>
        </p>
        <div className="max-h-48 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
          {hospitalLogins.map((hl, idx) => (
            <div 
              key={idx} 
              className="flex flex-col bg-background p-2 rounded border cursor-pointer hover:border-[var(--primary)] transition-colors"
              onClick={() => setEmail(hl.email)}
            >
              <span className="text-xs font-semibold">{hl.hospital_name}</span>
              <span className="text-xs text-muted-foreground">{hl.email}</span>
            </div>
          ))}
          {hospitalLogins.length === 0 && (
            <p className="text-xs text-muted-foreground">No hospitals seeded yet.</p>
          )}
        </div>
      </div>
    </div>
  );
};
