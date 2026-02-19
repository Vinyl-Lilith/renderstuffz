// src/models/Thresholds.js
const mongoose = require('mongoose');

const thresholdsSchema = new mongoose.Schema({
  // Only one document in this collection (singleton)
  _id: { type: String, default: 'current' },
  soilMoisture: { type: Number, default: 80.0 },
  tempMin: { type: Number, default: 20.0 },
  tempMax: { type: Number, default: 30.0 },
  humidityMin: { type: Number, default: 60.0 },
  humidityMax: { type: Number, default: 80.0 },
  nThreshold: { type: Number, default: 50.0 },
  pThreshold: { type: Number, default: 50.0 },
  kThreshold: { type: Number, default: 50.0 },
  // Pending commands queue for the Raspberry Pi to pick up
  pendingCommands: [{
    type: { type: String },
    data: mongoose.Schema.Types.Mixed,
    createdAt: { type: Date, default: Date.now }
  }],
  updatedAt: { type: Date, default: Date.now },
  updatedBy: { type: String, default: 'system' }
});

const Thresholds = mongoose.model('Thresholds', thresholdsSchema);
module.exports = Thresholds;
