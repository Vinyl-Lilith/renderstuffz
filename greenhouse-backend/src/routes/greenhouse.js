// src/routes/greenhouse.js
// Routes for Raspberry Pi to push data + frontend to read data
const express = require('express');
const router = express.Router();
const SensorData = require('../models/SensorData');
const Thresholds = require('../models/Thresholds');
const ActivityLog = require('../models/ActivityLog');
const { protect, raspiAuth, notRestricted } = require('../middleware/auth');
const { logActivity } = require('../utils/logger');
const { createNotification, checkThresholdAlerts } = require('../utils/notifications');

// ==================== RASPBERRY PI ENDPOINTS ====================

// @route   POST /api/greenhouse/data
// @desc    Raspberry Pi pushes sensor data (batch or single)
// @access  Raspi API Key
router.post('/data', raspiAuth, async (req, res) => {
  try {
    const io = req.app.get('io');
    let records = req.body.data || [req.body];

    // Map Raspberry Pi snake_case to our schema
    const mapped = records.map(d => ({
      timestamp: d.timestamp ? new Date(d.timestamp) : new Date(),
      temperature: d.temperature,
      humidity: d.humidity,
      soilMoisture1: d.soil_moisture_1,
      soilMoisture2: d.soil_moisture_2,
      nitrogen: d.nitrogen,
      phosphorus: d.phosphorus,
      potassium: d.potassium,
      source: 'raspi'
    }));

    const saved = await SensorData.insertMany(mapped);

    // Get latest reading for live emission
    const latest = mapped[mapped.length - 1];

    // Emit live data to all connected dashboard clients
    io.to('dashboard').emit('sensorData', latest);

    // Check thresholds for alerts (only on latest)
    const thresholds = await Thresholds.findById('current');
    if (thresholds && latest) {
      await checkThresholdAlerts(io, latest, thresholds);
    }

    res.json({ success: true, count: saved.length });
  } catch (error) {
    console.error('Data ingestion error:', error);
    res.status(500).json({ success: false, message: 'Error storing data.' });
  }
});

// @route   GET /api/greenhouse/commands
// @desc    Raspberry Pi polls for pending commands
// @access  Raspi API Key
router.get('/commands', raspiAuth, async (req, res) => {
  try {
    const thresholds = await Thresholds.findById('current');
    if (!thresholds) {
      return res.json({ success: true, commands: [] });
    }

    const commands = thresholds.pendingCommands || [];

    // Clear the queue after delivering
    if (commands.length > 0) {
      await Thresholds.findByIdAndUpdate('current', { $set: { pendingCommands: [] } });
    }

    res.json({ success: true, commands });
  } catch (error) {
    console.error('Commands fetch error:', error);
    res.status(500).json({ success: false, message: 'Error fetching commands.' });
  }
});

// @route   POST /api/greenhouse/heartbeat
// @desc    Raspberry Pi heartbeat
// @access  Raspi API Key
router.post('/heartbeat', raspiAuth, async (req, res) => {
  const io = req.app.get('io');
  io.to('dashboard').emit('raspiHeartbeat', { timestamp: new Date() });
  res.json({ success: true });
});

