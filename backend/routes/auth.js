"use strict";
const router = require("express").Router();
const jwt    = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User   = require("../models/User");
const { ActivityLog, Notification } = require("../models/Greenhouse");
const { authMiddleware } = require("../middleware/auth");

const sign = id => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "7d" });

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password)
      return res.status(400).json({ error: "All fields required" });
    if (password.length < 6)
      return res.status(400).json({ error: "Password min 6 chars" });

    if (await User.findOne({ $or: [{ email }, { username }] }))
      return res.status(409).json({ error: "Username or email taken" });

    const count = await User.countDocuments();
    const role  = count === 0 ? "head_admin" : "user";
    const user  = await User.create({ username, email, password, role });

    await ActivityLog.create({ userId: user._id, username, action: "Registered account", category: "auth" });

    res.status(201).json({ token: sign(user._id), user: user.toSafe() });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ error: "Fields required" });

    const user = await User.findOne({ $or: [{ username }, { email: username }] }).select("+password");
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ error: "Invalid credentials" });
    if (user.isBanned) return res.status(403).json({ error: "Account banned" });

    user.isOnline = true;
    user.lastSeen = new Date();
    await user.save();

    req.io?.emit("user:online", { userId: user._id, username: user.username });
    await ActivityLog.create({ userId: user._id, username: user.username, action: "Logged in", category: "auth" });

    res.json({ token: sign(user._id), user: user.toSafe() });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/auth/logout
router.post("/logout", authMiddleware, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { isOnline: false, lastSeen: new Date() });
    req.io?.emit("user:offline", { userId: req.user._id });
    await ActivityLog.create({ userId: req.user._id, username: req.user.username, action: "Logged out", category: "auth" });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/auth/me
router.get("/me", authMiddleware, async (req, res) => {
  res.json({ user: req.user.toSafe() });
});

// PUT /api/auth/change-password
router.put("/change-password", authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ error: "Both fields required" });
    if (newPassword.length < 6)
      return res.status(400).json({ error: "New password min 6 chars" });

    const user = await User.findById(req.user._id).select("+password");
    if (!(await user.comparePassword(currentPassword)))
      return res.status(401).json({ error: "Current password wrong" });

    user.password = newPassword;
    await user.save();

    await ActivityLog.create({ userId: user._id, username: user.username, action: "Changed password", category: "auth" });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/auth/change-username
router.put("/change-username", authMiddleware, async (req, res) => {
  try {
    const { newUsername } = req.body;
    if (!newUsername || newUsername.length < 3)
      return res.status(400).json({ error: "Username min 3 chars" });
    if (await User.findOne({ username: newUsername }))
      return res.status(409).json({ error: "Username taken" });

    const old = req.user.username;
    await User.findByIdAndUpdate(req.user._id, { username: newUsername });
    await ActivityLog.create({ userId: req.user._id, username: old, action: `Changed username to ${newUsername}`, category: "auth" });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/auth/forgot-password  — user submits request
router.post("/forgot-password", async (req, res) => {
  try {
    const { username, message, lastKnownPassword } = req.body;
    if (!username) return res.status(400).json({ error: "Username required" });

    const user = await User.findOne({ $or: [{ username }, { email: username }] });
    if (!user) return res.status(404).json({ error: "User not found" });

    user.forgotPasswordRequest = {
      pending: true,
      message: message || "",
      requestedAt: new Date(),
      lastKnownPassword: lastKnownPassword || "",
    };
    await user.save();

    // Notify all admins
    const admins = await User.find({ role: { $in: ["admin","head_admin"] } });
    for (const admin of admins) {
      await Notification.create({
        userId: admin._id,
        title: "Password Reset Request",
        body: `User "${user.username}" requested a password reset.`,
        type: "warning",
      });
    }
    req.io?.emit("admin:forgot_password_request", { username: user.username });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
