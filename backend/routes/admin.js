"use strict";
const router  = require("express").Router();
const bcrypt  = require("bcryptjs");
const User    = require("../models/User");
const { ActivityLog, Notification } = require("../models/Greenhouse");
const { requireAdmin, requireHeadAdmin } = require("../middleware/auth");

// All admin routes require at least admin role
router.use(requireAdmin);

// GET /api/admin/users
router.get("/users", async (req, res) => {
  try {
    const users = await User.find().select("-password -forgotPasswordRequest.lastKnownPassword").sort({ createdAt: 1 });
    res.json({ users });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/admin/online-users
router.get("/online-users", async (req, res) => {
  try {
    const users = await User.find({ isOnline: true }).select("username role lastSeen");
    res.json({ users });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/admin/logs?limit=200
router.get("/logs", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 200;
    const logs  = await ActivityLog.find().sort({ ts: -1 }).limit(limit).lean();
    res.json({ logs });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/admin/forgot-requests
router.get("/forgot-requests", async (req, res) => {
  try {
    const users = await User.find({ "forgotPasswordRequest.pending": true })
      .select("username email forgotPasswordRequest.message forgotPasswordRequest.requestedAt");
    res.json({ requests: users });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/admin/approve-password-reset
router.post("/approve-password-reset", async (req, res) => {
  try {
    const { userId, newPassword } = req.body;
    if (!userId || !newPassword) return res.status(400).json({ error: "userId and newPassword required" });
    if (newPassword.length < 6) return res.status(400).json({ error: "Password min 6 chars" });

    const target = await User.findById(userId);
    if (!target) return res.status(404).json({ error: "User not found" });

    target.password = newPassword;
    target.forgotPasswordRequest.pending = false;
    await target.save();

    // Notify the user
    await Notification.create({
      userId: target._id,
      title: "Password Reset Approved",
      body: `An admin has reset your password. Please log in and change it immediately.`,
      type: "success",
    });

    req.io?.emit("user:password_reset", { userId: target._id });
    await ActivityLog.create({
      userId: req.user._id, username: req.user.username,
      action: `Approved password reset for ${target.username}`, category: "admin",
    });

    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/admin/deny-password-reset
router.post("/deny-password-reset", async (req, res) => {
  try {
    const { userId } = req.body;
    await User.findByIdAndUpdate(userId, { "forgotPasswordRequest.pending": false });
    await ActivityLog.create({
      userId: req.user._id, username: req.user.username,
      action: `Denied password reset request`, category: "admin",
    });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/admin/ban/:userId
router.put("/ban/:userId", async (req, res) => {
  try {
    const target = await User.findById(req.params.userId);
    if (!target) return res.status(404).json({ error: "User not found" });
    if (target.role === "head_admin") return res.status(403).json({ error: "Cannot ban head admin" });

    await User.findByIdAndUpdate(target._id, { isBanned: !target.isBanned, isOnline: false });
    const action = target.isBanned ? "Unbanned" : "Banned";
    await ActivityLog.create({ userId: req.user._id, username: req.user.username, action: `${action} user ${target.username}`, category: "admin" });
    req.io?.emit("admin:user_update", { userId: target._id, action: action.toLowerCase() });
    res.json({ ok: true, banned: !target.isBanned });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/admin/restrict/:userId
router.put("/restrict/:userId", async (req, res) => {
  try {
    const target = await User.findById(req.params.userId);
    if (!target) return res.status(404).json({ error: "Not found" });
    if (target.role === "head_admin") return res.status(403).json({ error: "Cannot restrict head admin" });

    await User.findByIdAndUpdate(target._id, { isRestricted: !target.isRestricted });
    await ActivityLog.create({ userId: req.user._id, username: req.user.username, action: `${target.isRestricted ? "Unrestricted" : "Restricted"} user ${target.username}`, category: "admin" });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/admin/users/:userId
router.delete("/users/:userId", async (req, res) => {
  try {
    const target = await User.findById(req.params.userId);
    if (!target) return res.status(404).json({ error: "Not found" });
    if (target.role === "head_admin") return res.status(403).json({ error: "Cannot delete head admin" });

    await User.findByIdAndDelete(target._id);
    await ActivityLog.create({ userId: req.user._id, username: req.user.username, action: `Deleted user ${target.username}`, category: "admin" });
    req.io?.emit("admin:user_deleted", { userId: target._id });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/admin/promote/:userId — head_admin only
router.put("/promote/:userId", requireHeadAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    if (!["admin","user"].includes(role)) return res.status(400).json({ error: "Invalid role" });
    const target = await User.findById(req.params.userId);
    if (!target) return res.status(404).json({ error: "Not found" });
    if (target.role === "head_admin") return res.status(403).json({ error: "Cannot demote head admin" });

    await User.findByIdAndUpdate(target._id, { role });
    await ActivityLog.create({ userId: req.user._id, username: req.user.username, action: `Changed ${target.username} role to ${role}`, category: "admin" });
    req.io?.emit("admin:role_change", { userId: target._id, role });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
