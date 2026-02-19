// src/routes/user.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');
const { logActivity } = require('../utils/logger');

// @route   PUT /api/user/theme
// @desc    Update user theme (per-user, doesn't affect others)
// @access  Private
router.put('/theme', protect, async (req, res) => {
  try {
    const { theme } = req.body;
    const validThemes = ['dark', 'light', 'green', 'blue'];

    if (!validThemes.includes(theme)) {
      return res.status(400).json({ success: false, message: `Invalid theme. Choose from: ${validThemes.join(', ')}` });
    }

    await User.findByIdAndUpdate(req.user._id, { theme });

    res.json({ success: true, theme });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// @route   PUT /api/user/notifications
// @desc    Update notification preferences
// @access  Private
router.put('/notifications', protect, async (req, res) => {
  try {
    const { notifications } = req.body;

    await User.findByIdAndUpdate(req.user._id, { notifications });

    res.json({ success: true, notifications });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// @route   GET /api/user/notifications
// @desc    Get user's notifications
// @access  Private
router.get('/notifications', protect, async (req, res) => {
  try {
    const { page = 1, limit = 50, unreadOnly } = req.query;

    const query = { userId: req.user._id };
    if (unreadOnly === 'true') query.read = false;

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    const unreadCount = await Notification.countDocuments({
      userId: req.user._id,
      read: false
    });

    res.json({ success: true, notifications, unreadCount });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// @route   PUT /api/user/notifications/read
// @desc    Mark notifications as read
// @access  Private
router.put('/notifications/read', protect, async (req, res) => {
  try {
    const { ids, all } = req.body;

    if (all) {
      await Notification.updateMany({ userId: req.user._id }, { read: true });
    } else if (ids && ids.length > 0) {
      await Notification.updateMany(
        { _id: { $in: ids }, userId: req.user._id },
        { read: true }
      );
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// @route   DELETE /api/user/notifications
// @desc    Clear all notifications
// @access  Private
router.delete('/notifications', protect, async (req, res) => {
  try {
    await Notification.deleteMany({ userId: req.user._id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
