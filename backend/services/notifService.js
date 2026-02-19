"use strict";
const { Notification } = require("../models/Greenhouse");
const User = require("../models/User");

async function broadcastToAll({ title, body, type }, io) {
  try {
    const users = await User.find({ isBanned: false }).select("_id");
    const docs  = users.map(u => ({ userId: u._id, title, body, type }));
    if (docs.length) {
      await Notification.insertMany(docs);
      io?.emit("notification:new", { title, body, type });
    }
  } catch (e) { console.error("notifService:", e.message); }
}

module.exports = { broadcastToAll };
