import React from 'react';
import { useNavigate } from 'react-router';
import { useRealTime } from '../components/ierbms/RealTimeProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ierbms/Card';
import { Building2, MapPin } from 'lucide-react';
import { AppShell } from '../components/ierbms/Navigation';

export const HospitalSelection: React.FC = () => {
  const { hospitals } = useRealTime();
  const navigate = useNavigate();

  return (
    <AppShell role="hospital" userName="Staff Member">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Select Hospital Portal</h1>
          <p className="text-muted-foreground mt-2">
            Choose the hospital facility you are currently operating in to view incoming emergencies.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          {hospitals.map((hospital) => (
            <Card 
              key={hospital.id} 
              className="cursor-pointer hover:border-[var(--primary)] hover:shadow-lg transition-all"
              onClick={() => navigate(`/hospital/${hospital.id}`)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-10 w-10 bg-[var(--primary)]/10 rounded-lg flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-[var(--primary)]" />
                  </div>
                  <CardTitle className="text-xl">{hospital.name}</CardTitle>
                </div>
                <CardDescription className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {hospital.location?.address || 'Kumasi, Ghana'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm mt-2">
                  <div className="bg-muted p-2 rounded-md text-center">
                    <p className="font-semibold">{hospital.availableBeds}</p>
                    <p className="text-xs text-muted-foreground">Available Beds</p>
                  </div>
                  <div className="bg-muted p-2 rounded-md text-center">
                    <p className="font-semibold">{hospital.icuBeds?.available || 0}</p>
                    <p className="text-xs text-muted-foreground">ICU Beds</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {hospitals.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No hospitals loaded yet. Please wait or check database connection.</p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
};
