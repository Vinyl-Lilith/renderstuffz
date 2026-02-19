// src/utils/logger.js
const ActivityLog = require('../models/ActivityLog');

const logActivity = async ({ userId, username, action, category, details, severity = 'info' }) => {
  try {
    await ActivityLog.create({
      userId: userId || null,
      username: username || 'system',
      action,
      category,
      details: details || {},
      severity
    });
  } catch (error) {
    console.error('Error logging activity:', error);
  }
};

module.exports = { logActivity };
