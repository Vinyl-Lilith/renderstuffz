"use strict";
const router = require("express").Router();
const { Notification } = require("../models/Greenhouse");
const User = require("../models/User");

// GET /api/users/notifications
router.get("/notifications", async (req, res) => {
  try {
    const notifs = await Notification.find({ userId: req.user._id }).sort({ ts: -1 }).limit(50);
    res.json({ notifications: notifs });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/users/notifications/:id/read
router.put("/notifications/:id/read", async (req, res) => {
  try {
    await Notification.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, { read: true });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/users/notifications/read-all
router.put("/notifications/read-all", async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.user._id, read: false }, { read: true });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/users/theme
router.put("/theme", async (req, res) => {
  try {
    const { theme } = req.body;
    if (!["dark","light","forest","ocean"].includes(theme))
      return res.status(400).json({ error: "Invalid theme" });
    await User.findByIdAndUpdate(req.user._id, { theme });
    res.json({ ok: true, theme });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
