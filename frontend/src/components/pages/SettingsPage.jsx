import { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import api from "../../utils/api";
import "./SettingsPage.css";

const THEMES = [
  { id:"dark",   label:"Deep Green",  preview:"#080f0a,#4ade80" },
  { id:"light",  label:"Greenhouse",  preview:"#f0f7f1,#228b22" },
  { id:"ocean",  label:"Deep Ocean",  preview:"#050d14,#38bdf8" },
  { id:"forest", label:"Forest Rain", preview:"#080f0a,#a3e635" },
];

export default function SettingsPage() {
  const { user, updateUser } = useAuth();
  const { theme, setTheme }  = useTheme();

  const [pwForm,  setPwForm]  = useState({ currentPassword:"", newPassword:"", confirm:"" });
  const [usrForm, setUsrForm] = useState({ newUsername: "" });
  const [pwMsg,   setPwMsg]   = useState("");
  const [usrMsg,  setUsrMsg]  = useState("");
  const [loading, setLoading] = useState(false);

  const setPw = k => e => setPwForm(f => ({ ...f, [k]: e.target.value }));
  const setUsr = k => e => setUsrForm(f => ({ ...f, [k]: e.target.value }));

  const changePassword = async e => {
    e.preventDefault(); setPwMsg("");
    if (pwForm.newPassword !== pwForm.confirm) { setPwMsg("✗ Passwords don't match"); return; }
    setLoading(true);
    try {
      await api.put("/auth/change-password", { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      setPwMsg("✓ Password changed");
      setPwForm({ currentPassword:"", newPassword:"", confirm:"" });
    } catch (e) { setPwMsg("✗ " + (e.response?.data?.error || e.message)); }
    setLoading(false);
  };

  const changeUsername = async e => {
    e.preventDefault(); setUsrMsg("");
    setLoading(true);
    try {
      await api.put("/auth/change-username", { newUsername: usrForm.newUsername });
      setUsrMsg("✓ Username changed — re-login to see it everywhere");
      updateUser({ ...user, username: usrForm.newUsername });
    } catch (e) { setUsrMsg("✗ " + (e.response?.data?.error || e.message)); }
    setLoading(false);
  };

  return (
    <div className="settings-page page-enter">
      <div className="page-header">
        <h2 className="page-title">Settings</h2>
        <span className="text-muted mono" style={{fontSize:12}}>Personal preferences</span>
      </div>

      {/* Theme */}
      <div className="card settings-section">
        <div className="settings-title">Interface Theme</div>
        <div className="theme-note text-muted mono" style={{fontSize:11,marginBottom:14}}>
          ⓘ Your theme is personal — other users keep their own preferences
        </div>
        <div className="theme-grid">
          {THEMES.map(t => {
            const [bg, acc] = t.preview.split(",");
            return (
              <button key={t.id} className={`theme-card ${theme===t.id?"selected":""}`} onClick={() => setTheme(t.id)}>
                <div className="theme-preview" style={{ background: bg }}>
                  <div className="theme-accent" style={{ background: acc }} />
                </div>
                <span className="theme-label">{t.label}</span>
                {theme === t.id && <span className="badge badge-green" style={{fontSize:9,alignSelf:"center"}}>Active</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="settings-two-col">
        {/* Change Password */}
        <div className="card settings-section">
          <div className="settings-title">Change Password</div>
          <form onSubmit={changePassword} className="settings-form">
            {pwMsg && <div className={`settings-msg ${pwMsg.startsWith("✓")?"ok":"err"}`}>{pwMsg}</div>}
            <div className="field">
              <label>Current Password</label>
              <input type="password" className="input" value={pwForm.currentPassword} onChange={setPw("currentPassword")} required />
            </div>
            <div className="field">
              <label>New Password</label>
              <input type="password" className="input" value={pwForm.newPassword} onChange={setPw("newPassword")} required minLength={6} />
            </div>
            <div className="field">
              <label>Confirm New Password</label>
              <input type="password" className="input" value={pwForm.confirm} onChange={setPw("confirm")} required />
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading}>Update Password</button>
          </form>
        </div>

        {/* Change Username */}
        <div className="card settings-section">
          <div className="settings-title">Change Username</div>
          <div className="text-muted" style={{fontSize:12,marginBottom:16}}>
            Current: <strong style={{color:"var(--accent-primary)"}}>{user?.username}</strong>
          </div>
          <form onSubmit={changeUsername} className="settings-form">
            {usrMsg && <div className={`settings-msg ${usrMsg.startsWith("✓")?"ok":"err"}`}>{usrMsg}</div>}
            <div className="field">
              <label>New Username</label>
              <input className="input" value={usrForm.newUsername} onChange={setUsr("newUsername")} required minLength={3} maxLength={30} />
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading}>Update Username</button>
          </form>

          {/* Account Info */}
          <hr className="divider" style={{marginTop:24}} />
          <div className="settings-title" style={{marginBottom:10}}>Account Info</div>
          <div className="info-grid">
            <div className="info-item"><span className="text-muted">Role</span><span className={`badge badge-${user?.role==="head_admin"?"rose":user?.role==="admin"?"teal":"green"}`}>{user?.role}</span></div>
            <div className="info-item"><span className="text-muted">Email</span><span className="mono" style={{fontSize:12}}>{user?.email}</span></div>
            <div className="info-item"><span className="text-muted">Member since</span><span className="mono" style={{fontSize:12}}>{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