// @route   POST /api/greenhouse/status
// @desc    Raspberry Pi pushes actuator/Arduino status
// @access  Raspi API Key
router.post('/status', raspiAuth, async (req, res) => {
  try {
    const io = req.app.get('io');
    const status = req.body;

    // Emit to dashboard clients
    io.to('dashboard').emit('actuatorStatus', {
      waterPump: status.water_pump,
      nutrientPump: status.nutrient_pump,
      exhaustFan: status.exhaust_fan,
      peltier: status.peltier,
      peltierHotFan: status.peltier_hot_fan,
      peltierColdFan: status.peltier_cold_fan,
      mode: status.mode,
      peltierPwm: status.peltier_pwm,
      timestamp: new Date()
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error.' });
  }
});

// ==================== FRONTEND ENDPOINTS ====================

// @route   GET /api/greenhouse/latest
// @desc    Get latest sensor reading
// @access  Private
router.get('/latest', protect, async (req, res) => {
  try {
    const latest = await SensorData.findOne().sort({ timestamp: -1 });
    res.json({ success: true, data: latest });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// @route   GET /api/greenhouse/history
// @desc    Get sensor history (24h default, or by date range)
// @access  Private
router.get('/history', protect, async (req, res) => {
  try {
    const { start, end, limit = 500, page = 1 } = req.query;

    let startDate, endDate;

    if (start && end) {
      startDate = new Date(start);
      endDate = new Date(end);
    } else {
      endDate = new Date();
      startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
    }

    const data = await SensorData.find({
      timestamp: { $gte: startDate, $lte: endDate }
    })
      .sort({ timestamp: 1 })
      .limit(parseInt(limit))
      .lean();

    res.json({ success: true, data, count: data.length });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// @route   GET /api/greenhouse/download
// @desc    Download data as Excel for a specific date
// @access  Private
router.get('/download', protect, async (req, res) => {
  try {
    const XLSX = require('xlsx');
    const { date, start, end, format = 'xlsx' } = req.query;

    let startDate, endDate;

    if (date) {
      startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
    } else if (start && end) {
      startDate = new Date(start);
      endDate = new Date(end);
    } else {
      endDate = new Date();
      startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
    }

    const data = await SensorData.find({
      timestamp: { $gte: startDate, $lte: endDate }
    }).sort({ timestamp: 1 }).lean();

    const rows = data.map(d => ({
      'Timestamp': new Date(d.timestamp).toLocaleString(),
      'Temperature (°C)': d.temperature,
      'Humidity (%)': d.humidity,
      'Soil Moisture 1 (%)': d.soilMoisture1,
      'Soil Moisture 2 (%)': d.soilMoisture2,
      'Nitrogen (mg/kg)': d.nitrogen,
      'Phosphorus (mg/kg)': d.phosphorus,
      'Potassium (mg/kg)': d.potassium
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);

    // Auto-width columns
    const colWidths = Object.keys(rows[0] || {}).map(k => ({ wch: Math.max(k.length + 2, 15) }));
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, 'Greenhouse Data');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const filename = date ? `greenhouse_${date}.xlsx` : `greenhouse_data.xlsx`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);

    await logActivity({
      userId: req.user._id,
      username: req.user.username,
      action: `Downloaded greenhouse data${date ? ` for ${date}` : ''}`,
      category: 'data'
    });

  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ success: false, message: 'Error generating download.' });
  }
});

// @route   GET /api/greenhouse/thresholds
// @desc    Get current thresholds
// @access  Private
router.get('/thresholds', protect, async (req, res) => {
  try {
    let thresholds = await Thresholds.findById('current');
    if (!thresholds) {
      thresholds = await Thresholds.create({
        _id: 'current',
        soilMoisture: 80, tempMin: 20, tempMax: 30,
        humidityMin: 60, humidityMax: 80,
        nThreshold: 50, pThreshold: 50, kThreshold: 50
      });
    }
    res.json({ success: true, thresholds });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// @route   PUT /api/greenhouse/thresholds
// @desc    Update thresholds - queues command for Raspberry Pi
// @access  Private (not restricted)
router.put('/thresholds', protect, notRestricted, async (req, res) => {
  try {
    const {
      soilMoisture, tempMin, tempMax,
      humidityMin, humidityMax,
      nThreshold, pThreshold, kThreshold
    } = req.body;

    // Build update object and command
    const updates = {};
    const commandData = { cmd: 'set_threshold' };

    if (soilMoisture !== undefined) { updates.soilMoisture = soilMoisture; commandData.soil_moisture = soilMoisture; }
    if (tempMin !== undefined) { updates.tempMin = tempMin; commandData.temp_min = tempMin; }
    if (tempMax !== undefined) { updates.tempMax = tempMax; commandData.temp_max = tempMax; }
    if (humidityMin !== undefined) { updates.humidityMin = humidityMin; commandData.humidity_min = humidityMin; }
    if (humidityMax !== undefined) { updates.humidityMax = humidityMax; commandData.humidity_max = humidityMax; }
    if (nThreshold !== undefined) { updates.nThreshold = nThreshold; commandData.n_threshold = nThreshold; }
    if (pThreshold !== undefined) { updates.pThreshold = pThreshold; commandData.p_threshold = pThreshold; }
    if (kThreshold !== undefined) { updates.kThreshold = kThreshold; commandData.k_threshold = kThreshold; }

    updates.updatedAt = new Date();
    updates.updatedBy = req.user.username;

    // Push command for Raspberry Pi to pick up
    const command = { type: 'set_threshold', data: commandData, createdAt: new Date() };

    const thresholds = await Thresholds.findByIdAndUpdate(
      'current',
      {
        $set: updates,
        $push: { pendingCommands: command }
      },
      { upsert: true, new: true }
    );

    // Log each changed threshold
    for (const [key, value] of Object.entries(updates)) {
      if (key !== 'updatedAt' && key !== 'updatedBy') {
        await logActivity({
          userId: req.user._id,
          username: req.user.username,
          action: `Changed threshold "${key}" to ${value}`,
          category: 'threshold',
          details: { key, value }
        });
      }
    }

    // Emit live threshold update to all dashboard clients
    const io = req.app.get('io');
    io.to('dashboard').emit('thresholdsUpdated', thresholds);

    // Notify all users
    await createNotification(io, {
      title: '⚙️ Thresholds Updated',
      message: `${req.user.username} updated greenhouse thresholds`,
      type: 'threshold',
      severity: 'info'
    });

    res.json({ success: true, thresholds });
  } catch (error) {
    console.error('Threshold update error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// @route   POST /api/greenhouse/manual
// @desc    Manual actuator control
// @access  Private (not restricted)
router.post('/manual', protect, notRestricted, async (req, res) => {
  try {
    const { actuator, state, mode } = req.body;
    const io = req.app.get('io');

    let commandData;
    let logMessage;

    if (mode) {
      // Mode change (auto/manual)
      commandData = { type: 'set_mode', mode };
      logMessage = `${req.user.username} set control mode to "${mode}"`;
    } else {
      // Actuator toggle
      commandData = { type: 'manual_control', data: { [actuator]: state } };
      logMessage = `${req.user.username} turned ${state ? 'ON' : 'OFF'} "${actuator}"`;
    }

    // Queue command for Raspberry Pi
    await Thresholds.findByIdAndUpdate(
      'current',
      { $push: { pendingCommands: { ...commandData, createdAt: new Date() } } },
      { upsert: true }
    );

    await logActivity({
      userId: req.user._id,
      username: req.user.username,
      action: logMessage,
      category: 'actuator',
      details: { actuator, state, mode }
    });

    // Notify all
    await createNotification(io, {
      title: '🔧 Manual Control',
      message: logMessage,
      type: 'actuator',
      severity: 'info'
    });

    res.json({ success: true, message: 'Command queued.' });
  } catch (error) {
    console.error('Manual control error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
