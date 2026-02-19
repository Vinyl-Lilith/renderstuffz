"use strict";
require("dotenv").config();
const express    = require("express");
const http       = require("http");
const path       = require("path");
const cors       = require("cors");
const helmet     = require("helmet");
const morgan     = require("morgan");
const mongoose   = require("mongoose");
const { Server } = require("socket.io");
const rateLimit  = require("express-rate-limit");

const authRoutes    = require("./routes/auth");
const piRoutes      = require("./routes/pi");
const dataRoutes    = require("./routes/data");
const commandRoutes = require("./routes/commands");
const adminRoutes   = require("./routes/admin");
const userRoutes    = require("./routes/users");

const { authMiddleware }   = require("./middleware/auth");
const { piAuthMiddleware } = require("./middleware/auth");
const socketHandler        = require("./services/socketHandler");

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: "*", methods: ["GET","POST","PUT","DELETE"] },
  maxHttpBufferSize: 10e6,
});

// Make io available in all routes
app.use((req, _res, next) => { req.io = io; next(); });

// Security
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({ origin: "*", credentials: true }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// Rate limiting
app.use("/api/auth", rateLimit({ windowMs: 15*60*1000, max: 30, message: { error: "Too many requests" } }));

// API routes
app.use("/api/auth",     authRoutes);
app.use("/api/pi",       piAuthMiddleware, piRoutes);
app.use("/api/data",     authMiddleware, dataRoutes);
app.use("/api/commands", authMiddleware, commandRoutes);
app.use("/api/admin",    authMiddleware, adminRoutes);
app.use("/api/users",    authMiddleware, userRoutes);

// Serve built React app
const dist = path.join(__dirname, "../frontend/dist");
app.use(express.static(dist, { maxAge: "1d" }));
app.get("*", (_req, res) => res.sendFile(path.join(dist, "index.html")));

// Socket.IO
socketHandler(io);

// MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("✅  MongoDB connected"))
  .catch(err => { console.error("❌  MongoDB:", err.message); process.exit(1); });

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`🌿  BioCube running on :${PORT}`));
module.exports = { app, io };
