"use strict";
const jwt  = require("jsonwebtoken");
const User = require("../models/User");

module.exports = function socketHandler(io) {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("No token"));
      const { id } = jwt.verify(token, process.env.JWT_SECRET);
      const user   = await User.findById(id);
      if (!user || user.isBanned) return next(new Error("Unauthorized"));
      socket.user = user;
      next();
    } catch { next(new Error("Invalid token")); }
  });

  io.on("connection", async (socket) => {
    const user = socket.user;
    console.log(`🔌  ${user.username} connected [${socket.id}]`);

    await User.findByIdAndUpdate(user._id, { isOnline: true, lastSeen: new Date() });
    socket.broadcast.emit("user:online", { userId: user._id, username: user.username });

    socket.on("disconnect", async () => {
      await User.findByIdAndUpdate(user._id, { isOnline: false, lastSeen: new Date() });
      socket.broadcast.emit("user:offline", { userId: user._id });
      console.log(`🔌  ${user.username} disconnected`);
    });

    // Client can request latest data
    socket.on("request:status", () => {
      socket.emit("request:get_status");
    });
  });
};
