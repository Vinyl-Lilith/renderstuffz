"use strict";
const mongoose = require("mongoose");

// ── Sensor Reading ─────────────────────────────────────────
const sensorSchema = new mongoose.Schema({
  deviceId: { type: String, required: true, index: true },
  ts:       { type: Date, required: true, index: true },
  pi_ts:    Number,
  // inside DHT
  dht11_t: Number, dht11_h: Number,
  dht22_t: Number, dht22_h: Number,
  temp_avg: Number, hum_avg: Number,
  // outside DHT
  dht11_out_t: Number, dht11_out_h: Number,
  dht22_out_t: Number, dht22_out_h: Number,
  temp_out_avg: Number, hum_out_avg: Number,
  // soil
  soil1: Number, soil2: Number,
  // npk
  N: Number, P: Number, K: Number,
  // actuators
  water_pump: Number, nut_pump: Number,
  exhaust_fan: Number, peltier: Number,
  pfan_hot: Number, pfan_cold: Number,
  peltier_pwm: Number,
  // manual locks
  manual_water_pump: Number, manual_nut_pump: Number,
  manual_exhaust_fan: Number, manual_peltier: Number,
  manual_pfan_hot: Number, manual_pfan_cold: Number,
  uptime: Number,
}, { _id: true });
// Auto-delete after 90 days
sensorSchema.index({ ts: 1 }, { expireAfterSeconds: 7776000 });

// ── Thresholds ─────────────────────────────────────────────
const thresholdsSchema = new mongoose.Schema({
  deviceId:  { type: String, required: true, unique: true },
  soil1_min: { type: Number, default: 60 },
  soil2_min: { type: Number, default: 60 },
  temp_min:  { type: Number, default: 18 },
  temp_max:  { type: Number, default: 32 },
  hum_min:   { type: Number, default: 50 },
  hum_max:   { type: Number, default: 90 },
  N_min:     { type: Number, default: 20 },
  P_min:     { type: Number, default: 10 },
  K_min:     { type: Number, default: 20 },
  updatedBy: String,
}, { timestamps: true });

// ── Activity Log ───────────────────────────────────────────
const logSchema = new mongoose.Schema({
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  username: String,
  action:   { type: String, required: true },
  detail:   String,
  category: { type: String, enum: ["threshold","actuator","auth","admin","system"], default: "system" },
  ts:       { type: Date, default: Date.now, index: true },
});
logSchema.index({ ts: 1 }, { expireAfterSeconds: 2592000 }); // 30 days

// ── Pi Command Queue ───────────────────────────────────────
const cmdSchema = new mongoose.Schema({
  deviceId:  { type: String, required: true, index: true },
  type:      { type: String, required: true },
  payload:   { type: mongoose.Schema.Types.Mixed, default: {} },
  status:    { type: String, enum: ["pending","acked","failed"], default: "pending" },
  issuedBy:  String,
  ackedAt:   Date,
}, { timestamps: true });

// ── Pi Status ──────────────────────────────────────────────
const piStatusSchema = new mongoose.Schema({
  deviceId:      { type: String, required: true, unique: true },
  online:        { type: Boolean, default: false },
  arduinoPort:   String,
  tunnelUrl:     String,
  lastSeen:      { type: Date, default: Date.now },
  lastHeartbeat: Date,
});

// ── Notification ───────────────────────────────────────────
const notifSchema = new mongoose.Schema({
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
  title:    { type: String, required: true },
  body:     String,
  type:     { type: String, enum: ["alert","info","success","warning"], default: "info" },
  read:     { type: Boolean, default: false },
  ts:       { type: Date, default: Date.now },
});
notifSchema.index({ ts: 1 }, { expireAfterSeconds: 604800 }); // 7 days

module.exports = {
  SensorReading: mongoose.model("SensorReading", sensorSchema),
  Thresholds:    mongoose.model("Thresholds",    thresholdsSchema),
  ActivityLog:   mongoose.model("ActivityLog",   logSchema),
  PiCommand:     mongoose.model("PiCommand",     cmdSchema),
  PiStatus:      mongoose.model("PiStatus",      piStatusSchema),
  Notification:  mongoose.model("Notification",  notifSchema),
};
