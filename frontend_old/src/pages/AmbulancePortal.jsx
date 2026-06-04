import React from 'react';

export default function AmbulancePortal() {
  return (
    <div className="portal-container">
      <h1 className="page-title">Ambulance Portal</h1>
      <div className="glass-panel" style={{ maxWidth: '600px' }}>
        <h3>Active Case Registration</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
          Register a new emergency case and broadcast patient vitals to the AI routing engine.
        </p>
        
        {/* Placeholder form layout */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Trauma Level (1-5)</label>
            <input type="number" min="1" max="5" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)', color: 'white' }} />
          </div>
          <button style={{ padding: '12px', borderRadius: '8px', border: 'none', background: 'var(--accent-color)', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>
            Dispatch & Get AI Route
          </button>
        </div>
      </div>
    </div>
  );
}
