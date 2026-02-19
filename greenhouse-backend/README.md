# 🌿 Smart Greenhouse Control System — Backend + Frontend

Full-stack web application for the Smart Automated Greenhouse System. Backend (Node.js/Express/MongoDB) and Frontend (React/Vite) are in the **same repo** and deployed together on Render.

---

## 🏗️ Architecture

```
Arduino Mega ──Serial──▶ Raspberry Pi ──HTTPS──▶ Render Backend ◀──▶ MongoDB
                                │                        │
                           USB Webcam            Frontend (React)
                                │                        │
                           MJPEG Stream ◀───────── Browser
```

---

## 📁 Project Structure

```
greenhouse-system/
├── src/                      ← Backend (Node.js)
│   ├── server.js             ← Main entry, Express + Socket.IO
│   ├── config/database.js    ← MongoDB connection
│   ├── models/               ← Mongoose schemas
│   │   ├── User.js
│   │   ├── SensorData.js
│   │   ├── Thresholds.js
│   │   ├── ActivityLog.js
│   │   └── Notification.js
│   ├── routes/
│   │   ├── auth.js           ← Register, login, password change
│   │   ├── greenhouse.js     ← Sensor data, thresholds, manual control
│   │   ├── admin.js          ← User management, logs, password resets
│   │   └── user.js           ← Notifications, theme, preferences
│   ├── middleware/auth.js    ← JWT auth, role guards, Raspi API key
│   └── utils/
│       ├── notifications.js  ← Notification system
│       └── logger.js         ← Activity log writer
├── client/                   ← Frontend (React + Vite)
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx  ← Homepage: sensors, webcam, charts
│   │   │   ├── Logic.jsx      ← Threshold editor
│   │   │   ├── Manual.jsx     ← Actuator control
│   │   │   ├── AdminPanel.jsx ← User management, logs
│   │   │   ├── Settings.jsx   ← Theme, password, username
│   │   │   ├── Login.jsx      ← Login + forgot password flow
│   │   │   └── Register.jsx
│   │   ├── context/          ← React contexts
│   │   │   ├── AuthContext.jsx
│   │   │   ├── SocketContext.jsx   ← Real-time data
│   │   │   ├── ThemeContext.jsx    ← Per-user theme
│   │   │   └── NotificationContext.jsx
│   │   └── styles/globals.css ← All CSS with 4 themes
│   └── package.json
├── package.json
├── render.yaml
└── .env.example
```

---

## 🚀 Deployment on Render

### Step 1: MongoDB
1. Create a free cluster on [MongoDB Atlas](https://cloud.mongodb.com)
2. Create a database user and get the connection string

### Step 2: Deploy to Render
1. Push this repo to GitHub
2. Go to [Render](https://render.com) → New → Web Service
3. Connect your GitHub repo
4. Set **Build Command**: `npm install && npm run build`
5. Set **Start Command**: `node src/server.js`

### Step 3: Environment Variables on Render
```
NODE_ENV=production
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/greenhouse
JWT_SECRET=<generate a 64-char random string>
JWT_REFRESH_SECRET=<generate another 64-char random string>
RASPI_API_KEY=<same key you set on the Raspberry Pi>
CLIENT_URL=https://your-app.onrender.com
```

---

## 🔌 Raspberry Pi Integration

In your Raspberry Pi's `config.py`, set:
```python
BACKEND_URL = 'https://your-app.onrender.com'
API_KEY = 'your-raspi-api-key'  # Same as RASPI_API_KEY on Render
```

The Pi will:
1. `POST /api/greenhouse/data` — push sensor data
2. `GET /api/greenhouse/commands` — poll for threshold/control commands
3. `POST /api/greenhouse/heartbeat` — send heartbeat
4. `POST /api/greenhouse/status` — push actuator status

---

## 🌐 API Reference

### Auth
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |
| GET  | `/api/auth/me` | Get current user |
| PUT  | `/api/auth/change-password` | Change own password |
| PUT  | `/api/auth/change-username` | Change username |
| POST | `/api/auth/forgot-password` | Submit forgot password request |

### Greenhouse (frontend)
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/greenhouse/latest` | Latest sensor reading |
| GET | `/api/greenhouse/history` | Historical data (24h or by range) |
| GET | `/api/greenhouse/download` | Excel download (by date) |
| GET | `/api/greenhouse/thresholds` | Current thresholds (from Arduino) |
| PUT | `/api/greenhouse/thresholds` | Update thresholds → queued for Pi→Arduino |
| POST | `/api/greenhouse/manual` | Manual actuator control |

### Greenhouse (Raspberry Pi — API key required)
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/greenhouse/data` | Push sensor data (batch OK) |
| GET  | `/api/greenhouse/commands` | Poll pending commands |
| POST | `/api/greenhouse/heartbeat` | Send heartbeat |
| POST | `/api/greenhouse/status` | Push actuator status |

### Admin (admins only)
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/admin/users` | List all users |
| GET | `/api/admin/online` | Online users |
| GET | `/api/admin/logs` | Activity logs |
| PUT | `/api/admin/users/:id/ban` | Ban/unban |
| PUT | `/api/admin/users/:id/restrict` | Restrict/unrestrict |
| DELETE | `/api/admin/users/:id` | Delete user |
| PUT | `/api/admin/users/:id/promote` | Promote/demote (head admin only) |
| GET | `/api/admin/forgot-password-requests` | Pending pw requests |
| PUT | `/api/admin/forgot-password-requests/:id/approve` | Approve & set new pw |
| PUT | `/api/admin/forgot-password-requests/:id/reject` | Reject request |

---

## 👥 User Roles

| Role | Capabilities |
|------|-------------|
| **User** | View dashboard, change thresholds, control actuators, manage own profile |
| **Admin** | All above + ban/restrict/delete users, manage forgot-password, view logs |
| **Head Admin** | All above + promote/demote admins (first user to register becomes Head Admin) |

---

## 🎨 Themes
Each user independently selects their theme: **Dark**, **Light**, **Green**, or **Blue**.  
Changing your theme does **not** affect other users.

---

## ⚡ Real-time Features (Socket.IO)
- Live sensor data pushed to dashboard the moment the Raspberry Pi sends it
- Actuator status updates in real-time
- Threshold changes broadcast to all dashboards
- Notifications delivered instantly
- Admin sees user online/offline status live

---

## 🔔 Notification System
Automatic notifications are triggered for:
- Temperature exceeding min/max thresholds
- Humidity out of range
- Low soil moisture
- Low NPK levels
- Actuator manual control events
- Threshold change events
- Admin: forgot password requests
- User: account restriction/ban/role changes

---

## 📊 Data Download
On the Dashboard, select any past date and download an Excel file (`.xlsx`) containing all sensor readings for that day, including timestamps, temperature, humidity, soil moisture 1 & 2, and NPK values.

---

## 🔒 Security
- JWT authentication with 7-day expiry
- Rate limiting: 200 req/15min general, 20 req/15min for auth
- Raspberry Pi authenticated separately with a static API key
- Passwords hashed with bcrypt (12 rounds)
- Banned users are immediately disconnected via WebSocket
