import { useEffect, useState } from "react";
import { useSocket } from "../../contexts/SocketContext";
import api from "../../utils/api";
import "./LogicPage.css";

const FIELDS = [
  { key:"soil1",   label:"Soil 1 Min",      unit:"%",    min:0,   max:100, step:1,  group:"Soil Moisture" },
  { key:"soil2",   label:"Soil 2 Min",       unit:"%",    min:0,   max:100, step:1,  group:"Soil Moisture" },
  { key:"tempMin", label:"Temp Min",          unit:"°C",   min:-10, max:60,  step:0.5,group:"Temperature" },
  { key:"tempMax", label:"Temp Max",          unit:"°C",   min:-10, max:60,  step:0.5,group:"Temperature" },
  { key:"humMin",  label:"Humidity Min",      unit:"%",    min:0,   max:100, step:1,  group:"Humidity" },
  { key:"humMax",  label:"Humidity Max",      unit:"%",    min:0,   max:100, step:1,  group:"Humidity" },
  { key:"N",       label:"Nitrogen Min",      unit:"mg/kg",min:0,   max:500, step:1,  group:"NPK" },
  { key:"P",       label:"Phosphorus Min",    unit:"mg/kg",min:0,   max:500, step:1,  group:"NPK" },
  { key:"K",       label:"Potassium Min",     unit:"mg/kg",min:0,   max:500, step:1,  group:"NPK" },
];

const GROUPS = ["Soil Moisture","Temperature","Humidity","NPK"];

export default function LogicPage() {
  const { thresholds: liveThresh } = useSocket();
  const [current,  setCurrent]  = useState(null);  // confirmed Arduino thresholds
  const [form,     setForm]     = useState({});
  const [saving,   setSaving]   = useState(false);
  const [msg,      setMsg]      = useState("");

  const loadThresholds = async () => {
    const r = await api.get("/data/thresholds");
    const t = r.data.thresholds;
    if (!t) return;
    setCurrent(t);
    setForm({
      soil1: t.soil1_min, soil2: t.soil2_min,
      tempMin: t.temp_min, tempMax: t.temp_max,
      humMin: t.hum_min, humMax: t.hum_max,
      N: t.N_min, P: t.P_min, K: t.K_min,
    });
  };

  useEffect(() => { loadThresholds(); }, []);

  // When Arduino confirms new thresholds via socket
  useEffect(() => {
    if (!liveThresh) return;
    setCurrent({
      soil1_min: liveThresh.soil1_min,
      soil2_min: liveThresh.soil2_min,
      temp_min:  liveThresh.temp_min,
      temp_max:  liveThresh.temp_max,
      hum_min:   liveThresh.hum_min,
      hum_max:   liveThresh.hum_max,
      N_min:     liveThresh.N_min,
      P_min:     liveThresh.P_min,
      K_min:     liveThresh.K_min,
    });
  }, [liveThresh]);

  const save = async () => {
    setSaving(true); setMsg("");
    try {
      await api.post("/commands/threshold", form);
      setMsg("✓ Thresholds sent to Arduino");
    } catch (e) { setMsg("✗ " + (e.response?.data?.error || e.message)); }
    setSaving(false);
    setTimeout(() => setMsg(""), 4000);
  };

  const currentMap = {
    soil1: current?.soil1_min, soil2: current?.soil2_min,
    tempMin: current?.temp_min, tempMax: current?.temp_max,
    humMin: current?.hum_min, humMax: current?.hum_max,
    N: current?.N_min, P: current?.P_min, K: current?.K_min,
  };

  return (
    <div className="logic-page page-enter">
      <div className="page-header">
        <h2 className="page-title">Logic Control</h2>
        <span className="text-muted mono" style={{fontSize:12}}>Edit automation thresholds</span>
      </div>

      <div className="logic-info card">
        <div className="mono" style={{fontSize:12,color:"var(--text-muted)"}}>
          ⓘ &nbsp;The Arduino auto-activates actuators when readings cross these thresholds. Values shown below are <strong style={{color:"var(--accent-primary)"}}>currently active on the Arduino</strong>.
        </div>
      </div>

      {GROUPS.map(group => (
        <div key={group} className="thresh-group card">
          <div className="thresh-group-title">{group}</div>
          <div className="thresh-fields">
            {FIELDS.filter(f => f.group === group).map(f => {
              const cur   = currentMap[f.key];
              const draft = form[f.key];
              const dirty = cur != null && +draft !== +cur;
              return (
                <div key={f.key} className="thresh-field">
                  <div className="thresh-meta">
                    <span className="thresh-label">{f.label}</span>
                    <span className="thresh-current mono">
                      {cur != null ? <>Current: <strong style={{color:"var(--accent-primary)"}}>{cur}{f.unit}</strong></> : "—"}
                    </span>
                  </div>
                  <div className="thresh-input-row">
                    <input
                      type="number"
                      className={`input thresh-input ${dirty ? "dirty":""}`}
                      min={f.min} max={f.max} step={f.step}
                      value={draft ?? ""}
                      onChange={e => setForm(p => ({ ...p, [f.key]: +e.target.value }))}
                    />
                    <span className="thresh-unit mono">{f.unit}</span>
                    <input type="range" className="thresh-slider"
                      min={f.min} max={f.max} step={f.step}
                      value={draft ?? f.min}
                      onChange={e => setForm(p => ({ ...p, [f.key]: +e.target.value }))}
                    />
                    {dirty && <span className="badge badge-amber">Modified</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div className="logic-footer">
        {msg && <span className={`logic-msg ${msg.startsWith("✓") ? "ok":"err"}`}>{msg}</span>}
        <button className="btn btn-primary" onClick={save} disabled={saving} style={{minWidth:160}}>
          {saving ? "Sending…" : "Apply to Arduino"}
        </button>
      </div>
    </div>
  );
}
