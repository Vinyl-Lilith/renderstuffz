import { createContext, useContext, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const SocketCtx = createContext(null);

export function SocketProvider({ children }) {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [sensorData,    setSensorData]    = useState(null);
  const [piStatus,      setPiStatus]      = useState({ online: false });
  const [thresholds,    setThresholds]    = useState(null);
  const [cameraFrame,   setCameraFrame]   = useState(null);
  const [cameraOnline,  setCameraOnline]  = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem("bc_token");
    if (!token) return;

    const socket = io("/", { auth: { token }, transports: ["websocket","polling"] });
    socketRef.current = socket;

    socket.on("connect",    () => setConnected(true));
    socket.on("disconnect", () => { setConnected(false); setCameraOnline(false); });

    socket.on("sensor:data",      d => setSensorData(d));
    socket.on("pi:status",        d => setPiStatus(p => ({ ...p, ...d })));
    socket.on("thresholds:update",d => setThresholds(d));

    socket.on("camera:frame",   d => { setCameraOnline(true); setCameraFrame("data:image/jpeg;base64," + d.data); });
    socket.on("camera:offline", () => { setCameraOnline(false); setCameraFrame(null); });

    socket.on("notification:new", n => {
      setNotifications(prev => [{ ...n, id: Date.now(), read: false }, ...prev].slice(0, 50));
    });

    socket.on("system:alert", alert => {
      setNotifications(prev => [{ ...alert, id: Date.now(), read: false, isSystem: true }, ...prev].slice(0, 50));
    });

    return () => { socket.disconnect(); };
  }, []);

  const emit = (event, data) => socketRef.current?.emit(event, data);

  const markRead = id => setNotifications(p => p.map(n => n.id === id ? { ...n, read: true } : n));

  return (
    <SocketCtx.Provider value={{ connected, sensorData, piStatus, thresholds, cameraFrame, cameraOnline, notifications, markRead, emit }}>
      {children}
    </SocketCtx.Provider>
  );
}

export const useSocket = () => useContext(SocketCtx);
