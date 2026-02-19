// src/routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Thresholds = require('../models/Thresholds');
const { generateToken, protect } = require('../middleware/auth');
const { logActivity } = require('../utils/logger');
const { createAdminNotification } = require('../utils/notifications');

// @route   POST /api/auth/register
// @desc    Register user
// @access  Public
router.post('/register', [
  body('username').trim().isLength({ min: 3, max: 30 }).matches(/^[a-zA-Z0-9_]+$/),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { username, email, password } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      const field = existingUser.email === email ? 'email' : 'username';
      return res.status(400).json({ success: false, message: `This ${field} is already taken.` });
    }

    // First user becomes head_admin
    const userCount = await User.countDocuments();
    const role = userCount === 0 ? 'head_admin' : 'user';

    const user = await User.create({ username, email, password, role });

    // Initialize thresholds if first user
    if (userCount === 0) {
      await Thresholds.findByIdAndUpdate(
        'current',
        {
          _id: 'current',
          soilMoisture: 80,
          tempMin: 20,
          tempMax: 30,
          humidityMin: 60,
          humidityMax: 80,
          nThreshold: 50,
          pThreshold: 50,
          kThreshold: 50
        },
        { upsert: true, new: true }
      );
    }

    await logActivity({
      userId: user._id,
      username: user.username,
      action: `User ${username} registered${role === 'head_admin' ? ' as head admin' : ''}`,
      category: 'auth'
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        theme: user.theme
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: 'Server error during registration.' });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', [
  body('login').trim().notEmpty(),
  body('password').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Please provide login credentials.' });
  }

  try {
    const { login, password } = req.body;

    // Find by username or email
    const user = await User.findOne({
      $or: [{ username: login }, { email: login }]
    }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    if (user.isBanned) {
      return res.status(403).json({ success: false, message: 'Your account has been banned.' });
    }

    // Update online status
    user.isOnline = true;
    user.lastSeen = new Date();
    await user.save({ validateBeforeSave: false });

    await logActivity({
      userId: user._id,
      username: user.username,
      action: `User ${user.username} logged in`,
      category: 'auth'
    });

    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        theme: user.theme,
        notifications: user.notifications
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error during login.' });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user (set offline)
// @access  Private
router.post('/logout', protect, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      isOnline: false,
      lastSeen: new Date()
    });

    await logActivity({
      userId: req.user._id,
      username: req.user.username,
      action: `User ${req.user.username} logged out`,
      category: 'auth'
    });

    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', protect, async (req, res) => {
  res.json({
    success: true,
    user: {
      _id: req.user._id,
      username: req.user.username,
      email: req.user.email,
      role: req.user.role,
      theme: req.user.theme,
      notifications: req.user.notifications,
      isRestricted: req.user.isRestricted,
      createdAt: req.user.createdAt
    }
  });
});

// @route   POST /api/auth/forgot-password
// @desc    Submit forgot password request
// @access  Public
router.post('/forgot-password', [
  body('username').trim().notEmpty()
], async (req, res) => {
  try {
    const { username, lastKnownPassword, message } = req.body;

    const user = await User.findOne({ username }).select('+lastKnownPassword');
    if (!user) {
      // Don't reveal if user exists
      return res.json({ success: true, message: 'If the user exists, your request has been submitted.' });
    }

    // Verify last known password if provided
    if (lastKnownPassword) {
      const matches = await user.compareLastKnownPassword(lastKnownPassword);
      if (!matches) {
        // Still save the request but with message approach
      }
    }

    user.forgotPasswordStatus = 'pending';
    user.forgotPasswordMessage = message || `User ${username} has forgotten their password.`;
    user.forgotPasswordRequestedAt = new Date();
    await user.save({ validateBeforeSave: false });

    // Notify admins via socket
    const io = req.app.get('io');
    await createAdminNotification(io, {
      title: '🔑 Password Reset Request',
      message: `User "${username}" has submitted a forgot password request.`,
      type: 'admin',
      severity: 'info'
    });

    await logActivity({
      userId: user._id,
      username: user.username,
      action: `User ${username} submitted a forgot password request`,
      category: 'auth'
    });

    res.json({ success: true, message: 'Your request has been submitted. An admin will review it.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// @route   PUT /api/auth/change-password
// @desc    Change own password
// @access  Private
router.put('/change-password', protect, [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 8 })
], async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select('+password');
    if (!(await user.comparePassword(currentPassword))) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
    }

    // Store hash of current password as lastKnownPassword
    const salt = await bcrypt.genSalt(12);
    user.lastKnownPassword = await bcrypt.hash(currentPassword, salt);
    user.password = newPassword;
    await user.save();

    await logActivity({
      userId: user._id,
      username: user.username,
      action: `User ${user.username} changed their password`,
      category: 'auth'
    });

    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// @route   PUT /api/auth/change-username
// @desc    Change own username
// @access  Private
router.put('/change-username', protect, [
  body('newUsername').trim().isLength({ min: 3, max: 30 }).matches(/^[a-zA-Z0-9_]+$/)
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { newUsername } = req.body;

    const existing = await User.findOne({ username: newUsername });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Username already taken.' });
    }

    const oldUsername = req.user.username;
    await User.findByIdAndUpdate(req.user._id, { username: newUsername });

    await logActivity({
      userId: req.user._id,
      username: newUsername,
      action: `User changed username from "${oldUsername}" to "${newUsername}"`,
      category: 'auth'
    });

    res.json({ success: true, message: 'Username changed successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
