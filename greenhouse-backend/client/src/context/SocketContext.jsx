// client/src/context/SocketContext.jsx
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
  const raspiTimeoutRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('gh_token');
    if (!token) return;

    const socket = io('/', {
      auth: { token },
      reconnectionDelay: 2000,
      reconnectionAttempts: 10
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('requestLatest');
    });

    socket.on('disconnect', () => setConnected(false));

    socket.on('sensorData', (data) => {
      setLatestData(data);
      setRaspiOnline(true);
      // Reset the timeout
      clearTimeout(raspiTimeoutRef.current);
      raspiTimeoutRef.current = setTimeout(() => setRaspiOnline(false), 30000);
    });

    socket.on('actuatorStatus', (data) => setActuatorStatus(data));
    socket.on('thresholdsUpdated', (data) => setThresholds(data));

    socket.on('raspiHeartbeat', () => {
      setRaspiOnline(true);
      clearTimeout(raspiTimeoutRef.current);
      raspiTimeoutRef.current = setTimeout(() => setRaspiOnline(false), 30000);
    });

    socket.on('accountBanned', () => {
      localStorage.removeItem('gh_token');
      localStorage.removeItem('gh_user');
      window.location.href = '/login?banned=1';
    });

    socket.on('accountDeleted', () => {
      localStorage.removeItem('gh_token');
      localStorage.removeItem('gh_user');
      window.location.href = '/login?deleted=1';
    });

    // Ping every 15 seconds
    const pingInterval = setInterval(() => socket.emit('ping'), 15000);

    return () => {
      clearInterval(pingInterval);
      clearTimeout(raspiTimeoutRef.current);
      socket.disconnect();
    };
  }, [user?._id]);

  const socket = socketRef.current;

  return (
    <SocketContext.Provider value={{
      socket,
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
