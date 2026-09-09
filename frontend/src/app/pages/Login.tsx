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
  const [hospitalLogins, setHospitalLogins] = useState<{email: string, hospital_name: string, region?: string, hospital_id?: string}[]>([]);
  const [hospitalSearch, setHospitalSearch] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('All');
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch dynamically generated hospital logins from PostgreSQL database
    fetch('/api/auth/hospital-logins')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setHospitalLogins(data);
        }
      })
      .catch(err => console.error("Failed to fetch hospital logins", err));
  }, []);

  const handleQuickLogin = async (targetEmail: string, targetPass = 'password123') => {
    setEmail(targetEmail);
    setPassword(targetPass);
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: targetEmail, password: targetPass })
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    handleQuickLogin(email, password);
  };

  const regions = ['All', ...Array.from(new Set(hospitalLogins.map(h => h.region).filter(Boolean)))];
  const filteredHospitals = hospitalLogins.filter(h => {
    const matchesSearch = !hospitalSearch || 
      h.hospital_name.toLowerCase().includes(hospitalSearch.toLowerCase()) || 
      h.email.toLowerCase().includes(hospitalSearch.toLowerCase()) ||
      (h.region && h.region.toLowerCase().includes(hospitalSearch.toLowerCase()));
    const matchesRegion = selectedRegion === 'All' || h.region === selectedRegion;
    return matchesSearch && matchesRegion;
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#06111F] text-slate-900 dark:text-[#F8FAFC] flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans transition-colors duration-200">
      <div className="absolute inset-0 bg-grid [background-size:28px_28px] opacity-35 pointer-events-none" />

      <div className="mb-8 flex items-center gap-3 relative z-10">
        <div className="h-12 w-12 bg-red-500/15 border border-red-500/30 text-[#EF4444] rounded-xl flex items-center justify-center shadow-lg shadow-red-500/20 font-mono font-black text-xl">
          <Activity className="h-6 w-6 text-[#EF4444]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white font-mono">PULSEGRID</h1>
          <p className="text-xs text-red-600 dark:text-red-400 font-mono font-semibold">SECURED DISPATCH & HOSPITAL PORTAL</p>
        </div>
      </div>

      <Card className="w-full max-w-lg shadow-2xl bg-white/95 dark:bg-[#111C2D]/95 border border-slate-200 dark:border-white/10 rounded-2xl relative z-10 backdrop-blur-xl">
        <CardHeader className="text-center pb-3">
          <CardTitle className="text-xl text-slate-900 dark:text-white font-mono">Operations Sign In</CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">Enter authenticated credentials to access your live dispatch view</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4 font-mono text-xs">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2.5 border border-slate-300 dark:border-white/10 rounded-xl bg-slate-50 dark:bg-[#081827] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500/50 text-sm font-sans"
                placeholder="officer@ierbms.gov"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2.5 border border-slate-300 dark:border-white/10 rounded-xl bg-slate-50 dark:bg-[#081827] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500/50 text-sm font-sans"
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
            <p className="text-center text-xs text-slate-500 dark:text-slate-400 pt-1 font-sans">
              New medical staff?{' '}
              <a href="/register" className="text-red-600 dark:text-red-400 font-bold hover:underline">
                Create an account
              </a>
            </p>
          </form>
        </CardContent>
      </Card>

      {/* Demo Credentials & One-Click Sign In Section */}
      <div className="w-full max-w-lg mt-6 bg-white/90 dark:bg-[#081827]/90 rounded-2xl p-5 border border-slate-200 dark:border-white/10 shadow-xl relative z-10 font-mono text-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
            <Building2 className="h-4 w-4" /> 1-CLICK AUTHENTICATED PORTALS
          </h3>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/30">
            Live Neon DB
          </span>
        </div>

        {/* 1. System Operational Roles */}
        <div>
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-2">
            National Operations Roles
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('admin@ierbms.gov')}
              className="p-2.5 rounded-xl border border-border/80 bg-slate-100 hover:bg-slate-200 dark:bg-[#111C2D] dark:hover:bg-[#18263D] text-left transition-all cursor-pointer group"
            >
              <span className="block font-bold text-xs text-foreground group-hover:text-red-500">🚨 Dispatcher</span>
              <span className="text-[10px] text-muted-foreground block truncate">admin@ierbms.gov</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('ambulance@ierbms.gov')}
              className="p-2.5 rounded-xl border border-border/80 bg-slate-100 hover:bg-slate-200 dark:bg-[#111C2D] dark:hover:bg-[#18263D] text-left transition-all cursor-pointer group"
            >
              <span className="block font-bold text-xs text-foreground group-hover:text-teal-500">🚑 Paramedic</span>
              <span className="text-[10px] text-muted-foreground block truncate">Unit NAS 201</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('doctor@ierbms.gov')}
              className="p-2.5 rounded-xl border border-border/80 bg-slate-100 hover:bg-slate-200 dark:bg-[#111C2D] dark:hover:bg-[#18263D] text-left transition-all cursor-pointer group"
            >
              <span className="block font-bold text-xs text-foreground group-hover:text-blue-500">🩺 Lead Doctor</span>
              <span className="text-[10px] text-muted-foreground block truncate">doctor@ierbms.gov</span>
            </button>
          </div>
        </div>

        {/* 2. Hospital Portals */}
        <div className="pt-2 border-t border-border/50">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
              Hospital Accounts ({filteredHospitals.length})
            </p>
            <p className="text-[10px] text-muted-foreground">Universal pass: <strong className="text-foreground">password123</strong></p>
          </div>

          {/* Search and Region Filter */}
          <div className="flex flex-col gap-2 mb-3">
            <input
              type="text"
              value={hospitalSearch}
              onChange={(e) => setHospitalSearch(e.target.value)}
              placeholder="Filter by hospital name, city or region..."
              className="w-full px-3 py-1.5 rounded-lg border border-border bg-slate-50 dark:bg-[#0c1c2e] text-foreground text-xs font-sans placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-red-500"
            />
            {regions.length > 2 && (
              <div className="flex items-center gap-1 overflow-x-auto py-1 scrollbar-none">
                {regions.map((reg: any) => (
                  <button
                    key={reg}
                    type="button"
                    onClick={() => setSelectedRegion(reg)}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition-all shrink-0 cursor-pointer ${
                      selectedRegion === reg
                        ? 'bg-red-500 text-white shadow-xs'
                        : 'bg-muted/70 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {reg}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Hospital Cards */}
          <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {filteredHospitals.map((hl, idx) => (
              <div 
                key={idx} 
                className="flex items-center justify-between bg-slate-100 dark:bg-[#111C2D] p-2.5 rounded-xl border border-slate-200 dark:border-white/5 cursor-pointer hover:border-red-500/50 hover:bg-red-500/10 transition-all group"
                onClick={() => handleQuickLogin(hl.email)}
              >
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-900 dark:text-white truncate group-hover:text-red-500 transition-colors">
                      {hl.hospital_name}
                    </span>
                    {hl.region && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold shrink-0">
                        {hl.region}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-red-600 dark:text-red-300/80 font-mono block">
                    {hl.email}
                  </span>
                </div>
                <button
                  type="button"
                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-red-600/10 text-red-600 group-hover:bg-red-600 group-hover:text-white transition-all shrink-0 cursor-pointer"
                >
                  Sign In →
                </button>
              </div>
            ))}
            {filteredHospitals.length === 0 && (
              <p className="text-xs text-center py-4 text-slate-500 dark:text-slate-400">No hospital matches search criteria.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
