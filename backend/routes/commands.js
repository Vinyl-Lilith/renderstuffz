"use strict";
const router = require("express").Router();
const { PiCommand, Thresholds, ActivityLog } = require("../models/Greenhouse");
const { requireNotRestricted } = require("../middleware/auth");

const DEVICE_ID = process.env.PI_DEVICE_ID;

async function enqueue(deviceId, type, payload, username, io) {
  const cmd = await PiCommand.create({ deviceId, type, payload, issuedBy: username });
  io?.emit("command:queued", { id: cmd._id, type, payload });
  return cmd;
}

// POST /api/commands/threshold — set thresholds (Logic page)
router.post("/threshold", requireNotRestricted, async (req, res) => {
  try {
    const { soil1, soil2, tempMin, tempMax, humMin, humMax, N, P, K } = req.body;

    // Update DB thresholds immediately (mirror of what Arduino will use)
    const thresh = await Thresholds.findOneAndUpdate(
      { deviceId: DEVICE_ID },
      {
        ...(soil1   != null && { soil1_min: soil1 }),
        ...(soil2   != null && { soil2_min: soil2 }),
        ...(tempMin != null && { temp_min:  tempMin }),
        ...(tempMax != null && { temp_max:  tempMax }),
        ...(humMin  != null && { hum_min:   humMin }),
        ...(humMax  != null && { hum_max:   humMax }),
        ...(N       != null && { N_min:     N }),
        ...(P       != null && { P_min:     P }),
        ...(K       != null && { K_min:     K }),
        updatedBy: req.user.username,
      },
      { upsert: true, new: true }
    );

    // Enqueue command for RPi → Arduino
    await enqueue(DEVICE_ID, "set_threshold", req.body, req.user.username, req.io);

    // Log activity
    const changes = Object.entries(req.body)
      .filter(([k]) => k !== "device_id")
      .map(([k,v]) => `${k}=${v}`)
      .join(", ");
    await ActivityLog.create({
      userId: req.user._id, username: req.user.username,
      action: "Updated thresholds", detail: changes,
      category: "threshold",
    });

    req.io?.emit("thresholds:update", thresh);
    res.json({ ok: true, thresholds: thresh });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/commands/actuator — manual control (Manual page)
router.post("/actuator", requireNotRestricted, async (req, res) => {
  try {
    const { device, state, manual } = req.body;
    if (!device) return res.status(400).json({ error: "device required" });

    await enqueue(DEVICE_ID, "set_actuator", { device, state: +state, manual: manual !== false ? 1 : 0 }, req.user.username, req.io);

    const stateStr = state ? "ON" : "OFF";
    const lockStr  = manual !== false ? " [MANUAL LOCK]" : " [RELEASED TO AUTO]";
    await ActivityLog.create({
      userId: req.user._id, username: req.user.username,
      action: `Actuator ${device} → ${stateStr}${lockStr}`,
      category: "actuator",
    });

    req.io?.emit("actuator:change", { device, state, manual, by: req.user.username });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/commands/release-manual — release all manual locks
router.post("/release-manual", requireNotRestricted, async (req, res) => {
  try {
    await enqueue(DEVICE_ID, "release_manual", {}, req.user.username, req.io);
    await ActivityLog.create({
      userId: req.user._id, username: req.user.username,
      action: "Released all manual actuator locks", category: "actuator",
    });
    req.io?.emit("actuator:release_all", { by: req.user.username });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/commands/get-status — force Arduino status refresh
router.post("/get-status", requireNotRestricted, async (req, res) => {
  try {
    await enqueue(DEVICE_ID, "get_status", {}, req.user.username, req.io);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/commands/save-calib
router.post("/save-calib", requireNotRestricted, async (req, res) => {
  try {
    await enqueue(DEVICE_ID, "save_calib", req.body, req.user.username, req.io);
    await ActivityLog.create({
      userId: req.user._id, username: req.user.username,
      action: "Saved sensor calibration", category: "system",
    });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
