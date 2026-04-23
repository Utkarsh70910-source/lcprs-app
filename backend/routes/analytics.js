const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const { authenticate, authorize } = require('../middleware/auth');

// GET /api/analytics/overview
router.get('/overview', authenticate, authorize('admin', 'staff'), async (req, res) => {
  try {
    const [total, open, in_progress, resolved, rejected] = await Promise.all([
      Report.countDocuments(),
      Report.countDocuments({ status: 'open' }),
      Report.countDocuments({ status: 'in_progress' }),
      Report.countDocuments({ status: 'resolved' }),
      Report.countDocuments({ status: 'rejected' }),
    ]);

    res.json({ success: true, data: { total, open, in_progress, resolved, rejected } });
  } catch (err) {
    console.error('Analytics overview error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/analytics/by-category
router.get('/by-category', authenticate, authorize('admin', 'staff'), async (req, res) => {
  try {
    const data = await Report.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $project: { category: '$_id', count: 1, _id: 0 } },
      { $sort: { count: -1 } },
    ]);

    res.json({ success: true, data });
  } catch (err) {
    console.error('By category error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/analytics/trend — reports per day last 30 days
router.get('/trend', authenticate, authorize('admin', 'staff'), async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const data = await Report.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $project: { date: '$_id', count: 1, _id: 0 } },
      { $sort: { date: 1 } },
    ]);

    // Fill missing days with 0
    const result = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const found = data.find((x) => x.date === dateStr);
      result.push({ date: dateStr, count: found ? found.count : 0 });
    }

    res.json({ success: true, data: result });
  } catch (err) {
    console.error('Trend error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/analytics/resolution-time — avg hours to resolve per category
router.get('/resolution-time', authenticate, authorize('admin', 'staff'), async (req, res) => {
  try {
    const data = await Report.aggregate([
      { $match: { status: 'resolved', resolvedAt: { $ne: null } } },
      {
        $group: {
          _id: '$category',
          avgHours: {
            $avg: {
              $divide: [{ $subtract: ['$resolvedAt', '$createdAt'] }, 3600000],
            },
          },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          category: '$_id',
          avgHours: { $round: ['$avgHours', 1] },
          count: 1,
          _id: 0,
        },
      },
      { $sort: { avgHours: 1 } },
    ]);

    res.json({ success: true, data });
  } catch (err) {
    console.error('Resolution time error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/analytics/heatmap — unresolved report coordinates
router.get('/heatmap', authenticate, authorize('admin', 'staff'), async (req, res) => {
  try {
    const reports = await Report.find(
      { status: { $in: ['open', 'in_progress'] } },
      { 'location.coordinates': 1, category: 1, priority: 1 }
    ).lean();

    const data = reports.map((r) => ({
      lat: r.location.coordinates[1],
      lng: r.location.coordinates[0],
      category: r.category,
      priority: r.priority,
    }));

    res.json({ success: true, data });
  } catch (err) {
    console.error('Heatmap error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
