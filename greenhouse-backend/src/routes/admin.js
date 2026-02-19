// src/routes/admin.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const { protect, requireAdmin, requireHeadAdmin } = require('../middleware/auth');
const { logActivity } = require('../utils/logger');
const { createNotification } = require('../utils/notifications');

// All admin routes require login + admin role
router.use(protect, requireAdmin);

// @route   GET /api/admin/users
// @desc    Get all users
// @access  Admin
router.get('/users', async (req, res) => {
  try {
    const users = await User.find()
      .select('-password -lastKnownPassword -resetPasswordToken -resetPasswordExpire')
      .sort({ createdAt: 1 });
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// @route   GET /api/admin/online
// @desc    Get online users
// @access  Admin
router.get('/online', async (req, res) => {
  try {
    // Mark users offline if not seen in 30 seconds
    const cutoff = new Date(Date.now() - 30000);
    await User.updateMany(
      { isOnline: true, lastSeen: { $lt: cutoff } },
      { isOnline: false }
    );

    const onlineUsers = await User.find({ isOnline: true })
      .select('username role lastSeen')
      .sort({ lastSeen: -1 });

    res.json({ success: true, users: onlineUsers });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// @route   GET /api/admin/logs
// @desc    Get activity logs (24h)
// @access  Admin
router.get('/logs', async (req, res) => {
  try {
    const { hours = 24, page = 1, limit = 100, category } = req.query;

    const since = new Date(Date.now() - parseInt(hours) * 60 * 60 * 1000);
    const query = { timestamp: { $gte: since } };
    if (category) query.category = category;

    const logs = await ActivityLog.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    const total = await ActivityLog.countDocuments(query);

    res.json({ success: true, logs, total, page: parseInt(page) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// @route   PUT /api/admin/users/:id/ban
// @desc    Ban/unban user
// @access  Admin
router.put('/users/:id/ban', async (req, res) => {
  try {
    const { ban } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    // Admins cannot ban other admins (only head admin can)
    if ((user.role === 'admin' || user.role === 'head_admin') && req.user.role !== 'head_admin') {
      return res.status(403).json({ success: false, message: 'Cannot ban admins. Head admin only.' });
    }

    // Cannot ban yourself
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot ban yourself.' });
    }

    user.isBanned = ban;
    await user.save({ validateBeforeSave: false });

    const action = ban ? 'banned' : 'unbanned';
    await logActivity({
      userId: req.user._id,
      username: req.user.username,
      action: `Admin ${req.user.username} ${action} user "${user.username}"`,
      category: 'user_management',
      details: { targetUser: user.username, action }
    });

    const io = req.app.get('io');
    if (ban) {
      io.to(`user:${user._id}`).emit('accountBanned');
    }

    res.json({ success: true, message: `User ${action} successfully.` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// @route   PUT /api/admin/users/:id/restrict
// @desc    Restrict/unrestrict user (limit write access)
// @access  Admin
router.put('/users/:id/restrict', async (req, res) => {
  try {
    const { restrict } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot restrict yourself.' });
    }

    user.isRestricted = restrict;
    await user.save({ validateBeforeSave: false });

    const action = restrict ? 'restricted' : 'unrestricted';
    await logActivity({
      userId: req.user._id,
      username: req.user.username,
      action: `Admin ${req.user.username} ${action} user "${user.username}"`,
      category: 'user_management'
    });

    const io = req.app.get('io');
    await createNotification(io, {
      title: '🔒 Account Restricted',
      message: `Your account has been ${action} by an admin.`,
      type: 'admin',
      severity: 'warning',
      userIds: [user._id]
    });

    res.json({ success: true, message: `User ${action} successfully.` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// @route   DELETE /api/admin/users/:id
// @desc    Delete user
// @access  Admin
router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    if ((user.role === 'admin' || user.role === 'head_admin') && req.user.role !== 'head_admin') {
      return res.status(403).json({ success: false, message: 'Cannot delete admins. Head admin only.' });
    }
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot delete yourself.' });
    }

    await User.findByIdAndDelete(req.params.id);

    await logActivity({
      userId: req.user._id,
      username: req.user.username,
      action: `Admin ${req.user.username} deleted user "${user.username}"`,
      category: 'user_management'
    });

    const io = req.app.get('io');
    io.to(`user:${user._id}`).emit('accountDeleted');

    res.json({ success: true, message: 'User deleted.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// @route   PUT /api/admin/users/:id/promote
// @desc    Promote/demote user role (head admin only)
// @access  Head Admin
router.put('/users/:id/promote', requireHeadAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role. Use "user" or "admin".' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    if (user.role === 'head_admin') {
      return res.status(400).json({ success: false, message: 'Cannot change head admin role.' });
    }
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot change your own role.' });
    }

    const oldRole = user.role;
    user.role = role;
    await user.save({ validateBeforeSave: false });

    const action = role === 'admin' ? `promoted to admin` : `demoted to user`;
    await logActivity({
      userId: req.user._id,
      username: req.user.username,
      action: `Head admin ${action} user "${user.username}"`,
      category: 'user_management',
      details: { targetUser: user.username, oldRole, newRole: role }
    });

    const io = req.app.get('io');
    await createNotification(io, {
      title: '👑 Role Changed',
      message: `Your account has been ${action}.`,
      type: 'admin',
      severity: 'info',
      userIds: [user._id]
    });

    res.json({ success: true, message: `User ${action} successfully.` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// @route   GET /api/admin/forgot-password-requests
// @desc    Get pending forgot password requests
// @access  Admin
router.get('/forgot-password-requests', async (req, res) => {
  try {
    const requests = await User.find({ forgotPasswordStatus: 'pending' })
      .select('username email forgotPasswordMessage forgotPasswordRequestedAt')
      .sort({ forgotPasswordRequestedAt: 1 });

    res.json({ success: true, requests });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// @route   PUT /api/admin/forgot-password-requests/:userId/approve
// @desc    Admin sets new password for user (forgot password approval)
// @access  Admin
router.put('/forgot-password-requests/:userId/approve', async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'New password must be at least 8 characters.' });
    }

    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    user.password = newPassword;
    user.forgotPasswordStatus = 'approved';
    await user.save();

    await logActivity({
      userId: req.user._id,
      username: req.user.username,
      action: `Admin ${req.user.username} approved password reset for "${user.username}"`,
      category: 'auth'
    });

    const io = req.app.get('io');
    await createNotification(io, {
      title: '🔑 Password Reset Approved',
      message: 'Your password reset request has been approved. Please log in with your new password.',
      type: 'admin',
      severity: 'info',
      userIds: [user._id]
    });

    res.json({ success: true, message: 'Password reset and user notified.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// @route   PUT /api/admin/forgot-password-requests/:userId/reject
// @desc    Reject forgot password request
// @access  Admin
router.put('/forgot-password-requests/:userId/reject', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { forgotPasswordStatus: 'rejected' },
      { new: true }
    );
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    await logActivity({
      userId: req.user._id,
      username: req.user.username,
      action: `Admin ${req.user.username} rejected password reset for "${user.username}"`,
      category: 'auth'
    });

    const io = req.app.get('io');
    await createNotification(io, {
      title: '🔑 Password Reset Rejected',
      message: 'Your password reset request was rejected. Contact an admin for help.',
      type: 'admin',
      severity: 'warning',
      userIds: [user._id]
    });

    res.json({ success: true, message: 'Request rejected.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
