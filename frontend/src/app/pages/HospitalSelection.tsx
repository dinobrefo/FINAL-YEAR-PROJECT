import React from 'react';
import { useNavigate } from 'react-router';
import { useRealTime } from '../components/ierbms/RealTimeProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ierbms/Card';
import { Building2, MapPin } from 'lucide-react';
import { AppShell } from '../components/ierbms/Navigation';

export const HospitalSelection: React.FC = () => {
  const { hospitals } = useRealTime();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedRegion, setSelectedRegion] = React.useState('All');

  // Extract regions
  const regions = React.useMemo(() => {
    const set = new Set<string>();
    hospitals.forEach(h => {
      const parts = h.location?.address?.split(',') || [];
      const regionCandidate = parts[parts.length - 1]?.trim();
      if (regionCandidate && regionCandidate !== 'Ghana') {
        set.add(regionCandidate);
      }
    });
    return ['All', 'Ashanti', 'Greater Accra', 'Northern', 'Central', 'Volta', 'Eastern', 'Western', 'Bono', 'Upper East', 'Upper West'];
  }, [hospitals]);

  const filteredHospitals = React.useMemo(() => {
    return hospitals
      .filter(h => {
        const matchesSearch = !searchTerm || 
          h.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
          h.location?.address?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRegion = selectedRegion === 'All' || 
          h.location?.address?.toLowerCase().includes(selectedRegion.toLowerCase()) ||
          h.name.toLowerCase().includes(selectedRegion.toLowerCase());
        return matchesSearch && matchesRegion;
      })
      .sort((a, b) => (b.totalBeds || 0) - (a.totalBeds || 0));
  }, [hospitals, searchTerm, selectedRegion]);

  return (
    <AppShell role="hospital" userName="Staff Member">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Select Hospital Portal</h1>
            <p className="text-muted-foreground mt-1">
              Choose a medical center to monitor live patient telemetry, incoming ambulances, and bed occupancy.
            </p>
          </div>
          <span className="px-3 py-1 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold rounded-full text-xs self-start md:self-auto border border-emerald-500/30">
            {filteredHospitals.length} Hospitals Synced (Live DB)
          </span>
        </div>

        {/* Search & Region Filter Bar */}
        <div className="bg-card border border-border/70 rounded-2xl p-4 shadow-sm space-y-3">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search hospitals across Ghana by name, region, or address..."
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-muted/40 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />

          <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
            {regions.map((reg) => (
              <button
                key={reg}
                onClick={() => setSelectedRegion(reg)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                  selectedRegion === reg
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground'
                }`}
              >
                {reg}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredHospitals.slice(0, 36).map((hospital) => (
            <Card 
              key={hospital.id} 
              className="cursor-pointer hover:border-[var(--primary)] hover:shadow-lg transition-all flex flex-col justify-between"
              onClick={() => navigate(`/hospital/${hospital.id}`)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-10 w-10 bg-[var(--primary)]/10 rounded-xl flex items-center justify-center shrink-0">
                    <Building2 className="h-5 w-5 text-[var(--primary)]" />
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="text-base truncate">{hospital.name}</CardTitle>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      {hospital.totalBeds > 500 ? 'Teaching Hospital' : 'Regional / General'}
                    </span>
                  </div>
                </div>
                <CardDescription className="flex items-center gap-1 truncate text-xs">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span className="truncate">{hospital.location?.address || 'Ghana'}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-muted/70 p-2 rounded-lg">
                    <p className="font-bold text-foreground">{hospital.availableBeds}</p>
                    <p className="text-[10px] text-muted-foreground">Gen Beds</p>
                  </div>
                  <div className="bg-muted/70 p-2 rounded-lg">
                    <p className="font-bold text-blue-500">{hospital.icuBeds?.available ?? 0}</p>
                    <p className="text-[10px] text-muted-foreground">ICU Free</p>
                  </div>
                  <div className="bg-muted/70 p-2 rounded-lg">
                    <p className="font-bold text-emerald-500">{hospital.totalBeds}</p>
                    <p className="text-[10px] text-muted-foreground">Capacity</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {filteredHospitals.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No hospitals found matching your filter criteria.</p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
};
