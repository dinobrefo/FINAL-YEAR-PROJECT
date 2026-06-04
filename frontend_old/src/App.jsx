import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import AmbulancePortal from './pages/AmbulancePortal';
import HospitalPortal from './pages/HospitalPortal';
import CommandCenterPortal from './pages/CommandCenterPortal';

function App() {
  return (
    <Router>
      <div className="app-container">
        <nav className="nav-bar">
          <h2 style={{ marginRight: 'auto', margin: 0, fontSize: '1.2rem' }}>IERBMS Network</h2>
          <Link to="/" className="nav-link">Command Center</Link>
          <Link to="/ambulance" className="nav-link">Ambulance Portal</Link>
          <Link to="/hospital" className="nav-link">Hospital Portal</Link>
        </nav>
        
        <Routes>
          <Route path="/" element={<CommandCenterPortal />} />
          <Route path="/ambulance" element={<AmbulancePortal />} />
          <Route path="/hospital" element={<HospitalPortal />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
