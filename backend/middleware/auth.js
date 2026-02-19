"use strict";
const jwt  = require("jsonwebtoken");
const User = require("../models/User");

async function authMiddleware(req, res, next) {
  const header = req.headers.authorization || "";
  const token  = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "No token" });
  try {
    const { id } = jwt.verify(token, process.env.JWT_SECRET);
    const user   = await User.findById(id);
    if (!user)         return res.status(401).json({ error: "User not found" });
    if (user.isBanned) return res.status(403).json({ error: "Account banned" });
    req.user = user;
    next();
  } catch { res.status(401).json({ error: "Invalid token" }); }
}

function requireAdmin(req, res, next) {
  if (!["admin","head_admin"].includes(req.user?.role))
    return res.status(403).json({ error: "Admin required" });
  next();
}

function requireHeadAdmin(req, res, next) {
  if (req.user?.role !== "head_admin")
    return res.status(403).json({ error: "Head admin required" });
  next();
}

function requireNotRestricted(req, res, next) {
  if (req.user?.isRestricted)
    return res.status(403).json({ error: "Account restricted" });
  next();
}

function piAuthMiddleware(req, res, next) {
  const key = req.headers["x-api-key"]   || req.query.api_key;
  const dev = req.headers["x-device-id"] || req.query.device_id || req.body?.device_id;
  if (key !== process.env.PI_API_KEY)    return res.status(401).json({ error: "Bad Pi API key" });
  if (dev !== process.env.PI_DEVICE_ID)  return res.status(401).json({ error: "Bad device ID" });
  req.piDeviceId = dev;
  next();
}

module.exports = { authMiddleware, requireAdmin, requireHeadAdmin, requireNotRestricted, piAuthMiddleware };
