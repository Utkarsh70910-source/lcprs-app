const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const Notification = require('../models/Notification');
const { authenticate, authorize } = require('../middleware/auth');
const { sendStatusUpdateEmail } = require('../services/emailService');
const { getIO } = require('../services/socketService');

// GET /api/reports
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, category, page = 1, limit = 10, lat, lng, radius } = req.query;
    const query = {};

    // Citizens only see their own reports
    if (req.user.role === 'citizen') {
      query.submittedBy = req.user._id;
    }

    if (status) query.status = status;
    if (category) query.category = category;

    let reportsQuery;

    // Geo-near query
    if (lat && lng && radius) {
      reportsQuery = Report.find({
        ...query,
        location: {
          $near: {
            $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
            $maxDistance: parseFloat(radius) * 1000, // km to meters
          },
        },
      });
    } else {
      reportsQuery = Report.find(query).sort({ createdAt: -1 });
    }

    const total = await Report.countDocuments(query);
    const reports = await reportsQuery
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('submittedBy', 'name email avatar')
      .populate('assignedTo', 'name email avatar');

    res.json({
      success: true,
      reports,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('Get reports error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/reports/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate('submittedBy', 'name email avatar phone')
      .populate('assignedTo', 'name email avatar')
      .populate('statusHistory.changedBy', 'name role');

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    // Citizens can only view their own reports
    if (
      req.user.role === 'citizen' &&
      report.submittedBy._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.json({ success: true, report });
  } catch (err) {
    console.error('Get report error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/reports
router.post('/', authenticate, authorize('citizen', 'admin'), async (req, res) => {
  try {
    const { title, description, category, priority, location, images } = req.body;

    if (!location || !location.coordinates) {
      return res.status(400).json({ success: false, message: 'Location coordinates required' });
    }

    const report = new Report({
      title,
      description,
      category,
      priority: priority || 'medium',
      submittedBy: req.user._id,
      location: {
        type: 'Point',
        coordinates: location.coordinates,
        address: location.address || '',
      },
      images: images || [],
      statusHistory: [
        {
          status: 'open',
          changedBy: req.user._id,
          note: 'Report submitted',
          changedAt: new Date(),
        },
      ],
    });

    await report.save();
    await report.populate('submittedBy', 'name email avatar');

    // Emit to admins room
    try {
      const io = getIO();
      io.to('admins').emit('new_report', { report });
    } catch (e) {
      console.error('Socket emit error:', e.message);
    }

    res.status(201).json({ success: true, message: 'Report submitted', report });
  } catch (err) {
    console.error('Create report error:', err);
    res.status(400).json({ success: false, message: err.message || 'Server error' });
  }
});

// PATCH /api/reports/:id/status
router.patch('/:id/status', authenticate, authorize('staff', 'admin'), async (req, res) => {
  try {
    const { status, note } = req.body;
    const validStatuses = ['open', 'in_progress', 'resolved', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const report = await Report.findById(req.params.id).populate('submittedBy', 'name email');
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    // Staff can ONLY update reports explicitly assigned to them
    if (req.user.role === 'staff') {
      if (!report.assignedTo || report.assignedTo.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: 'Access Denied: You cannot update a report unless it is explicitly assigned to you by an Admin.' });
      }
    }

    report.status = status;
    report.statusHistory.push({
      status,
      changedBy: req.user._id,
      note: note || '',
      changedAt: new Date(),
    });

    if (status === 'resolved') {
      report.resolvedAt = new Date();
    }

    await report.save();

    // Create notification for citizen
    const notification = await Notification.create({
      userId: report.submittedBy._id,
      reportId: report._id,
      type: status === 'resolved' ? 'report_resolved' : 'status_update',
      message: `Your report "${report.title}" status changed to ${status}`,
    });

    // Emit via socket
    try {
      const io = getIO();
      io.to(`user_${report.submittedBy._id}`).emit('notification', { notification });
      io.to(`report_${report._id}`).emit('report_updated', { report, status });
    } catch (e) {
      console.error('Socket emit error:', e.message);
    }

    // Send email
    try {
      await sendStatusUpdateEmail(report.submittedBy, report);
    } catch (e) {
      console.error('Email send error:', e.message);
    }

    res.json({ success: true, message: 'Status updated', report });
  } catch (err) {
    console.error('Update status error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PATCH /api/reports/:id/assign
router.patch('/:id/assign', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { assignedTo } = req.body;

    const report = await Report.findByIdAndUpdate(
      req.params.id,
      { assignedTo },
      { new: true }
    )
      .populate('submittedBy', 'name email')
      .populate('assignedTo', 'name email avatar');

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    // Notify assigned staff
    if (assignedTo) {
      const notification = await Notification.create({
        userId: assignedTo,
        reportId: report._id,
        type: 'report_assigned',
        message: `You have been assigned to report "${report.title}"`,
      });

      try {
        const io = getIO();
        io.to(`user_${assignedTo}`).emit('notification', { notification });
      } catch (e) {
        console.error('Socket emit error:', e.message);
      }
    }

    res.json({ success: true, message: 'Report assigned', report });
  } catch (err) {
    console.error('Assign report error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/reports/:id/upvote
router.post('/:id/upvote', authenticate, authorize('citizen'), async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    const alreadyUpvoted = report.upvotedBy.includes(req.user._id);
    if (alreadyUpvoted) {
      report.upvotes -= 1;
      report.upvotedBy = report.upvotedBy.filter(
        (id) => id.toString() !== req.user._id.toString()
      );
    } else {
      report.upvotes += 1;
      report.upvotedBy.push(req.user._id);
    }

    await report.save();
    res.json({ success: true, upvotes: report.upvotes, upvoted: !alreadyUpvoted });
  } catch (err) {
    console.error('Upvote error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/reports/:id
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const report = await Report.findByIdAndDelete(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }
    res.json({ success: true, message: 'Report deleted' });
  } catch (err) {
    console.error('Delete report error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
