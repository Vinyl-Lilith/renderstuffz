# BioCube Frontend

The BioCube frontend is a **React + Vite** application built with a biopunk organic-tech aesthetic. It integrates with the BioCube backend over REST API and Socket.IO for real-time updates.

---

## 🚀 Setup

### Integrated with Backend (Recommended for Production)

The frontend is designed to be built **inside** the backend repo at `client/`. The backend serves the built files via Express static file serving.

1. Copy this entire folder into your backend repo as `client/`
2. Ensure `vite.config.js` proxy points to your Express server
3. Run `npm run build` from inside `client/` to produce `dist/`
4. The backend will serve `client/dist/` as static files

### Standalone Dev Mode

```bash
# Install deps
npm install

# Start dev server (proxies /api and /socket.io to localhost:3000)
npm run dev

# Build for production
npm run build
```

---

## 🔧 Environment Variables

Create `.env` at the root of the `client/` folder:

```env
# Only needed if webcam is on a different origin (e.g. Cloudflare tunnel URL)
VITE_WEBCAM_URL=https://webcam.yourdomain.com

# Backend API URL (only needed if not proxied, i.e. running standalone)
VITE_API_URL=https://your-backend.onrender.com
```

If using the integrated setup (frontend inside backend repo), the Vite proxy handles all `/api` requests and you don't need `VITE_API_URL`.

---

## 🎨 Themes

BioCube ships with **4 themes**, each completely isolated per user:

| Theme | Aesthetic |
|-------|-----------|
| **Void Dark** | Default biopunk darkness — deep teal glows on near-black |
| **Clean Lab** | Bright clinical white — professional daytime interface |
| **Cyber Pulse** | Neon violet cyberpunk — purple/magenta on void black |
| **Solar Core** | Amber radiation warmth — golden orange on dark brown |

Users select their own theme in Settings → it is stored in their account and doesn't affect other users.

---

## 📡 Real-time Events (Socket.IO)

The frontend listens for these events from the backend:

| Event | Description |
|-------|-------------|
| `sensorData` | New sensor reading from Raspberry Pi |
| `actuatorStatus` | Arduino actuator state update |
| `thresholdsUpdated` | Threshold configuration changed |
| `raspiHeartbeat` | Raspberry Pi heartbeat |
| `notification` | User notification (toast + bell) |
| `accountBanned` | Redirects to login with reason |
| `accountDeleted` | Redirects to login with reason |
| `userOnline/Offline` | Admin panel live presence |

---

## 📁 Structure

```
client/src/
├── pages/
│   ├── Dashboard.jsx      # Live sensor metrics, webcam, charts, download
│   ├── Logic.jsx          # Threshold editor (Arduino sync)
│   ├── Manual.jsx         # Actuator manual control
│   ├── AdminPanel.jsx     # User management, logs, password requests
│   ├── Settings.jsx       # Theme picker, username/password change
│   ├── Login.jsx          # Login + forgot password flow
│   └── Register.jsx
├── components/
│   ├── layout/
│   │   ├── AppLayout.jsx  # Shell wrapper
│   │   ├── Sidebar.jsx    # Navigation, system status, user card
│   │   └── Topbar.jsx     # Page title, status pills, notification bell
│   ├── common/
│   │   └── ProtectedRoute.jsx
│   └── ui/
│       └── CubeLogo.jsx   # BioCube SVG logo mark
├── context/
│   ├── AuthContext.jsx    # JWT auth state
│   ├── SocketContext.jsx  # Socket.IO + live data
│   ├── ThemeContext.jsx   # Per-user theme (isolated)
│   └── NotificationContext.jsx
├── api/client.js          # Axios with auth interceptor
└── styles/globals.css     # Full design system (4 themes, all components)
```
