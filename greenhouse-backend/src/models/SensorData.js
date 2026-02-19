// src/models/SensorData.js
const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const sensorDataSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  temperature: {
    type: Number,
    default: null
  },
  humidity: {
    type: Number,
    default: null
  },
  soilMoisture1: {
    type: Number,
    default: null
  },
  soilMoisture2: {
    type: Number,
    default: null
  },
  nitrogen: {
    type: Number,
    default: null
  },
  phosphorus: {
    type: Number,
    default: null
  },
  potassium: {
    type: Number,
    default: null
  },
  // Actuator states at time of reading
  actuatorStates: {
    waterPump: { type: Boolean, default: false },
    nutrientPump: { type: Boolean, default: false },
    exhaustFan: { type: Boolean, default: false },
    peltier: { type: Boolean, default: false },
    peltierHotFan: { type: Boolean, default: false },
    peltierColdFan: { type: Boolean, default: false },
    mode: { type: String, enum: ['auto', 'manual'], default: 'auto' }
  },
  source: {
    type: String,
    enum: ['raspi', 'manual'],
    default: 'raspi'
  }
});

sensorDataSchema.plugin(mongoosePaginate);

// Index for efficient time-range queries
sensorDataSchema.index({ timestamp: -1 });

const SensorData = mongoose.model('SensorData', sensorDataSchema);
module.exports = SensorData;
