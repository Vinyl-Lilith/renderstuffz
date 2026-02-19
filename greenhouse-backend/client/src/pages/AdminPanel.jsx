// client/src/pages/AdminPanel.jsx
import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const TABS = ['Users', 'Online', 'Logs', 'Password Requests'];

export default function AdminPanel() {
  const { user } = useAuth();
  const [tab, setTab] = useState('Users');
  const [users, setUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [pwRequests, setPwRequests] = useState([]);
  const [loading, setLoading] = useState(false);

  // For password approval modal
  const [approveModal, setApproveModal] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  const loadUsers = useCallback(async () => {
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data.users);
    } catch {}
  }, []);

  const loadOnline = useCallback(async () => {
    try {
      const res = await api.get('/admin/online');
      setOnlineUsers(res.data.users);
    } catch {}
  }, []);

  const loadLogs = useCallback(async () => {
    try {
      const res = await api.get('/admin/logs?hours=24&limit=200');
      setLogs(res.data.logs);
    } catch {}
  }, []);

  const loadPwRequests = useCallback(async () => {
    try {
      const res = await api.get('/admin/forgot-password-requests');
      setPwRequests(res.data.requests);
    } catch {}
  }, []);

  useEffect(() => {
    loadUsers();
    loadLogs();
    loadPwRequests();
    const interval = setInterval(loadOnline, 10000);
    loadOnline();
    return () => clearInterval(interval);
  }, []);

  const handleBan = async (userId, ban) => {
    setLoading(true);
    try {
      await api.put(`/admin/users/${userId}/ban`, { ban });
      toast.success(ban ? 'User banned' : 'User unbanned');
      loadUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setLoading(false); }
  };

  const handleRestrict = async (userId, restrict) => {
    setLoading(true);
    try {
      await api.put(`/admin/users/${userId}/restrict`, { restrict });
      toast.success(restrict ? 'User restricted' : 'User unrestricted');
      loadUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setLoading(false); }
  };

  const handleDelete = async (userId, username) => {
    if (!confirm(`Delete user "${username}"? This cannot be undone.`)) return;
    setLoading(true);
    try {
      await api.delete(`/admin/users/${userId}`);
      toast.success('User deleted');
      loadUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setLoading(false); }
  };

  const handlePromote = async (userId, role) => {
    setLoading(true);
    try {
      await api.put(`/admin/users/${userId}/promote`, { role });
      toast.success(`User ${role === 'admin' ? 'promoted to admin' : 'demoted to user'}`);
      loadUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setLoading(false); }
  };

  const handleApprovePassword = async () => {
    if (!newPassword || newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      await api.put(`/admin/forgot-password-requests/${approveModal._id}/approve`, { newPassword });
      toast.success('Password reset approved');
      setApproveModal(null);
      setNewPassword('');
      loadPwRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setLoading(false); }
  };

  const handleRejectPassword = async (userId) => {
    setLoading(true);
    try {
      await api.put(`/admin/forgot-password-requests/${userId}/reject`);
      toast.success('Request rejected');
      loadPwRequests();
    } catch { toast.error('Failed'); }
    finally { setLoading(false); }
  };

  const roleLabel = (role) => {
    if (role === 'head_admin') return <span className="badge badge-head-admin">👑 Head Admin</span>;
    if (role === 'admin') return <span className="badge badge-admin">🛡️ Admin</span>;
    return <span className="badge">👤 User</span>;
  };

  return (
    <div>
      <div className="page-header">
        <h1>👑 Admin Panel</h1>
        <p>Manage users, view logs, and handle system administration</p>
      </div>
      <div className="page-body">
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
          {TABS.map(t => (
            <button
              key={t}
              className="btn btn-ghost"
              style={{
                borderRadius: '8px 8px 0 0',
                borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
                color: tab === t ? 'var(--accent)' : 'var(--text-secondary)',
                fontWeight: tab === t ? 700 : 500
              }}
              onClick={() => setTab(t)}
            >
              {t}
              {t === 'Password Requests' && pwRequests.length > 0 && (
                <span className="badge badge-warning" style={{ marginLeft: 6 }}>{pwRequests.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* Users Tab */}
        {tab === 'Users' && (
          <div className="card">
            <div className="flex-between mb-16">
              <div className="section-title" style={{ marginBottom: 0 }}>All Users ({users.length})</div>
              <button className="btn btn-secondary btn-sm" onClick={loadUsers}>🔄 Refresh</button>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u._id}>
                      <td style={{ fontWeight: 600 }}>{u.username}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
                      <td>{roleLabel(u.role)}</td>
                      <td>
                        {u.isBanned ? <span className="badge badge-offline">Banned</span>
                          : u.isRestricted ? <span className="badge badge-warning">Restricted</span>
                          : u.isOnline ? <span className="badge badge-online">Online</span>
                          : <span className="badge">Offline</span>}
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        {format(new Date(u.createdAt), 'MMM dd, yyyy')}
                      </td>
                      <td>
                        {u._id !== user._id && u.role !== 'head_admin' && (
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {user.role === 'head_admin' && (
                              <button
                                className="btn btn-secondary btn-sm"
                                disabled={loading}
                                onClick={() => handlePromote(u._id, u.role === 'admin' ? 'user' : 'admin')}
                              >
                                {u.role === 'admin' ? '↓ Demote' : '↑ Promote'}
                              </button>
                            )}
                            <button
                              className="btn btn-secondary btn-sm"
                              disabled={loading}
                              onClick={() => handleRestrict(u._id, !u.isRestricted)}
                            >
                              {u.isRestricted ? '🔓 Unrestrict' : '🔒 Restrict'}
                            </button>
                            <button
                              className="btn btn-secondary btn-sm"
                              disabled={loading}
                              onClick={() => handleBan(u._id, !u.isBanned)}
                            >
                              {u.isBanned ? '✅ Unban' : '🚫 Ban'}
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              disabled={loading}
                              onClick={() => handleDelete(u._id, u.username)}
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Online Tab */}
        {tab === 'Online' && (
          <div className="card">
            <div className="flex-between mb-16">
              <div className="section-title" style={{ marginBottom: 0 }}>Currently Online ({onlineUsers.length})</div>
              <button className="btn btn-secondary btn-sm" onClick={loadOnline}>🔄 Refresh</button>
            </div>
            {onlineUsers.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 32 }}>No users currently online</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {onlineUsers.map(u => (
                  <div key={u._id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                    <div className="status-dot online"></div>
                    <div className="nav-avatar" style={{ width: 36, height: 36 }}>
                      {u.username[0].toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{u.username}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Last seen: {format(new Date(u.lastSeen), 'HH:mm:ss')}
                      </div>
                    </div>
                    {roleLabel(u.role)}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Logs Tab */}
        {tab === 'Logs' && (
          <div className="card">
            <div className="flex-between mb-16">
              <div className="section-title" style={{ marginBottom: 0 }}>24-Hour Activity Log</div>
              <button className="btn btn-secondary btn-sm" onClick={loadLogs}>🔄 Refresh</button>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>User</th>
                    <th>Category</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log._id}>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                        {format(new Date(log.timestamp), 'HH:mm:ss')}
                      </td>
                      <td style={{ fontWeight: 600 }}>{log.username}</td>
                      <td><span className={`log-badge ${log.category}`}>{log.category}</span></td>
                      <td style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{log.action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Password Requests Tab */}
        {tab === 'Password Requests' && (
          <div className="card">
            <div className="flex-between mb-16">
              <div className="section-title" style={{ marginBottom: 0 }}>Forgot Password Requests</div>
              <button className="btn btn-secondary btn-sm" onClick={loadPwRequests}>🔄 Refresh</button>
            </div>
            {pwRequests.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 32 }}>No pending requests</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {pwRequests.map(req => (
                  <div key={req._id} className="card" style={{ border: '1px solid var(--warning)', background: 'rgba(251,191,36,0.04)' }}>
                    <div className="flex-between mb-8">
                      <div>
                        <div style={{ fontWeight: 700 }}>{req.username}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{req.email}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                          Requested: {format(new Date(req.forgotPasswordRequestedAt), 'MMM dd, yyyy HH:mm')}
                        </div>
                      </div>
                    </div>
                    {req.forgotPasswordMessage && (
                      <div style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: '0.85rem', marginBottom: 12 }}>
                        "{req.forgotPasswordMessage}"
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-primary btn-sm" onClick={() => setApproveModal(req)}>✅ Approve & Set Password</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleRejectPassword(req._id)} disabled={loading}>❌ Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Approve Modal */}
      {approveModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: 400, maxWidth: '95vw' }}>
            <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 16 }}>
              Set New Password for {approveModal.username}
            </div>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="At least 8 characters"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button className="btn btn-primary" onClick={handleApprovePassword} disabled={loading}>
                Confirm & Notify User
              </button>
              <button className="btn btn-secondary" onClick={() => { setApproveModal(null); setNewPassword(''); }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
