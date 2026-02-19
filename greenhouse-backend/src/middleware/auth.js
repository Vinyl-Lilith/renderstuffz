// src/middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verify JWT token
exports.protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({ success: false, message: 'User no longer exists.' });
    }

    if (user.isBanned) {
      return res.status(403).json({ success: false, message: 'Your account has been banned.' });
    }

    // Update online status
    user.isOnline = true;
    user.lastSeen = new Date();
    await user.save({ validateBeforeSave: false });

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired.' });
    }
    return res.status(401).json({ success: false, message: 'Not authorized.' });
  }
};

// Require admin role
exports.requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'head_admin') {
    return res.status(403).json({ success: false, message: 'Admin access required.' });
  }
  next();
};

// Require head admin role
exports.requireHeadAdmin = (req, res, next) => {
  if (req.user.role !== 'head_admin') {
    return res.status(403).json({ success: false, message: 'Head admin access required.' });
  }
  next();
};

// Require restricted check
exports.notRestricted = (req, res, next) => {
  if (req.user.isRestricted) {
    return res.status(403).json({
      success: false,
      message: 'Your account is restricted. Contact an admin.'
    });
  }
  next();
};

// Raspberry Pi API key authentication
exports.raspiAuth = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.headers.authorization?.replace('Bearer ', '');
  if (!apiKey || apiKey !== process.env.RASPI_API_KEY) {
    return res.status(401).json({ success: false, message: 'Invalid API key.' });
  }
  next();
};

// Generate JWT token
exports.generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};
