// client/src/context/NotificationContext.jsx
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';
import api from '../api/client';
import toast from 'react-hot-toast';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { socket } = useSocket();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get('/user/notifications?limit=50');
      setNotifications(res.data.notifications);
      setUnreadCount(res.data.unreadCount);
    } catch {}
  }, [user]);

  useEffect(() => {
    if (user) fetchNotifications();
  }, [user]);

  useEffect(() => {
    if (!socket) return;

    socket.on('notification', (notif) => {
      setNotifications(prev => [notif, ...prev]);
      setUnreadCount(prev => prev + 1);

      // Show toast
      const toastFn = notif.severity === 'critical' ? toast.error
        : notif.severity === 'warning' ? toast
        : toast.success;

      toast(notif.message, {
        icon: notif.severity === 'critical' ? '🚨' : notif.severity === 'warning' ? '⚠️' : '✅',
        duration: 5000
      });
    });

    return () => socket.off('notification');
  }, [socket]);

  const markRead = useCallback(async (ids) => {
    await api.put('/user/notifications/read', { ids });
    setNotifications(prev => prev.map(n =>
      (!ids || ids.includes(n._id)) ? { ...n, read: true } : n
    ));
    setUnreadCount(0);
  }, []);

  const markAllRead = useCallback(async () => {
    await api.put('/user/notifications/read', { all: true });
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  const clearAll = useCallback(async () => {
    await api.delete('/user/notifications');
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  return (
    <NotificationContext.Provider value={{
      notifications, unreadCount, fetchNotifications, markRead, markAllRead, clearAll
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
