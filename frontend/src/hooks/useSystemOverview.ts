import { useState, useEffect } from 'react';

export interface SystemOverviewData {
  connectedHospitals: number;
  activeAmbulances: number;
  totalEmergencies: number;
  regionsCovered: number;
  hasData: boolean;
  emptyStateMessage: string;
}

export interface SystemOverviewState {
  data: SystemOverviewData | null;
  loading: boolean;
  error: string | null;
}

export function useSystemOverview(): SystemOverviewState {
  const [state, setState] = useState<SystemOverviewState>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let isMounted = true;

    async function fetchOverview() {
      try {
        const response = await fetch('/api/analytics/overview');
        if (!response.ok) {
          throw new Error(`Server returned HTTP ${response.status}`);
        }
        const json: SystemOverviewData = await response.json();
        if (isMounted) {
          setState({
            data: json,
            loading: false,
            error: null,
          });
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Network failure';
        if (isMounted) {
          setState((prev) => ({
            data: prev.data,
            loading: false,
            error: `Live system data is currently unavailable (${message})`,
          }));
        }
      }
    }

    // Initial fetch
    fetchOverview();

    // Poll every 30s as specified
    const interval = setInterval(fetchOverview, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return state;
}
