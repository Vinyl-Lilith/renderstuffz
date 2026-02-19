// src/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [30, 'Username cannot exceed 30 characters'],
    match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'head_admin'],
    default: 'user'
  },
  theme: {
    type: String,
    enum: ['dark', 'light', 'green', 'blue'],
    default: 'dark'
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  isBanned: {
    type: Boolean,
    default: false
  },
  isRestricted: {
    type: Boolean,
    default: false
  },
  // Forgot password flow
  forgotPasswordMessage: {
    type: String,
    default: null
  },
  forgotPasswordStatus: {
    type: String,
    enum: ['none', 'pending', 'approved', 'rejected'],
    default: 'none'
  },
  forgotPasswordRequestedAt: {
    type: Date,
    default: null
  },
  lastKnownPassword: {
    type: String,
    default: null,
    select: false
  },
  // Notification preferences
  notifications: {
    temperature: { type: Boolean, default: true },
    humidity: { type: Boolean, default: true },
    soilMoisture: { type: Boolean, default: true },
    npk: { type: Boolean, default: true },
    actuators: { type: Boolean, default: true },
    system: { type: Boolean, default: true }
  },
  // Password reset
  resetPasswordToken: { type: String, select: false },
  resetPasswordExpire: { type: Date, select: false },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  // Store hash of old password as lastKnownPassword before updating
  if (this._previousPassword) {
    this.lastKnownPassword = this._previousPassword;
  }

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare passwords
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Compare with last known password
userSchema.methods.compareLastKnownPassword = async function (enteredPassword) {
  if (!this.lastKnownPassword) return false;
  return await bcrypt.compare(enteredPassword, this.lastKnownPassword);
};

const User = mongoose.model('User', userSchema);
module.exports = User;
