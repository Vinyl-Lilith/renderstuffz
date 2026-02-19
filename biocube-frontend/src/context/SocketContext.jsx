// src/context/SocketContext.jsx
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [latestData, setLatestData] = useState(null);
  const [actuatorStatus, setActuatorStatus] = useState(null);
  const [thresholds, setThresholds] = useState(null);
  const [raspiOnline, setRaspiOnline] = useState(false);
  const raspiTimerRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('bc_token');
    if (!token) return;

    const socket = io('/', {
      auth: { token },
      reconnectionDelay: 2000,
      reconnectionAttempts: 10,
      transports: ['websocket', 'polling']
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('requestLatest');
    });
    socket.on('disconnect', () => setConnected(false));

    socket.on('sensorData', (data) => {
      setLatestData(data);
      // Mark Pi online, reset timeout
      setRaspiOnline(true);
      clearTimeout(raspiTimerRef.current);
      raspiTimerRef.current = setTimeout(() => setRaspiOnline(false), 30000);
    });

    socket.on('actuatorStatus', (data) => setActuatorStatus(data));
    socket.on('thresholdsUpdated', (data) => setThresholds(data));
    socket.on('raspiHeartbeat', () => {
      setRaspiOnline(true);
      clearTimeout(raspiTimerRef.current);
      raspiTimerRef.current = setTimeout(() => setRaspiOnline(false), 30000);
    });

    socket.on('accountBanned', () => {
      localStorage.removeItem('bc_token');
      localStorage.removeItem('bc_user');
      window.location.href = '/login?reason=banned';
    });
    socket.on('accountDeleted', () => {
      localStorage.removeItem('bc_token');
      localStorage.removeItem('bc_user');
      window.location.href = '/login?reason=deleted';
    });

    const ping = setInterval(() => socket.emit('ping'), 15000);

    return () => {
      clearInterval(ping);
      clearTimeout(raspiTimerRef.current);
      socket.disconnect();
    };
  }, [user?._id]);

  return (
    <SocketContext.Provider value={{
      socket: socketRef.current,
      connected,
      latestData,
      actuatorStatus,
      thresholds,
      raspiOnline,
      setThresholds
    }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
