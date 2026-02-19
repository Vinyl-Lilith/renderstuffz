import { useEffect, useState, useRef } from "react";
import { useSocket } from "../../contexts/SocketContext";
import api from "../../utils/api";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from "recharts";
import { format } from "date-fns";
import "./HomePage.css";

const METRIC_CARDS = [
  { key:"temp_avg",   label:"Temperature",   unit:"°C",   color:"var(--rose)",          icon:"🌡" },
  { key:"hum_avg",    label:"Humidity",       unit:"%",    color:"var(--sky)",            icon:"💧" },
  { key:"soil1",      label:"Soil 1",         unit:"%",    color:"var(--accent-primary)", icon:"🌱" },
  { key:"soil2",      label:"Soil 2",         unit:"%",    color:"var(--accent-dim)",     icon:"🌱" },
  { key:"N",          label:"Nitrogen",       unit:"mg/kg",color:"var(--teal)",           icon:"⚗" },
  { key:"P",          label:"Phosphorus",     unit:"mg/kg",color:"var(--amber)",          icon:"⚗" },
  { key:"K",          label:"Potassium",      unit:"mg/kg",color:"var(--rose)",           icon:"⚗" },
  { key:"peltier_pwm",label:"Peltier PWM",    unit:"/255", color:"var(--text-secondary)", icon:"❄" },
];

const ACTUATOR_KEYS = [
  { key:"water_pump",  label:"Water Pump",  manual:"manual_water_pump"  },
  { key:"nut_pump",    label:"Nutrient Pump",manual:"manual_nut_pump"   },
  { key:"exhaust_fan", label:"Exhaust Fan",  manual:"manual_exhaust_fan" },
  { key:"peltier",     label:"Peltier",      manual:"manual_peltier"     },
  { key:"pfan_hot",    label:"Fan Hot",      manual:"manual_pfan_hot"    },
  { key:"pfan_cold",   label:"Fan Cold",     manual:"manual_pfan_cold"   },
];

function MetricCard({ label, value, unit, color, icon }) {
  return (
    <div className="metric-card card animate-in">
      <div className="metric-icon" style={{ color }}>{icon}</div>
      <div className="metric-body">
        <div className="metric-label text-muted">{label}</div>
        <div className="metric-value mono" style={{ color }}>
          {value != null ? value.toFixed(1) : "--"}
          <span className="metric-unit">{unit}</span>
        </div>
      </div>
    </div>
  );
}

function ActuatorPill({ label, on, manual }) {
  return (
    <div className={`actuator-pill ${on ? "on" : "off"}`}>
      <span className="act-dot" />
      <span>{label}</span>
      {manual ? <span className="badge badge-amber" style={{fontSize:9}}>MAN</span> : null}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip card">
      <div className="mono" style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.color, fontSize: 12, fontFamily: "var(--font-mono)" }}>
          {p.name}: <strong>{p.value?.toFixed(2)}</strong>
        </div>
      ))}
    </div>
  );
};

