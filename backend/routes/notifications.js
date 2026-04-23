const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { authenticate } = require('../middleware/auth');

// GET /api/notifications
// Get all notifications for the current user
router.get('/', authenticate, async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);
    
    res.json({ success: true, notifications });
  } catch (err) {
    console.error('Get notifications error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PATCH /api/notifications/mark-read
// Mark all unread notifications as read
router.patch('/mark-read', authenticate, async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user._id, isRead: false },
      { $set: { isRead: true } }
    );
    res.json({ success: true, message: 'Marked all as read' });
  } catch (err) {
    console.error('Mark notifications read error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
