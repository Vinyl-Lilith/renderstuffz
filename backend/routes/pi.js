"use strict";
const router = require("express").Router();
const { SensorReading, Thresholds, PiCommand, PiStatus, ActivityLog } = require("../models/Greenhouse");
const User = require("../models/User");
const notifService = require("../services/notifService");

// POST /api/pi/data — receive batch sensor readings from RPi
router.post("/data", async (req, res) => {
  try {
    const { device_id, readings } = req.body;
    if (!readings?.length) return res.status(400).json({ error: "No readings" });

    const docs = readings.map(r => ({
      deviceId: device_id,
      ts: r.pi_ts ? new Date(r.pi_ts * 1000) : new Date(),
      ...r,
    }));

    await SensorReading.insertMany(docs, { ordered: false });

    // Broadcast latest reading to all frontend clients
    const latest = docs[docs.length - 1];
    req.io?.emit("sensor:data", latest);

    // Check thresholds and fire notifications
    await checkAndNotify(device_id, latest, req.io);

    // Update Pi status
    await PiStatus.findOneAndUpdate(
      { deviceId: device_id },
      { online: true, lastSeen: new Date() },
      { upsert: true, new: true }
    );

    res.json({ ok: true, stored: docs.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/pi/event — heartbeat / connection events
router.post("/event", async (req, res) => {
  try {
    const { device_id, event_type, payload } = req.body;
    await PiStatus.findOneAndUpdate(
      { deviceId: device_id },
      { online: true, lastSeen: new Date(), ...(event_type === "heartbeat" ? { lastHeartbeat: new Date() } : {}), ...(payload?.port ? { arduinoPort: payload.port } : {}) },
      { upsert: true, new: true }
    );

    if (event_type === "arduino_timeout") {
      req.io?.emit("system:alert", { type: "warning", message: "Arduino heartbeat lost!" });
      await notifService.broadcastToAll({ title: "Arduino Offline", body: "No heartbeat from Arduino — check connections.", type: "alert" }, req.io);
    }

    if (event_type === "arduino_connected") {
      req.io?.emit("system:alert", { type: "success", message: `Arduino connected on ${payload?.port}` });
    }

    req.io?.emit("pi:status", { online: true, event: event_type, payload });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/pi/commands — RPi polls for pending commands
router.get("/commands", async (req, res) => {
  try {
    const { device_id } = req.query;
    const commands = await PiCommand.find({ deviceId: device_id, status: "pending" }).sort({ createdAt: 1 });
    res.json({ commands: commands.map(c => ({ id: c._id, type: c.type, payload: c.payload })) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/pi/commands/:id/ack — RPi acks a command
router.post("/commands/:id/ack", async (req, res) => {
  try {
    const { success } = req.body;
    await PiCommand.findByIdAndUpdate(req.params.id, {
      status: success ? "acked" : "failed",
      ackedAt: new Date(),
    });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/pi/tunnel — RPi reports its Cloudflare tunnel URL
router.post("/tunnel", async (req, res) => {
  try {
    const { device_id, tunnel_url } = req.body;
    await PiStatus.findOneAndUpdate({ deviceId: device_id }, { tunnelUrl: tunnel_url, lastSeen: new Date() }, { upsert: true });
    req.io?.emit("pi:tunnel", { tunnelUrl: tunnel_url });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/pi/thresholds — RPi echoes back current Arduino thresholds
router.post("/thresholds", async (req, res) => {
  try {
    const { device_id, ...threshData } = req.body;
    const thresh = await Thresholds.findOneAndUpdate(
      { deviceId: device_id },
      { ...threshData },
      { upsert: true, new: true }
    );
    req.io?.emit("thresholds:update", thresh);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/pi/stream — MJPEG stream endpoint
// The RPi POSTs a chunked multipart stream; we relay it via Socket.IO as base64 frames
router.post("/stream", (req, res) => {
  res.setHeader("Connection", "keep-alive");
  res.status(200).end();

  let buffer = Buffer.alloc(0);
  const boundary = "--frame";

  req.on("data", chunk => {
    buffer = Buffer.concat([buffer, chunk]);
    let idx;
    while ((idx = buffer.indexOf(boundary)) !== -1) {
      const next = buffer.indexOf(boundary, idx + boundary.length);
      if (next === -1) break;
      const part = buffer.slice(idx + boundary.length, next);
      const headerEnd = part.indexOf("\r\n\r\n");
      if (headerEnd !== -1) {
        const jpeg = part.slice(headerEnd + 4);
        // Strip trailing \r\n
        const frame = jpeg.slice(0, jpeg.length - 2);
        if (frame.length > 1000) {
          req.io?.emit("camera:frame", { data: frame.toString("base64") });
        }
      }
      buffer = buffer.slice(next);
    }
  });

  req.on("end",   () => req.io?.emit("camera:offline", {}));
  req.on("error", () => req.io?.emit("camera:offline", {}));
});

// ── Threshold violation checker ────────────────────────────
async function checkAndNotify(deviceId, reading, io) {
  try {
    const thresh = await Thresholds.findOne({ deviceId });
    if (!thresh) return;

    const alerts = [];
    if (reading.temp_avg != null && reading.temp_avg > thresh.temp_max)
      alerts.push({ title: "High Temperature", body: `Inside temp ${reading.temp_avg.toFixed(1)}°C exceeds max ${thresh.temp_max}°C`, type: "alert" });
    if (reading.temp_avg != null && reading.temp_avg < thresh.temp_min)
      alerts.push({ title: "Low Temperature", body: `Inside temp ${reading.temp_avg.toFixed(1)}°C below min ${thresh.temp_min}°C`, type: "warning" });
    if (reading.hum_avg != null && reading.hum_avg > thresh.hum_max)
      alerts.push({ title: "High Humidity", body: `Humidity ${reading.hum_avg.toFixed(1)}% exceeds max ${thresh.hum_max}%`, type: "warning" });
    if (reading.soil1 != null && reading.soil1 < thresh.soil1_min)
      alerts.push({ title: "Low Soil Moisture (Plant 1)", body: `Soil 1 at ${reading.soil1.toFixed(1)}%`, type: "warning" });
    if (reading.soil2 != null && reading.soil2 < thresh.soil2_min)
      alerts.push({ title: "Low Soil Moisture (Plant 2)", body: `Soil 2 at ${reading.soil2.toFixed(1)}%`, type: "warning" });
    if (reading.N != null && reading.N < thresh.N_min)
      alerts.push({ title: "Low Nitrogen", body: `N=${reading.N} mg/kg below threshold ${thresh.N_min}`, type: "warning" });

    for (const alert of alerts) {
      await notifService.broadcastToAll(alert, io);
    }
  } catch (_) {}
}

module.exports = router;
