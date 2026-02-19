import { useState } from "react";
import { useSocket } from "../../contexts/SocketContext";
import api from "../../utils/api";
import "./ManualPage.css";

const ACTUATORS = [
  { key:"WATER_PUMP",  label:"Water Pump",     icon:"💧", manualKey:"manual_water_pump",  desc:"Activates plain water pump" },
  { key:"NUT_PUMP",    label:"Nutrient Pump",   icon:"🧪", manualKey:"manual_nut_pump",    desc:"Activates nutrient-rich water pump" },
  { key:"EXHAUST_FAN", label:"Exhaust Fan",     icon:"🌀", manualKey:"manual_exhaust_fan", desc:"PC fan for air circulation" },
  { key:"PELTIER",     label:"Peltier Cooler",  icon:"❄",  manualKey:"manual_peltier",     desc:"Soft-start Peltier TEC. Auto-manages its fans." },
  { key:"PFAN_HOT",    label:"Fan — Hot Side",  icon:"🔥", manualKey:"manual_pfan_hot",    desc:"Dissipates heat from Peltier hot side" },
  { key:"PFAN_COLD",   label:"Fan — Cold Side", icon:"🌬", manualKey:"manual_pfan_cold",   desc:"Blows cold air from Peltier cold side" },
];

const KEY_MAP = {
  WATER_PUMP:"water_pump", NUT_PUMP:"nut_pump", EXHAUST_FAN:"exhaust_fan",
  PELTIER:"peltier", PFAN_HOT:"pfan_hot", PFAN_COLD:"pfan_cold",
};

export default function ManualPage() {
  const { sensorData } = useSocket();
  const [loading, setLoading] = useState({});
  const [msg,     setMsg]     = useState("");

  const d = sensorData || {};

  const toggle = async (device, currentState) => {
    setLoading(l => ({ ...l, [device]: true }));
    setMsg("");
    try {
      await api.post("/commands/actuator", {
        device,
        state: currentState ? 0 : 1,
        manual: true,
      });
      setMsg(`✓ ${device} command sent`);
    } catch (e) { setMsg("✗ " + (e.response?.data?.error || e.message)); }
    setLoading(l => ({ ...l, [device]: false }));
    setTimeout(() => setMsg(""), 3000);
  };

  const releaseAll = async () => {
    setMsg("");
    try {
      await api.post("/commands/release-manual");
      setMsg("✓ All manual locks released — auto logic resumed");
    } catch (e) { setMsg("✗ " + (e.response?.data?.error || e.message)); }
    setTimeout(() => setMsg(""), 4000);
  };

  return (
    <div className="manual-page page-enter">
      <div className="page-header">
        <h2 className="page-title">Manual Control</h2>
        <span className="text-muted mono" style={{fontSize:12}}>Direct actuator override</span>
      </div>

      <div className="manual-warn card">
        <span style={{fontSize:18}}>⚠</span>
        <div>
          <div style={{fontWeight:700,fontSize:14}}>Manual Override Mode</div>
          <div className="text-muted" style={{fontSize:12,marginTop:2}}>
            When you toggle an actuator here it is <strong>locked</strong> — the auto logic cannot override it.
            Use <em>Release All</em> to hand control back to the Arduino.
          </div>
        </div>
      </div>

      <div className="actuator-grid">
        {ACTUATORS.map(act => {
          const stateKey  = KEY_MAP[act.key];
          const isOn      = !!d[stateKey];
          const isManual  = !!d[act.manualKey];
          const isLoading = !!loading[act.key];

          return (
            <div key={act.key} className={`actuator-card card ${isOn ? "act-on" : ""} ${isManual ? "act-manual":""}`}>
              <div className="act-top">
                <span className="act-icon">{act.icon}</span>
                <div className="act-badges">
                  {isManual && <span className="badge badge-amber">MANUAL</span>}
                  {!isManual && <span className="badge badge-muted">AUTO</span>}
                  <span className={`badge ${isOn ? "badge-green" : "badge-muted"}`}>{isOn ? "ON" : "OFF"}</span>
                </div>
              </div>

              <div className="act-label">{act.label}</div>
              <div className="act-desc text-muted">{act.desc}</div>

              {act.key === "PELTIER" && d.peltier_pwm != null && (
                <div className="peltier-pwm">
                  <div className="pwm-bar-wrap">
                    <div className="pwm-bar" style={{ width: `${(d.peltier_pwm / 255) * 100}%` }} />
                  </div>
                  <span className="mono" style={{fontSize:11}}>PWM: {d.peltier_pwm}/255</span>
                </div>
              )}

              <button
                className={`btn ${isOn ? "btn-danger" : "btn-primary"} act-btn`}
                onClick={() => toggle(act.key, isOn)}
                disabled={isLoading}
              >
                {isLoading ? "…" : isOn ? "Turn OFF + Lock" : "Turn ON + Lock"}
              </button>
            </div>
          );
        })}
      </div>

      <div className="manual-footer">
        {msg && <span className={`logic-msg ${msg.startsWith("✓") ? "ok":"err"}`} style={{fontFamily:"var(--font-mono)",fontSize:13}}>{msg}</span>}
        <button className="btn" style={{borderColor:"var(--border-strong)"}} onClick={releaseAll}>
          ↺ Release All — Return to Auto
        </button>
      </div>
    </div>
  );
}
