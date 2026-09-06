import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ierbms/Card';
import { Button } from '../components/ierbms/Button';
import { Activity, ShieldCheck, UserPlus, CheckCircle } from 'lucide-react';
import { useRealTime } from '../components/ierbms/RealTimeProvider';

export const Register: React.FC = () => {
  const { hospitals } = useRealTime();
  const { login } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('nurse');
  const [hospitalId, setHospitalId] = useState('');
  const [staffId, setStaffId] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (hospitals.length > 0 && !hospitalId) {
      setHospitalId(hospitals[0].id);
    }
  }, [hospitals, hospitalId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          email,
          phone,
          password,
          role,
          hospital_id: (role === 'hospital' || role === 'doctor' || role === 'nurse') ? hospitalId : null
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      setSuccess(true);
      setTimeout(() => {
        // Auto sign in or route to login
        navigate('/login');
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#06111F] text-[#F8FAFC] flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="absolute inset-0 bg-grid [background-size:28px_28px] opacity-35 pointer-events-none" />

      <div className="mb-6 flex items-center gap-3 relative z-10">
        <div className="h-12 w-12 bg-red-500/15 border border-red-500/30 text-[#EF4444] rounded-xl flex items-center justify-center shadow-lg shadow-red-500/20 font-mono font-black text-xl">
          <Activity className="h-6 w-6 text-[#EF4444]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-mono">IERBMS</h1>
          <p className="text-xs text-red-400 font-mono font-semibold">HEALTHCARE STAFF ENROLLMENT</p>
        </div>
      </div>

      <Card className="w-full max-w-lg shadow-2xl bg-[#111C2D]/95 border-white/10 rounded-2xl relative z-10 backdrop-blur-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-xl text-white font-mono">Create Portal Account</CardTitle>
          <CardDescription className="text-slate-400">Register for role-based emergency access & hospital coordination</CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="p-6 text-center space-y-3 font-mono">
              <CheckCircle className="h-12 w-12 text-emerald-400 mx-auto animate-bounce" />
              <h3 className="text-lg font-bold text-white">Registration Successful!</h3>
              <p className="text-xs text-slate-400">Redirecting to login portal...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 font-mono text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-slate-300">Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    placeholder="Kwabena Brefo"
                    className="w-full p-2.5 border border-white/10 rounded-xl bg-[#081827] text-white text-sm font-sans focus:ring-2 focus:ring-red-500 focus:border-red-500/50 focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-slate-300">Phone Number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    placeholder="+233 24 123 4567"
                    className="w-full p-2.5 border border-white/10 rounded-xl bg-[#081827] text-white text-sm font-sans focus:ring-2 focus:ring-red-500 focus:border-red-500/50 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-slate-300">Work Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="name@hospital.gov.gh"
                  className="w-full p-2.5 border border-white/10 rounded-xl bg-[#081827] text-white text-sm font-sans focus:ring-2 focus:ring-red-500 focus:border-red-500/50 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-slate-300">System Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full p-2.5 border border-white/10 rounded-xl bg-[#081827] text-white text-sm font-sans cursor-pointer focus:ring-2 focus:ring-red-500 focus:border-red-500/50 focus:outline-none"
                  >
                    <option value="nurse">Nurse (Ward & Triage)</option>
                    <option value="doctor">On-Duty Doctor (Physician)</option>
                    <option value="ambulance">Ambulance Paramedic</option>
                    <option value="hospital">Hospital Administrator</option>
                    <option value="authority">Health Authority (NAS/MOH)</option>
                  </select>
                </div>

                {(role === 'hospital' || role === 'doctor' || role === 'nurse') && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-slate-300">Affiliated Facility</label>
                    <select
                      value={hospitalId}
                      onChange={(e) => setHospitalId(e.target.value)}
                      className="w-full p-2.5 border border-white/10 rounded-xl bg-[#081827] text-white text-sm font-sans cursor-pointer focus:ring-2 focus:ring-red-500 focus:border-red-500/50 focus:outline-none"
                    >
                      {hospitals.map(h => (
                        <option key={h.id} value={h.id}>{h.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-slate-300">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full p-2.5 border border-white/10 rounded-xl bg-[#081827] text-white text-sm font-sans focus:ring-2 focus:ring-red-500 focus:border-red-500/50 focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-slate-300">Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full p-2.5 border border-white/10 rounded-xl bg-[#081827] text-white text-sm font-sans focus:ring-2 focus:ring-red-500 focus:border-red-500/50 focus:outline-none"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 text-xs text-[#FF2A4D] bg-[#FF2A4D]/10 border border-[#FF2A4D]/20 rounded-xl">
                  {error}
                </div>
              )}

              <Button type="submit" variant="primary" className="w-full cursor-pointer py-3 rounded-xl font-bold font-mono text-sm bg-[#EF4444] text-white hover:bg-[#DC2626] shadow-[0_0_40px_-8px_rgba(239,68,68,0.45)]" disabled={loading}>
                <UserPlus className="h-4 w-4" />
                {loading ? 'Creating Account...' : 'Enroll Portal Account'}
              </Button>

              <p className="text-center text-xs text-slate-400 pt-2 font-sans">
                Already registered?{' '}
                <Link to="/login" className="text-red-400 font-bold hover:underline">
                  Sign in here
                </Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
export default Register;