export default function HomePage() {
  const { sensorData, cameraFrame, cameraOnline } = useSocket();
  const [history,  setHistory]  = useState([]);
  const [cameraLarge, setCameraLarge] = useState(false);
  const [exportDate, setExportDate]   = useState(format(new Date(), "yyyy-MM-dd"));
  const [exporting, setExporting]     = useState(false);
  const imgRef = useRef(null);

  // Load 24h history
  useEffect(() => {
    api.get("/data/history?hours=24").then(r => {
      setHistory(r.data.data.map(d => ({
        ...d,
        time: format(new Date(d.ts), "HH:mm"),
      })));
    }).catch(() => {});
  }, []);

  // Append live data to history
  useEffect(() => {
    if (!sensorData) return;
    setHistory(prev => {
      const next = [...prev, { ...sensorData, time: format(new Date(), "HH:mm") }];
      return next.slice(-288); // keep 24h at 5s intervals
    });
  }, [sensorData]);

  const d = sensorData || {};

  const exportExcel = async () => {
    setExporting(true);
    try {
      const r = await fetch(`/api/data/export?date=${exportDate}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("bc_token")}` },
      });
      const blob = await r.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = `biocube_${exportDate}.xlsx`; a.click();
      URL.revokeObjectURL(url);
    } catch {}
    setExporting(false);
  };

  return (
    <div className="home-page page-enter">
      <div className="page-header">
        <h2 className="page-title">Greenhouse Overview</h2>
        <span className="text-muted mono" style={{fontSize:12}}>Live sensor telemetry</span>
      </div>

      {/* Metric Cards */}
      <div className="metrics-grid">
        {METRIC_CARDS.map(m => (
          <MetricCard key={m.key} {...m} value={d[m.key]} />
        ))}
      </div>

      {/* Actuator Status Row */}
      <div className="card actuator-row">
        <div className="section-label">Actuator Status</div>
        <div className="actuator-pills">
          {ACTUATOR_KEYS.map(a => (
            <ActuatorPill key={a.key} label={a.label} on={!!d[a.key]} manual={!!d[a.manual]} />
          ))}
        </div>
      </div>

      {/* Camera + Charts Row */}
      <div className="cam-charts-row">
        {/* Camera */}
        <div className={`camera-card card ${cameraLarge ? "camera-large" : ""}`}>
          <div className="section-label">Live Feed {cameraOnline ? <span className="badge badge-green">LIVE</span> : <span className="badge badge-muted">OFFLINE</span>}</div>
          <div className="camera-frame" onDoubleClick={() => setCameraLarge(l => !l)}>
            {cameraFrame && cameraOnline
              ? <img ref={imgRef} src={cameraFrame} alt="Camera feed" className="camera-img" />
              : <div className="camera-placeholder"><span>📷</span><span className="text-muted">No signal — double-click to expand</span></div>
            }
            <div className="camera-hint mono">double-click to {cameraLarge ? "shrink" : "expand"}</div>
          </div>
        </div>

        {/* Temp / Humidity chart */}
        <div className="chart-card card">
          <div className="section-label">Temperature & Humidity (24h)</div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={history} margin={{ top:8, right:8, left:-20, bottom:0 }}>
              <defs>
                <linearGradient id="tempG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="var(--rose)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="var(--rose)" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="humG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="var(--sky)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="var(--sky)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="time" tick={{ fontSize:10, fill:"var(--text-muted)", fontFamily:"var(--font-mono)" }} interval={30} />
              <YAxis tick={{ fontSize:10, fill:"var(--text-muted)", fontFamily:"var(--font-mono)" }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize:12, fontFamily:"var(--font-mono)" }} />
              <Area type="monotone" dataKey="temp_avg" name="Temp °C" stroke="var(--rose)" fill="url(#tempG)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="hum_avg"  name="Humidity %" stroke="var(--sky)" fill="url(#humG)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Soil + NPK charts */}
      <div className="charts-row">
        <div className="chart-card card">
          <div className="section-label">Soil Moisture (24h)</div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={history} margin={{ top:8, right:8, left:-20, bottom:0 }}>
              <defs>
                <linearGradient id="s1G" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="var(--accent-primary)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="s2G" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="var(--teal)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="var(--teal)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="time" tick={{ fontSize:10, fill:"var(--text-muted)", fontFamily:"var(--font-mono)" }} interval={30} />
              <YAxis domain={[0,100]} tick={{ fontSize:10, fill:"var(--text-muted)", fontFamily:"var(--font-mono)" }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize:12, fontFamily:"var(--font-mono)" }} />
              <Area type="monotone" dataKey="soil1" name="Soil 1 %" stroke="var(--accent-primary)" fill="url(#s1G)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="soil2" name="Soil 2 %" stroke="var(--teal)"           fill="url(#s2G)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card card">
          <div className="section-label">NPK Levels (24h)</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={history} margin={{ top:8, right:8, left:-20, bottom:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="time" tick={{ fontSize:10, fill:"var(--text-muted)", fontFamily:"var(--font-mono)" }} interval={30} />
              <YAxis tick={{ fontSize:10, fill:"var(--text-muted)", fontFamily:"var(--font-mono)" }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize:12, fontFamily:"var(--font-mono)" }} />
              <Line type="monotone" dataKey="N" name="N mg/kg" stroke="var(--teal)"  strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="P" name="P mg/kg" stroke="var(--amber)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="K" name="K mg/kg" stroke="var(--rose)"  strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Export */}
      <div className="card export-card">
        <div className="section-label">Export Data</div>
        <div className="export-row">
          <input type="date" className="input" value={exportDate} onChange={e => setExportDate(e.target.value)} style={{ maxWidth:200 }} />
          <button className="btn btn-primary" onClick={exportExcel} disabled={exporting}>
            {exporting ? "Exporting…" : "⬇ Download Excel"}
          </button>
        </div>
      </div>
    </div>
  );
}
