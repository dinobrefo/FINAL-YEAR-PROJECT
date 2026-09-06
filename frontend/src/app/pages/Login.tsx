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
        case 'nurse':
          navigate('/nurse');
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
        case 'authority':
          navigate('/authority');
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
    <div className="min-h-screen bg-[#06111F] text-[#F8FAFC] flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="absolute inset-0 bg-grid [background-size:28px_28px] opacity-35 pointer-events-none" />

      <div className="mb-8 flex items-center gap-3 relative z-10">
        <div className="h-12 w-12 bg-red-500/15 border border-red-500/30 text-[#EF4444] rounded-xl flex items-center justify-center shadow-lg shadow-red-500/20 font-mono font-black text-xl">
          <Activity className="h-6 w-6 text-[#EF4444]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-mono">IERBMS</h1>
          <p className="text-xs text-red-400 font-mono font-semibold">SECURED DISPATCH & HOSPITAL PORTAL</p>
        </div>
      </div>

      <Card className="w-full max-w-md shadow-2xl bg-[#111C2D]/95 border-white/10 rounded-2xl relative z-10 backdrop-blur-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-xl text-white font-mono">Operations Sign In</CardTitle>
          <CardDescription className="text-slate-400">Enter authenticated credentials to access your dispatch view</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4 font-mono text-xs">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-slate-300">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2.5 border border-white/10 rounded-xl bg-[#081827] text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500/50 text-sm font-sans"
                placeholder="officer@ierbms.gov.gh"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-slate-300">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2.5 border border-white/10 rounded-xl bg-[#081827] text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500/50 text-sm font-sans"
                placeholder="••••••••"
              />
            </div>
            {error && (
              <div className="p-3 text-xs text-[#FF2A4D] bg-[#FF2A4D]/10 border border-[#FF2A4D]/20 rounded-xl">
                {error}
              </div>
            )}
            <Button type="submit" variant="primary" className="w-full py-3 rounded-xl font-bold font-mono text-sm bg-[#EF4444] text-white hover:bg-[#DC2626] shadow-[0_0_40px_-8px_rgba(239,68,68,0.45)] cursor-pointer" disabled={loading}>
              {loading ? 'Authenticating Security Grid...' : 'Authorize Session'}
            </Button>
            <p className="text-center text-xs text-slate-400 pt-1 font-sans">
              New medical staff?{' '}
              <a href="/register" className="text-red-400 font-bold hover:underline">
                Create an account
              </a>
            </p>
          </form>
        </CardContent>
      </Card>

      {/* Demo Credentials Section */}
      <div className="w-full max-w-md mt-6 bg-[#081827]/90 rounded-2xl p-4 border border-white/10 shadow-xl relative z-10 font-mono text-xs">
        <h3 className="text-xs font-bold text-red-400 mb-1 flex items-center gap-2">
          <Building2 className="h-4 w-4" /> DEMO PORTAL CREDENTIALS
        </h3>
        <p className="text-[11px] text-slate-400 mb-3">
          Universal verification password: <strong className="text-white">password123</strong>
        </p>
        <div className="max-h-44 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
          {hospitalLogins.map((hl, idx) => (
            <div 
              key={idx} 
              className="flex flex-col bg-[#111C2D] p-2.5 rounded-xl border border-white/5 cursor-pointer hover:border-red-500/40 hover:bg-red-500/10 transition-colors"
              onClick={() => setEmail(hl.email)}
            >
              <span className="text-xs font-semibold text-white">{hl.hospital_name}</span>
              <span className="text-[11px] text-red-300/80">{hl.email}</span>
            </div>
          ))}
          {hospitalLogins.length === 0 && (
            <p className="text-xs text-slate-400">Loading seeded hospitals...</p>
          )}
        </div>
      </div>
    </div>
  );
};
