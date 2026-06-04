const express = require('express');
const router = express.Router();
const db = require('../db');

// Get city-wide overview (all hospitals, ambulances, active cases)
router.get('/overview', async (req, res) => {
  const hospitals = await db.query('SELECT * FROM hospitals');
  const ambulances = await db.query('SELECT * FROM ambulances');
  const activeCases = await db.query("SELECT * FROM emergency_cases WHERE status != 'resolved'");
  
  res.json({
    hospitals: hospitals.rows,
    ambulances: ambulances.rows,
    active_cases: activeCases.rows
  });
});

// Get real-time analytics
router.get('/analytics', async (req, res) => {
  try {
    // 1. Emergency Trends (Last 6 Months)
    const trendsResult = await db.query(`
      SELECT 
        to_char(created_at, 'Mon') as month,
        count(*) as emergencies,
        count(case when status = 'resolved' then 1 end) as resolved
      FROM emergency_cases
      WHERE created_at >= NOW() - INTERVAL '6 months'
      GROUP BY to_char(created_at, 'Mon'), date_trunc('month', created_at)
      ORDER BY date_trunc('month', created_at) ASC;
    `);

    // 2. Bed Occupancy
    const occupancyResult = await db.query(`
      SELECT name, 
             ROUND((occupied_general_beds::decimal / GREATEST(total_general_beds, 1)) * 100) as occupancy 
      FROM hospitals
    `);

    // 3. Emergency Types (Based on trauma levels)
    // Map trauma levels: 5=Cardiac, 4=Trauma, 3=Stroke, 2=Respiratory, 1=Other
    const typesResult = await db.query(`
      SELECT 
        CASE 
          WHEN trauma_level = 5 THEN 'Cardiac'
          WHEN trauma_level = 4 THEN 'Trauma'
          WHEN trauma_level = 3 THEN 'Stroke'
          WHEN trauma_level = 2 THEN 'Respiratory'
          ELSE 'Other'
        END as type,
        count(*) as count
      FROM emergency_cases
      GROUP BY type
    `);

    const totalTypes = typesResult.rows.reduce((sum, row) => sum + parseInt(row.count), 0);
    const typesWithPercentage = typesResult.rows.map(row => ({
      type: row.type,
      count: parseInt(row.count),
      percentage: totalTypes > 0 ? Math.round((row.count / totalTypes) * 100) : 0
    }));

    // 4. Response Time (Average diff between resolved and created by hour of day)
    const responseTimeResult = await db.query(`
      SELECT 
        LPAD(EXTRACT(HOUR FROM created_at)::text, 2, '0') || ':00' as hour,
        ROUND(AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/60)::numeric, 1) as "avgTime"
      FROM emergency_cases
      WHERE resolved_at IS NOT NULL
      GROUP BY EXTRACT(HOUR FROM created_at)
      ORDER BY hour ASC
    `);

    res.json({
      emergencyTrends: trendsResult.rows.length ? trendsResult.rows : [{ month: 'Current', emergencies: 0, resolved: 0 }],
      bedOccupancy: occupancyResult.rows,
      emergencyTypes: typesWithPercentage.length ? typesWithPercentage : [{ type: 'Other', count: 0, percentage: 0 }],
      responseTime: responseTimeResult.rows.length ? responseTimeResult.rows : [{ hour: '00:00', avgTime: 0 }]
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

module.exports = router;
