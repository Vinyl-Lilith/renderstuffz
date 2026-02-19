"use strict";
const router = require("express").Router();
const { SensorReading, Thresholds, PiStatus } = require("../models/Greenhouse");
const XLSX = require("xlsx");

const DEVICE_ID = process.env.PI_DEVICE_ID;

// GET /api/data/latest
router.get("/latest", async (req, res) => {
  try {
    const doc = await SensorReading.findOne({ deviceId: DEVICE_ID }).sort({ ts: -1 });
    const status = await PiStatus.findOne({ deviceId: DEVICE_ID });
    const thresh = await Thresholds.findOne({ deviceId: DEVICE_ID });
    res.json({ reading: doc, status, thresholds: thresh });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/data/history?hours=24&field=temp_avg
router.get("/history", async (req, res) => {
  try {
    const hours  = parseInt(req.query.hours)  || 24;
    const since  = new Date(Date.now() - hours * 3600 * 1000);
    const docs   = await SensorReading.find({ deviceId: DEVICE_ID, ts: { $gte: since } })
      .sort({ ts: 1 })
      .select("ts temp_avg hum_avg soil1 soil2 N P K water_pump nut_pump exhaust_fan peltier")
      .lean();
    res.json({ data: docs, count: docs.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/data/by-date?date=2026-02-20
router.get("/by-date", async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: "date required (YYYY-MM-DD)" });
    const start = new Date(date + "T00:00:00.000Z");
    const end   = new Date(date + "T23:59:59.999Z");
    const docs  = await SensorReading.find({ deviceId: DEVICE_ID, ts: { $gte: start, $lte: end } })
      .sort({ ts: 1 }).lean();
    res.json({ data: docs, count: docs.length, date });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/data/thresholds
router.get("/thresholds", async (req, res) => {
  try {
    const thresh = await Thresholds.findOne({ deviceId: DEVICE_ID });
    res.json({ thresholds: thresh });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/data/pi-status
router.get("/pi-status", async (req, res) => {
  try {
    const status = await PiStatus.findOne({ deviceId: DEVICE_ID });
    // Consider offline if not seen in 30s
    const online = status && (Date.now() - new Date(status.lastSeen).getTime()) < 30000;
    res.json({ status: { ...status?.toObject(), online } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/data/export?date=2026-02-20  — Excel download
router.get("/export", async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: "date required" });

    const start = new Date(date + "T00:00:00.000Z");
    const end   = new Date(date + "T23:59:59.999Z");
    const docs  = await SensorReading.find({ deviceId: DEVICE_ID, ts: { $gte: start, $lte: end } })
      .sort({ ts: 1 }).lean();

    const rows = docs.map(d => ({
      "Timestamp":          new Date(d.ts).toISOString(),
      "Temp Avg (°C)":      d.temp_avg,
      "Humidity Avg (%)":   d.hum_avg,
      "Temp Outside (°C)":  d.temp_out_avg,
      "Hum Outside (%)":    d.hum_out_avg,
      "Soil 1 (%)":         d.soil1,
      "Soil 2 (%)":         d.soil2,
      "N (mg/kg)":          d.N,
      "P (mg/kg)":          d.P,
      "K (mg/kg)":          d.K,
      "Water Pump":         d.water_pump ? "ON" : "OFF",
      "Nutrient Pump":      d.nut_pump   ? "ON" : "OFF",
      "Exhaust Fan":        d.exhaust_fan? "ON" : "OFF",
      "Peltier":            d.peltier    ? "ON" : "OFF",
      "Peltier Fan Hot":    d.pfan_hot   ? "ON" : "OFF",
      "Peltier Fan Cold":   d.pfan_cold  ? "ON" : "OFF",
      "Peltier PWM":        d.peltier_pwm,
      "Arduino Uptime (s)": d.uptime,
    }));

    const wb  = XLSX.utils.book_new();
    const ws  = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "BioCube Data");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Disposition", `attachment; filename="biocube_${date}.xlsx"`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buf);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
