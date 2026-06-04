import React from 'react';

export default function CommandCenterPortal() {
  return (
    <div className="portal-container">
      <h1 className="page-title">Emergency Command Center</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        <div className="glass-panel" style={{ minHeight: '600px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: 'var(--text-secondary)' }}>City-Wide Map Visualization (Google Maps API)</p>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="glass-panel">
            <h3>Active Incidents</h3>
            <div style={{ marginTop: '16px' }}>
              <div style={{ padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 'bold' }}>Amb #402</span>
                  <span style={{ color: 'var(--danger)' }}>Trauma Level 5</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Routing to Central Hospital</div>
              </div>
            </div>
          </div>
          
          <div className="glass-panel">
            <h3>Network Utilization</h3>
            <div style={{ marginTop: '16px' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                 <span>General Beds</span>
                 <span>72%</span>
               </div>
               <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px' }}>
                 <div style={{ width: '72%', height: '100%', background: 'var(--accent-color)', borderRadius: '4px' }}></div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
