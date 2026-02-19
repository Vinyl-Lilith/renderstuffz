// src/context/NotificationContext.jsx
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';
import api from '../api/client';
import toast from 'react-hot-toast';

const NotifContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { socket } = useSocket();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetch = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get('/user/notifications?limit=60');
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch {}
  }, [user]);

  useEffect(() => { if (user) fetch(); }, [user]);

  useEffect(() => {
    if (!socket) return;
    const handler = (n) => {
      setNotifications(prev => [n, ...prev]);
      setUnreadCount(c => c + 1);
      const icon = n.severity === 'critical' ? '🚨' : n.severity === 'warning' ? '⚠️' : '✅';
      toast(n.message, { icon, duration: 5000 });
    };
    socket.on('notification', handler);
    return () => socket.off('notification', handler);
  }, [socket]);

  const markRead = useCallback(async (ids) => {
    try {
      await api.put('/user/notifications/read', ids ? { ids } : { all: true });
      setNotifications(prev => prev.map(n =>
        (!ids || ids.includes(n._id)) ? { ...n, read: true } : n
      ));
      setUnreadCount(0);
    } catch {}
  }, []);

  const clearAll = useCallback(async () => {
    try {
      await api.delete('/user/notifications');
      setNotifications([]);
      setUnreadCount(0);
    } catch {}
  }, []);

  return (
    <NotifContext.Provider value={{ notifications, unreadCount, fetch, markRead, clearAll }}>
      {children}
    </NotifContext.Provider>
  );
};

export const useNotifications = () => useContext(NotifContext);
