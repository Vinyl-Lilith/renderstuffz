// src/server.js
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const connectDB = require('./config/database');
const User = require('./models/User');

// ==================== APP SETUP ====================
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingTimeout: 60000
});

// Make io accessible to routes
app.set('io', io);

// ==================== DATABASE ====================
connectDB();

// ==================== MIDDLEWARE ====================
app.use(cors({
  origin: [
    process.env.CLIENT_URL || 'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5174'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: { success: false, message: 'Too many requests. Please try again later.' },
  skip: (req) => {
    // Skip rate limiting for Raspberry Pi data ingestion
    return req.headers['x-api-key'] === process.env.RASPI_API_KEY;
  }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many login attempts. Please try again later.' }
});

app.use('/api/', limiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// ==================== HEALTH CHECK ====================
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Smart Greenhouse Backend'
  });
});

// ==================== API ROUTES ====================
app.use('/api/auth', require('./routes/auth'));
app.use('/api/greenhouse', require('./routes/greenhouse'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/user', require('./routes/user'));

// ==================== SERVE FRONTEND ====================
// In production, serve the built React frontend
const clientBuildPath = path.join(__dirname, '../client/dist');
if (require('fs').existsSync(clientBuildPath)) {
  app.use(express.static(clientBuildPath));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(clientBuildPath, 'index.html'));
    }
  });
} else {
  app.get('/', (req, res) => {
    res.json({
      success: true,
      message: 'Smart Greenhouse API is running. Frontend not built yet.',
      endpoints: {
        health: '/health',
        auth: '/api/auth',
        greenhouse: '/api/greenhouse',
        admin: '/api/admin',
        user: '/api/user'
      }
    });
  });
}

// ==================== ERROR HANDLER ====================
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error.'
  });
});

// 404 handler for unknown API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, message: 'API route not found.' });
});

// ==================== SOCKET.IO ====================
const connectedUsers = new Map(); // userId -> Set of socket ids

io.on('connection', async (socket) => {
  console.log('Socket connected:', socket.id);

  // Authenticate socket
  const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('username role isBanned isOnline');

      if (user && !user.isBanned) {
        socket.userId = user._id.toString();
        socket.username = user.username;
        socket.userRole = user.role;

        // Join personal room
        socket.join(`user:${user._id}`);

        // Join dashboard room for sensor data
        socket.join('dashboard');

        // Track online users
        if (!connectedUsers.has(socket.userId)) {
          connectedUsers.set(socket.userId, new Set());
        }
        connectedUsers.get(socket.userId).add(socket.id);

        // Update online status
        await User.findByIdAndUpdate(user._id, { isOnline: true, lastSeen: new Date() });

        // Broadcast to admins that user is online
        socket.to('admins').emit('userOnline', {
          userId: user._id,
          username: user.username
        });

        // If admin, join admin room
        if (user.role === 'admin' || user.role === 'head_admin') {
          socket.join('admins');
        }

        socket.emit('authenticated', { userId: user._id, username: user.username });
        console.log(`User ${user.username} authenticated on socket`);
      }
    } catch (err) {
      // Invalid token - allow unauthenticated connection but no private events
      console.log('Socket auth failed:', err.message);
    }
  }

  // Request current sensor data
  socket.on('requestLatest', async () => {
    try {
      const SensorData = require('./models/SensorData');
      const Thresholds = require('./models/Thresholds');
      const latest = await SensorData.findOne().sort({ timestamp: -1 }).lean();
      const thresholds = await Thresholds.findById('current').lean();

      socket.emit('sensorData', latest);
      socket.emit('thresholdsUpdated', thresholds);
    } catch (err) {
      console.error('Error sending latest data:', err);
    }
  });

  // Handle disconnect
  socket.on('disconnect', async () => {
    console.log('Socket disconnected:', socket.id);

    if (socket.userId) {
      const userSockets = connectedUsers.get(socket.userId);
      if (userSockets) {
        userSockets.delete(socket.id);

        // If no more sockets for this user, mark offline
        if (userSockets.size === 0) {
          connectedUsers.delete(socket.userId);
          await User.findByIdAndUpdate(socket.userId, {
            isOnline: false,
            lastSeen: new Date()
          });

          socket.to('admins').emit('userOffline', {
            userId: socket.userId,
            username: socket.username
          });
        }
      }
    }
  });

  // Ping to keep alive
  socket.on('ping', () => {
    if (socket.userId) {
      User.findByIdAndUpdate(socket.userId, { lastSeen: new Date() }).exec();
    }
    socket.emit('pong');
  });
});

// ==================== CLEANUP CRON ====================
const cron = require('node-cron');

// Clean up old notifications every day at midnight
cron.schedule('0 0 * * *', async () => {
  try {
    const Notification = require('./models/Notification');
    const ActivityLog = require('./models/ActivityLog');
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days

    await Notification.deleteMany({ createdAt: { $lt: cutoff } });
    await ActivityLog.deleteMany({ timestamp: { $lt: cutoff } });

    console.log('✅ Old data cleaned up');
  } catch (err) {
    console.error('Cleanup cron error:', err);
  }
});

// ==================== START SERVER ====================
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🌿 Smart Greenhouse Backend running on port ${PORT}`);
  console.log(`📡 Socket.IO ready`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

module.exports = { app, server, io };
