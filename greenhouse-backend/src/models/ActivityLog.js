// src/models/ActivityLog.js
const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const activityLogSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  username: {
    type: String,
    default: 'system'
  },
  action: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['threshold', 'actuator', 'auth', 'user_management', 'system', 'data'],
    default: 'system'
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  // For notifications
  severity: {
    type: String,
    enum: ['info', 'warning', 'critical'],
    default: 'info'
  }
});

activityLogSchema.plugin(mongoosePaginate);
activityLogSchema.index({ timestamp: -1 });
activityLogSchema.index({ userId: 1 });
activityLogSchema.index({ category: 1 });

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);
module.exports = ActivityLog;
