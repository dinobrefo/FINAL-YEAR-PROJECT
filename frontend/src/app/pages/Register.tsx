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
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="mb-6 flex items-center gap-3">
        <div className="h-12 w-12 bg-[var(--primary)] rounded-xl flex items-center justify-center shadow-lg">
          <Activity className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">IERBMS</h1>
          <p className="text-sm text-muted-foreground font-medium">Healthcare Staff Registration</p>
        </div>
      </div>

      <Card className="w-full max-w-lg shadow-2xl">
        <CardHeader className="text-center">
          <CardTitle>Create Portal Account</CardTitle>
          <CardDescription>Register for role-based emergency access & hospital coordination</CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="p-6 text-center space-y-3">
              <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto animate-bounce" />
              <h3 className="text-lg font-bold text-foreground">Registration Successful!</h3>
              <p className="text-sm text-muted-foreground">Redirecting to login portal...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    placeholder="Kwabena Brefo"
                    className="w-full p-2.5 border rounded-lg bg-background text-sm focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Phone Number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    placeholder="+233 24 123 4567"
                    className="w-full p-2.5 border rounded-lg bg-background text-sm focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-muted-foreground">Work Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="name@hospital.gov.gh"
                  className="w-full p-2.5 border rounded-lg bg-background text-sm focus:ring-2 focus:ring-[var(--primary)]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground">System Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full p-2.5 border rounded-lg bg-background text-sm cursor-pointer"
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
                    <label className="text-xs font-bold uppercase text-muted-foreground">Affiliated Facility</label>
                    <select
                      value={hospitalId}
                      onChange={(e) => setHospitalId(e.target.value)}
                      className="w-full p-2.5 border rounded-lg bg-background text-sm cursor-pointer"
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
                  <label className="text-xs font-bold uppercase text-muted-foreground">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full p-2.5 border rounded-lg bg-background text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full p-2.5 border rounded-lg bg-background text-sm"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 text-xs text-[var(--danger)] bg-[var(--danger)]/10 rounded-lg">
                  {error}
                </div>
              )}

              <Button type="submit" variant="primary" className="w-full cursor-pointer py-2.5" disabled={loading}>
                <UserPlus className="h-4 w-4" />
                {loading ? 'Creating Account...' : 'Register Account'}
              </Button>

              <p className="text-center text-xs text-muted-foreground pt-2">
                Already registered?{' '}
                <Link to="/login" className="text-[var(--primary)] font-bold hover:underline">
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
