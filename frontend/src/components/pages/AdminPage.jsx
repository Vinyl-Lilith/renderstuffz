import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import api from "../../utils/api";
import "./AdminPage.css";

function TabBtn({ active, onClick, children }) {
  return <button className={`tab-btn ${active?"active":""}`} onClick={onClick}>{children}</button>;
}

export default function AdminPage() {
  const { user: me, isHeadAdmin } = useAuth();
  const [tab,     setTab]     = useState("users");
  const [users,   setUsers]   = useState([]);
  const [logs,    setLogs]    = useState([]);
  const [reqs,    setReqs]    = useState([]);
  const [online,  setOnline]  = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg,     setMsg]     = useState("");

  const flash = m => { setMsg(m); setTimeout(() => setMsg(""), 3000); };

  const load = async () => {
    setLoading(true);
    try {
      const [u, l, r, o] = await Promise.all([
        api.get("/admin/users"),
        api.get("/admin/logs?limit=200"),
        api.get("/admin/forgot-requests"),
        api.get("/admin/online-users"),
      ]);
      setUsers(u.data.users);
      setLogs(l.data.logs);
      setReqs(r.data.requests);
      setOnline(o.data.users);
    } catch (e) { flash("Error loading: " + e.message); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const action = async (url, method = "put", body = {}) => {
    try {
      if (method === "put")    await api.put(url, body);
      if (method === "post")   await api.post(url, body);
      if (method === "delete") await api.delete(url);
      flash("✓ Done");
      load();
    } catch (e) { flash("✗ " + (e.response?.data?.error || e.message)); }
  };

  const [resetPasswords, setResetPasswords] = useState({});

  const roleColor = { head_admin:"green", admin:"teal", user:"muted" };

  return (
    <div className="admin-page page-enter">
      <div className="page-header">
        <h2 className="page-title">Admin Panel</h2>
        <span className="badge badge-rose">Admin Only</span>
      </div>

      {/* Online users banner */}
      <div className="card online-banner">
        <span className="section-label">Currently Online ({online.length})</span>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:8}}>
          {online.length === 0 && <span className="text-muted" style={{fontSize:12}}>No users online</span>}
          {online.map(u => (
            <span key={u._id} className="badge badge-green">
              <span className="dot dot-green" style={{width:5,height:5}} />
              {u.username} [{u.role}]
            </span>
          ))}
        </div>
      </div>

      {msg && <div className={`admin-flash ${msg.startsWith("✓")?"ok":"err"}`}>{msg}</div>}

      {/* Tabs */}
      <div className="admin-tabs">
        <TabBtn active={tab==="users"} onClick={() => setTab("users")}>Users ({users.length})</TabBtn>
        <TabBtn active={tab==="logs"}  onClick={() => setTab("logs")}>Activity Log ({logs.length})</TabBtn>
        <TabBtn active={tab==="reqs"}  onClick={() => setTab("reqs")}>Password Requests {reqs.length>0 && <span className="pill-number" style={{marginLeft:6}}>{reqs.length}</span>}</TabBtn>
      </div>

      {loading && <div className="text-muted mono" style={{fontSize:12}}>Loading…</div>}

      {/* Users Tab */}
      {tab === "users" && (
        <div className="card admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Username</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u._id} className={u.isBanned ? "row-banned" : ""}>
                  <td><span className="mono">{u.username}</span></td>
                  <td className="text-muted" style={{fontSize:12}}>{u.email}</td>
                  <td>
                    <span className={`badge badge-${roleColor[u.role]}`}>{u.role}</span>
                  </td>
                  <td>
                    {u.isBanned      && <span className="badge badge-rose">Banned</span>}
                    {u.isRestricted  && <span className="badge badge-amber">Restricted</span>}
                    {u.isOnline      && <span className="badge badge-green">Online</span>}
                    {!u.isBanned && !u.isRestricted && !u.isOnline && <span className="badge badge-muted">Active</span>}
                  </td>
                  <td>
                    {u._id !== me._id && u.role !== "head_admin" && (
                      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                        <button className="btn btn-sm" onClick={() => action(`/admin/ban/${u._id}`)}>
                          {u.isBanned ? "Unban":"Ban"}
                        </button>
                        <button className="btn btn-sm" onClick={() => action(`/admin/restrict/${u._id}`)}>
                          {u.isRestricted ? "Unrestrict":"Restrict"}
                        </button>
                        {isHeadAdmin && (
                          <button className="btn btn-sm" onClick={() => action(`/admin/promote/${u._id}`, "put", { role: u.role==="admin"?"user":"admin" })}>
                            {u.role === "admin" ? "→ User":"→ Admin"}
                          </button>
                        )}
                        <button className="btn btn-sm btn-danger" onClick={() => { if (confirm(`Delete ${u.username}?`)) action(`/admin/users/${u._id}`, "delete"); }}>
                          Delete
                        </button>
                      </div>
                    )}
                    {u._id === me._id && <span className="text-muted" style={{fontSize:11}}>That's you</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Logs Tab */}
      {tab === "logs" && (
        <div className="card admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Time</th><th>User</th><th>Action</th><th>Detail</th><th>Category</th></tr></thead>
            <tbody>
              {logs.map((l,i) => (
                <tr key={i}>
                  <td className="mono" style={{fontSize:11,whiteSpace:"nowrap"}}>{new Date(l.ts).toLocaleString()}</td>
                  <td className="mono" style={{fontSize:12}}>{l.username || "—"}</td>
                  <td style={{fontSize:13}}>{l.action}</td>
                  <td className="text-muted" style={{fontSize:11}}>{l.detail || "—"}</td>
                  <td><span className={`badge badge-${l.category==="auth"?"teal":l.category==="actuator"?"amber":l.category==="threshold"?"green":l.category==="admin"?"rose":"muted"}`}>{l.category}</span></td>
                </tr>
              ))}
              {logs.length===0 && <tr><td colSpan={5} className="text-muted" style={{textAlign:"center",padding:24}}>No logs yet</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Password Requests Tab */}
      {tab === "reqs" && (
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {reqs.length === 0 && <div className="card text-muted" style={{padding:24,textAlign:"center"}}>No pending requests</div>}
          {reqs.map(r => (
            <div key={r._id} className="card pw-request">
              <div className="pw-req-header">
                <span className="mono" style={{fontWeight:700}}>{r.username}</span>
                <span className="text-muted mono" style={{fontSize:11}}>{new Date(r.forgotPasswordRequest?.requestedAt).toLocaleString()}</span>
              </div>
              {r.forgotPasswordRequest?.message && (
                <div className="text-muted" style={{fontSize:13,fontStyle:"italic"}}>"{r.forgotPasswordRequest.message}"</div>
              )}
              <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",marginTop:4}}>
                <input
                  className="input"
                  type="password"
                  placeholder="New password (min 6 chars)"
                  value={resetPasswords[r._id] || ""}
                  onChange={e => setResetPasswords(p => ({ ...p, [r._id]: e.target.value }))}
                  style={{maxWidth:240}}
                />
                <button className="btn btn-primary btn-sm" onClick={() => {
                  if (!resetPasswords[r._id] || resetPasswords[r._id].length < 6) { flash("Password min 6 chars"); return; }
                  action("/admin/approve-password-reset", "post", { userId: r._id, newPassword: resetPasswords[r._id] });
                }}>Approve & Set Password</button>
                <button className="btn btn-sm btn-danger" onClick={() => action("/admin/deny-password-reset", "post", { userId: r._id })}>Deny</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
