const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');

let io;

const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // JWT authentication middleware for Socket.io
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication required'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-passwordHash -refreshToken');
      if (!user) return next(new Error('User not found'));

      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.user;
    console.log(`🔌 Socket connected: ${user.name} (${user.role}) [${socket.id}]`);

    // Auto-join personal room
    socket.join(`user_${user._id}`);

    // Admins and staff join the admins room
    if (user.role === 'admin' || user.role === 'staff') {
      socket.join('admins');
    }

    // ─── Room Management ──────────────────────────────────────────
    socket.on('join_report_room', (reportId) => {
      socket.join(`report_${reportId}`);
      console.log(`  👥 ${user.name} joined room: report_${reportId}`);
    });

    socket.on('leave_report_room', (reportId) => {
      socket.leave(`report_${reportId}`);
      console.log(`  👋 ${user.name} left room: report_${reportId}`);
    });

    // ─── Chat ─────────────────────────────────────────────────────
    socket.on('send_message', async ({ reportId, text }, callback) => {
      try {
        if (!text || !text.trim()) return;

        const message = await Message.create({
          reportId,
          senderId: user._id,
          senderRole: user.role,
          text: text.trim(),
        });

        await message.populate('senderId', 'name avatar role');

        // Broadcast to everyone in the report room
        io.to(`report_${reportId}`).emit('new_message', { message });

        if (callback) callback({ success: true, message });
      } catch (err) {
        console.error('send_message error:', err);
        if (callback) callback({ success: false, error: err.message });
      }
    });

    // ─── Typing Indicators ────────────────────────────────────────
    socket.on('typing', ({ reportId }) => {
      socket.to(`report_${reportId}`).emit('user_typing', {
        userId: user._id,
        userName: user.name,
        reportId,
      });
    });

    socket.on('stop_typing', ({ reportId }) => {
      socket.to(`report_${reportId}`).emit('user_stop_typing', {
        userId: user._id,
        reportId,
      });
    });

    // ─── Disconnect ───────────────────────────────────────────────
    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${user.name} [${socket.id}]`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
};

module.exports = { initializeSocket, getIO };
