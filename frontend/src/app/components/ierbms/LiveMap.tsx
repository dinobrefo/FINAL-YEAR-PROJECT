import * as React from 'react';
import { Emergency, Ambulance, Hospital } from '../../utils/mockData';
import { LeafletMap } from './LeafletMap';

export interface LiveMapProps {
  emergencies: Emergency[];
  ambulances: Ambulance[];
  hospitals: Hospital[];
  center?: [number, number];
  zoom?: number;
  activeRouteCaseId?: string | null;
  isEmergencyMode?: boolean;
  userCoords?: [number, number] | null;
  onExitEmergencyMode?: () => void;
}

/**
 * LiveMap Component (Powered by OpenStreetMap & Leaflet)
 * 100% Free, Zero-API-Key, Operational Geospatial Navigation Engine
 * Features:
 * - CartoDB Dark Matter, Street Voyager & Esri High-Resolution Satellite Views
 * - Turn-by-turn road snapping with OSRM (Open Source Routing Machine)
 * - Autocomplete Search across all Ghanaian hospitals, ambulances, and emergencies
 * - Real-time Voice HUD Audio Telemetry & Alert Beeps
 * - High-Risk Accident Hotspot Heatmap Overlays
 */
export const LiveMap: React.FC<LiveMapProps> = ({
  emergencies,
  ambulances,
  hospitals,
  center = [5.6037, -0.1870],
  zoom = 13,
  activeRouteCaseId = null,
  isEmergencyMode,
  userCoords,
  onExitEmergencyMode
}) => {
  return (
    <LeafletMap
      emergencies={emergencies}
      ambulances={ambulances}
      hospitals={hospitals}
      center={center}
      zoom={zoom}
      activeRouteCaseId={activeRouteCaseId}
      isEmergencyMode={isEmergencyMode}
      userCoords={userCoords}
      onExitEmergencyMode={onExitEmergencyMode}
    />
  );
};

export default LiveMap;
