// src/utils/notifications.js
const Notification = require('../models/Notification');
const User = require('../models/User');

// Create notification for all users or specific users
const createNotification = async (io, { title, message, type, severity = 'info', userIds = null }) => {
  try {
    let targetUsers;

    if (userIds) {
      targetUsers = await User.find({ _id: { $in: userIds }, isBanned: false }).select('_id');
    } else {
      targetUsers = await User.find({ isBanned: false }).select('_id');
    }

    // Create notification documents
    const notifications = targetUsers.map(user => ({
      userId: user._id,
      title,
      message,
      type,
      severity
    }));

    if (notifications.length > 0) {
      const savedNotifs = await Notification.insertMany(notifications);

      // Emit to connected sockets
      if (io) {
        for (const notif of savedNotifs) {
          io.to(`user:${notif.userId}`).emit('notification', {
            _id: notif._id,
            title,
            message,
            type,
            severity,
            read: false,
            createdAt: notif.createdAt
          });
        }
      }
    }
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};

// Create notification for admins only
const createAdminNotification = async (io, { title, message, type, severity = 'info' }) => {
  try {
    const admins = await User.find({
      role: { $in: ['admin', 'head_admin'] },
      isBanned: false
    }).select('_id');

    const notifications = admins.map(user => ({
      userId: user._id,
      title,
      message,
      type,
      severity
    }));

    if (notifications.length > 0) {
      const savedNotifs = await Notification.insertMany(notifications);

      if (io) {
        for (const notif of savedNotifs) {
          io.to(`user:${notif.userId}`).emit('notification', {
            _id: notif._id,
            title,
            message,
            type,
            severity,
            read: false,
            createdAt: notif.createdAt
          });
        }
      }
    }
  } catch (error) {
    console.error('Error creating admin notification:', error);
  }
};

// Threshold alert checker
const checkThresholdAlerts = async (io, sensorData, thresholds) => {
  const alerts = [];

  if (sensorData.temperature !== null && sensorData.temperature !== undefined) {
    if (sensorData.temperature > thresholds.tempMax) {
      alerts.push({
        title: '🌡️ High Temperature Alert',
        message: `Temperature is ${sensorData.temperature.toFixed(1)}°C, exceeding max threshold of ${thresholds.tempMax}°C`,
        type: 'temperature',
        severity: sensorData.temperature > thresholds.tempMax + 5 ? 'critical' : 'warning'
      });
    } else if (sensorData.temperature < thresholds.tempMin) {
      alerts.push({
        title: '🌡️ Low Temperature Alert',
        message: `Temperature is ${sensorData.temperature.toFixed(1)}°C, below min threshold of ${thresholds.tempMin}°C`,
        type: 'temperature',
        severity: 'warning'
      });
    }
  }

  if (sensorData.humidity !== null && sensorData.humidity !== undefined) {
    if (sensorData.humidity > thresholds.humidityMax) {
      alerts.push({
        title: '💧 High Humidity Alert',
        message: `Humidity is ${sensorData.humidity.toFixed(1)}%, exceeding max threshold of ${thresholds.humidityMax}%`,
        type: 'humidity',
        severity: 'warning'
      });
    } else if (sensorData.humidity < thresholds.humidityMin) {
      alerts.push({
        title: '💧 Low Humidity Alert',
        message: `Humidity is ${sensorData.humidity.toFixed(1)}%, below min threshold of ${thresholds.humidityMin}%`,
        type: 'humidity',
        severity: 'warning'
      });
    }
  }

  const avgSoilMoisture = ((sensorData.soilMoisture1 || 0) + (sensorData.soilMoisture2 || 0)) / 2;
  if (avgSoilMoisture < thresholds.soilMoisture - 10) {
    alerts.push({
      title: '🌱 Low Soil Moisture Alert',
      message: `Average soil moisture is ${avgSoilMoisture.toFixed(1)}%, well below threshold of ${thresholds.soilMoisture}%`,
      type: 'soilMoisture',
      severity: 'warning'
    });
  }

  if (sensorData.nitrogen !== null && sensorData.nitrogen < thresholds.nThreshold) {
    alerts.push({
      title: '🧪 Low Nitrogen Alert',
      message: `Nitrogen level is ${sensorData.nitrogen} mg/kg, below threshold of ${thresholds.nThreshold} mg/kg`,
      type: 'npk',
      severity: 'warning'
    });
  }

  for (const alert of alerts) {
    await createNotification(io, alert);
  }
};

module.exports = { createNotification, createAdminNotification, checkThresholdAlerts };
