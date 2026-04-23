const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const { authenticate } = require('../middleware/auth');
const { getIO } = require('../services/socketService');

// GET /api/chat/:reportId — load message history
router.get('/:reportId', authenticate, async (req, res) => {
  try {
    const messages = await Message.find({ reportId: req.params.reportId })
      .sort({ createdAt: 1 })
      .populate('senderId', 'name avatar role');

    res.json({ success: true, messages });
  } catch (err) {
    console.error('Get chat error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/chat/:reportId — send message (REST fallback)
router.post('/:reportId', authenticate, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Message text required' });
    }

    const Report = require('../models/Report');
    const Notification = require('../models/Notification');
    const User = require('../models/User');

    const report = await Report.findById(req.params.reportId);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    const message = await Message.create({
      reportId: req.params.reportId,
      senderId: req.user._id,
      senderRole: req.user.role,
      text: text.trim(),
    });

    await message.populate('senderId', 'name avatar role');

    // Determine Notification Recipients
    let recipients = [];
    if (req.user._id.toString() === report.submittedBy.toString()) {
      // Citizen sent message -> Notify assigned staff. If unassigned, notify ALL admins
      if (report.assignedTo) {
        recipients.push(report.assignedTo);
      } else {
        const admins = await User.find({ role: 'admin' }, '_id');
        recipients = admins.map(a => a._id);
      }
    } else {
      // Admin/Staff sent message -> Notify citizen
      recipients.push(report.submittedBy);
    }

    // Create & Emit Notifications
    const io = getIO();
    for (const recipientId of recipients) {
      if (recipientId.toString() === req.user._id.toString()) continue;

      const notification = await Notification.create({
        userId: recipientId,
        reportId: report._id,
        type: 'new_message',
        message: `New message from ${req.user.name} on report "${report.title}"`,
      });

      try {
        io.to(`user_${recipientId}`).emit('notification', { notification });
      } catch (e) {}
    }

    // Emit the chat message itself to the chat room
    try {
      io.to(`report_${req.params.reportId}`).emit('new_message', { message });
    } catch (e) {
      console.error('Socket emit error:', e.message);
    }

    res.status(201).json({ success: true, message });
  } catch (err) {
    console.error('Send message error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PATCH /api/chat/:reportId/seen — mark messages seen
router.patch('/:reportId/seen', authenticate, async (req, res) => {
  try {
    await Message.updateMany(
      {
        reportId: req.params.reportId,
        senderId: { $ne: req.user._id },
        seenAt: null,
      },
      { seenAt: new Date() }
    );

    res.json({ success: true, message: 'Messages marked as seen' });
  } catch (err) {
    console.error('Mark seen error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
