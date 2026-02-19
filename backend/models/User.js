"use strict";
const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");

const userSchema = new mongoose.Schema({
  username:     { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 30 },
  email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:     { type: String, required: true, minlength: 6, select: false },
  role:         { type: String, enum: ["head_admin","admin","user"], default: "user" },
  theme:        { type: String, default: "dark" },
  isOnline:     { type: Boolean, default: false },
  isBanned:     { type: Boolean, default: false },
  isRestricted: { type: Boolean, default: false },
  lastSeen:     { type: Date, default: Date.now },
  forgotPasswordRequest: {
    pending:     { type: Boolean, default: false },
    message:     { type: String, default: "" },
    requestedAt: { type: Date },
    lastKnownPassword: { type: String, default: "" },
  },
}, { timestamps: true });

userSchema.pre("save", async function(next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toSafe = function() {
  const o = this.toObject();
  delete o.password;
  if (o.forgotPasswordRequest) delete o.forgotPasswordRequest.lastKnownPassword;
  return o;
};

module.exports = mongoose.model("User", userSchema);
