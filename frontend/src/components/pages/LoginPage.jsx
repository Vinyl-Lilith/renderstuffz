import { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import "./LoginPage.css";

export default function LoginPage() {
  const { login, register } = useAuth();
  const nav = useNavigate();
  const [mode,   setMode]   = useState("login"); // login | register | forgot
  const [form,   setForm]   = useState({ username:"", email:"", password:"", message:"", lastKnown:"" });
  const [error,  setError]  = useState("");
  const [ok,     setOk]     = useState("");
  const [loading,setLoading]= useState(false);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async e => {
    e.preventDefault();
    setError(""); setOk("");
    setLoading(true);
    try {
      if (mode === "login") {
        await login(form.username, form.password);
        nav("/");
      } else if (mode === "register") {
        await register(form.username, form.email, form.password);
        nav("/");
      } else {
        const r = await fetch("/api/auth/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: form.username, message: form.message, lastKnownPassword: form.lastKnown }),
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setOk("Request sent to admin. You will be notified when your password is reset.");
      }
    } catch (e) { setError(e.response?.data?.error || e.message); }
    setLoading(false);
  };

  return (
    <div className="login-bg">
      <div className="login-orbs">
        <div className="orb orb1" /><div className="orb orb2" /><div className="orb orb3" />
      </div>
      <div className="login-card card card-glow animate-in">
        <div className="login-brand">
          <span className="login-icon">⬡</span>
          <h1 className="login-title">BioCube</h1>
          <p className="login-sub text-muted">Smart Greenhouse Intelligence</p>
        </div>

        <div className="login-tabs">
          {["login","register"].map(m => (
            <button key={m} className={`tab-btn ${mode===m ? "active":""}`} onClick={() => { setMode(m); setError(""); setOk(""); }}>
              {m === "login" ? "Sign In" : "Register"}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="login-form">
          {error && <div className="login-alert login-alert-err">{error}</div>}
          {ok    && <div className="login-alert login-alert-ok">{ok}</div>}

          {mode === "forgot" ? (
            <>
              <div className="field"><label>Username or Email</label><input className="input" value={form.username} onChange={set("username")} required /></div>
              <div className="field"><label>Last password you remember (optional)</label><input className="input" type="password" value={form.lastKnown} onChange={set("lastKnown")} /></div>
              <div className="field"><label>Message to admin (optional)</label><textarea className="input" rows={3} value={form.message} onChange={set("message")} /></div>
            </>
          ) : (
            <>
              <div className="field"><label>Username{mode==="login"?" or Email":""}</label><input className="input" value={form.username} onChange={set("username")} required autoComplete="username" /></div>
              {mode === "register" && <div className="field"><label>Email</label><input className="input" type="email" value={form.email} onChange={set("email")} required /></div>}
              <div className="field"><label>Password</label><input className="input" type="password" value={form.password} onChange={set("password")} required autoComplete={mode==="login"?"current-password":"new-password"} /></div>
            </>
          )}

          <button className="btn btn-primary" type="submit" disabled={loading} style={{ width:"100%", justifyContent:"center", marginTop:4 }}>
            {loading ? "…" : mode === "login" ? "Sign In" : mode === "register" ? "Create Account" : "Send Request"}
          </button>

          {mode !== "forgot" && (
            <button type="button" className="forgot-link" onClick={() => { setMode("forgot"); setError(""); setOk(""); }}>
              Forgot password?
            </button>
          )}
          {mode === "forgot" && (
            <button type="button" className="forgot-link" onClick={() => setMode("login")}>← Back to sign in</button>
          )}
        </form>
      </div>
    </div>
  );
}
