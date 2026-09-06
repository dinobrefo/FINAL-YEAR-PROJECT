const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/analytics/overview
router.get('/overview', async (req, res) => {
  try {
    const hospitalsRes = await db.query('SELECT COUNT(*) as count, COUNT(DISTINCT region) as regions FROM hospitals');
    const ambulancesRes = await db.query("SELECT COUNT(*) as count FROM ambulances WHERE status != 'offline'");
    const emergenciesRes = await db.query('SELECT COUNT(*) as count FROM emergency_cases');
    
    const connectedHospitals = parseInt(hospitalsRes.rows[0]?.count || '0', 10);
    const regionsCovered = parseInt(hospitalsRes.rows[0]?.regions || '0', 10);
    const activeAmbulances = parseInt(ambulancesRes.rows[0]?.count || '0', 10);
    const totalEmergencies = parseInt(emergenciesRes.rows[0]?.count || '0', 10);
    
    const hasData = connectedHospitals > 0;
    
    res.json({
      connectedHospitals,
      activeAmbulances,
      totalEmergencies,
      regionsCovered,
      hasData,
      emptyStateMessage: "No operational facilities or telemetry nodes currently connected to the network."
    });
  } catch (err) {
    console.error('Error fetching analytics overview:', err.message);
    res.status(503).json({
      error: err.message,
      hasData: false,
      emptyStateMessage: "Live system data is currently unavailable (Database connection error)"
    });
  }
});

module.exports = router;
