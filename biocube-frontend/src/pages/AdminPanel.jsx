// src/pages/AdminPanel.jsx
import { useState, useEffect, useCallback } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const TABS = ['Users', 'Online', 'Activity Log', 'Password Requests'];

function RoleBadge({ role }) {
  if (role === 'head_admin') return <span className="badge badge-head">👑 HEAD ADMIN</span>;
  if (role === 'admin') return <span className="badge badge-admin">🛡 ADMIN</span>;
  return <span className="badge badge-neutral">OPERATOR</span>;
}

function StatusBadge({ user: u }) {
  if (u.isBanned) return <span className="badge badge-offline">BANNED</span>;
  if (u.isRestricted) return <span className="badge badge-restricted">RESTRICTED</span>;
  if (u.isOnline) return <span className="badge badge-online">ONLINE</span>;
  return <span className="badge badge-neutral">OFFLINE</span>;
}

export default function AdminPanel() {
  const { user: me } = useAuth();
  const [tab, setTab] = useState('Users');
  const [users, setUsers] = useState([]);
  const [online, setOnline] = useState([]);
  const [logs, setLogs] = useState([]);
  const [pwReqs, setPwReqs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [approveTarget, setApproveTarget] = useState(null);
  const [newPw, setNewPw] = useState('');

  const loadUsers = useCallback(async () => {
    try { const r = await api.get('/admin/users'); setUsers(r.data.users); } catch {}
  }, []);

  const loadOnline = useCallback(async () => {
    try { const r = await api.get('/admin/online'); setOnline(r.data.users); } catch {}
  }, []);

  const loadLogs = useCallback(async () => {
    try { const r = await api.get('/admin/logs?hours=24&limit=300'); setLogs(r.data.logs); } catch {}
  }, []);

  const loadPwReqs = useCallback(async () => {
    try { const r = await api.get('/admin/forgot-password-requests'); setPwReqs(r.data.requests); } catch {}
  }, []);

  useEffect(() => {
    loadUsers();
    loadLogs();
    loadPwReqs();
    loadOnline();
    const iv = setInterval(loadOnline, 15000);
    return () => clearInterval(iv);
  }, []);

  const action = async (fn, successMsg) => {
    setLoading(true);
    try { await fn(); toast.success(successMsg); loadUsers(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setLoading(false); }
  };

  const ban = (id, val) => action(
    () => api.put(`/admin/users/${id}/ban`, { ban: val }),
    val ? 'User banned' : 'User unbanned'
  );

  const restrict = (id, val) => action(
    () => api.put(`/admin/users/${id}/restrict`, { restrict: val }),
    val ? 'User restricted' : 'Restriction lifted'
  );

  const del = (id, name) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    action(() => api.delete(`/admin/users/${id}`), 'User deleted');
  };

  const promote = (id, role) => action(
    () => api.put(`/admin/users/${id}/promote`, { role }),
    role === 'admin' ? 'User promoted to admin' : 'Admin demoted to operator'
  );

  const approvePassword = async () => {
    if (!newPw || newPw.length < 8) { toast.error('Min 8 characters'); return; }
    setLoading(true);
    try {
      await api.put(`/admin/forgot-password-requests/${approveTarget._id}/approve`, { newPassword: newPw });
      toast.success('Password reset — user notified');
      setApproveTarget(null);
      setNewPw('');
      loadPwReqs();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setLoading(false); }
  };

  const rejectPassword = (id) => {
    setLoading(true);
    api.put(`/admin/forgot-password-requests/${id}/reject`)
      .then(() => { toast.success('Request rejected'); loadPwReqs(); })
      .catch(() => toast.error('Failed'))
      .finally(() => setLoading(false));
  };

  return (
    <div className="page-wrap">
      <div className="page-header">
        <div className="page-eyebrow">Administration</div>
        <h1 className="page-title">Admin Panel</h1>
        <p className="page-subtitle">Manage users, monitor activity, and handle access control.</p>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {TABS.map(t => (
          <button
            key={t}
            className={`tab-btn ${tab === t ? 'active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t}
            {t === 'Password Requests' && pwReqs.length > 0 && (
              <span className="tab-count">{pwReqs.length}</span>
            )}
            {t === 'Online' && (
              <span className="tab-count" style={{ background: 'var(--bio-primary)', color: '#000' }}>
                {online.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Users ── */}
      {tab === 'Users' && (
        <div className="card animate-in">
          <div className="flex-between mb-16">
            <div className="card-label mb-0" style={{ display: 'block' }}>All Users ({users.length})</div>
            <button className="btn btn-secondary btn-sm" onClick={loadUsers}>↻ Refresh</button>
          </div>
          <div className="table-scroll">
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
                    <td style={{ fontWeight: 700 }}>{u.username}</td>
                    <td className="text-secondary text-sm">{u.email}</td>
                    <td><RoleBadge role={u.role} /></td>
                    <td><StatusBadge user={u} /></td>
                    <td className="text-muted text-xs font-mono">
                      {format(new Date(u.createdAt), 'MMM dd, yyyy')}
                    </td>
                    <td>
                      {u._id !== me._id && u.role !== 'head_admin' && (
                        <div className="flex gap-6" style={{ flexWrap: 'wrap' }}>
                          {me.role === 'head_admin' && (
                            <button
                              className="btn btn-secondary btn-sm"
                              disabled={loading}
                              onClick={() => promote(u._id, u.role === 'admin' ? 'user' : 'admin')}
                            >
                              {u.role === 'admin' ? '↓ Demote' : '↑ Promote'}
                            </button>
                          )}
                          <button
                            className="btn btn-secondary btn-sm"
                            disabled={loading}
                            onClick={() => restrict(u._id, !u.isRestricted)}
                          >
                            {u.isRestricted ? '🔓' : '🔒'}
                          </button>
                          <button
                            className="btn btn-secondary btn-sm"
                            disabled={loading}
                            onClick={() => ban(u._id, !u.isBanned)}
                          >
                            {u.isBanned ? '✓ Unban' : '✗ Ban'}
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            disabled={loading}
                            onClick={() => del(u._id, u.username)}
                          >
                            🗑
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

      {/* ── Online ── */}
      {tab === 'Online' && (
        <div className="card animate-in">
          <div className="flex-between mb-16">
            <div className="card-label mb-0" style={{ display: 'block' }}>
              Currently Online ({online.length})
            </div>
            <button className="btn btn-secondary btn-sm" onClick={loadOnline}>↻ Refresh</button>
          </div>
          {online.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>◌</div>
              <div style={{ fontFamily: 'DM Mono', fontSize: '0.72rem', letterSpacing: '0.12em' }}>NO USERS ONLINE</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {online.map(u => (
                <div key={u._id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '12px 0',
                  borderBottom: '1px solid var(--border-dim)'
                }}>
                  <div className="sys-status-dot"></div>
                  <div className="user-avatar" style={{ width: 36, height: 36, fontSize: '0.85rem' }}>
                    {u.username[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700 }}>{u.username}</div>
                    <div style={{ fontSize: '0.68rem', fontFamily: 'DM Mono', color: 'var(--text-muted)' }}>
                      LAST SEEN: {formatDistanceToNow(new Date(u.lastSeen), { addSuffix: true })}
                    </div>
                  </div>
                  <RoleBadge role={u.role} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Activity Log ── */}
      {tab === 'Activity Log' && (
        <div className="card animate-in">
          <div className="flex-between mb-16">
            <div className="card-label mb-0" style={{ display: 'block' }}>
              24-Hour Activity Log ({logs.length} events)
            </div>
            <button className="btn btn-secondary btn-sm" onClick={loadLogs}>↻ Refresh</button>
          </div>
          <div className="table-scroll" style={{ maxHeight: 520, overflowY: 'auto' }}>
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
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span className="font-mono text-xs text-muted">
                        {format(new Date(log.timestamp), 'HH:mm:ss')}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{log.username}</td>
                    <td>
                      <span className={`cat-badge cat-${log.category}`}>{log.category}</span>
                    </td>
                    <td className="text-sm text-secondary">{log.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Password Requests ── */}
      {tab === 'Password Requests' && (
        <div className="animate-in">
          <div className="flex-between mb-16">
            <span></span>
            <button className="btn btn-secondary btn-sm" onClick={loadPwReqs}>↻ Refresh</button>
          </div>
          {pwReqs.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '48px 0' }}>
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>✓</div>
              <div style={{ fontFamily: 'DM Mono', fontSize: '0.72rem', color: 'var(--text-muted)', letterSpacing: '0.12em' }}>
                NO PENDING REQUESTS
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {pwReqs.map(req => (
                <div key={req._id} className="card" style={{ border: '1px solid rgba(255,179,71,0.25)', background: 'rgba(255,179,71,0.03)' }}>
                  <div className="flex-between mb-12">
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1rem' }}>{req.username}</div>
                      <div className="text-sm text-muted">{req.email}</div>
                    </div>
                    <span className="badge badge-warning">PENDING</span>
                  </div>

                  <div className="font-mono text-xs text-muted mb-12">
                    REQUESTED: {format(new Date(req.forgotPasswordRequestedAt), 'MMM dd, yyyy HH:mm')}
                  </div>

                  {req.forgotPasswordMessage && (
                    <div style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 8,
                      padding: '10px 14px',
                      fontSize: '0.83rem',
                      color: 'var(--text-secondary)',
                      marginBottom: 14,
                      fontStyle: 'italic'
                    }}>
                      "{req.forgotPasswordMessage}"
                    </div>
                  )}

                  <div className="flex gap-10">
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => setApproveTarget(req)}
                    >
                      ✓ Approve & Set Password
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => rejectPassword(req._id)}
                      disabled={loading}
                    >
                      ✗ Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Approve modal */}
      {approveTarget && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal-title">Set New Password for {approveTarget.username}</div>
            <div className="alert-banner info mb-16">
              <span>ℹ</span>
              The user will be notified that their password has been reset.
            </div>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="Minimum 8 characters"
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex gap-10 mt-16">
              <button
                className="btn btn-primary"
                onClick={approvePassword}
                disabled={loading || newPw.length < 8}
              >
                {loading ? 'Saving...' : 'Confirm & Notify User'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => { setApproveTarget(null); setNewPw(''); }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
