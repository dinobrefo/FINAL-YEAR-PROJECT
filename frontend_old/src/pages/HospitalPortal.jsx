import React from 'react';

export default function HospitalPortal() {
  return (
    <div className="portal-container">
      <h1 className="page-title">Hospital Resource Portal</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        <div className="glass-panel">
          <h3>Bed Management</h3>
          <p style={{ color: 'var(--text-secondary)' }}>General Care Occupancy</p>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', margin: '16px 0', color: 'var(--success)' }}>
            42 / 100
          </div>
          <button style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: 'rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer' }}>Update Capacity</button>
        </div>
        
        <div className="glass-panel" style={{ borderLeft: '4px solid var(--danger)' }}>
          <h3>ICU Tracking</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Critical Care Occupancy</p>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', margin: '16px 0', color: 'var(--warning)' }}>
            18 / 20
          </div>
          <button style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: 'rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer' }}>Update Capacity</button>
        </div>
      </div>
    </div>
  );
}
