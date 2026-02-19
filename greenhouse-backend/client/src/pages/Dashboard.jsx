// client/src/pages/Dashboard.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { format } from 'date-fns';
import api from '../api/client';
import { useSocket } from '../context/SocketContext';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

const WEBCAM_URL = import.meta.env.VITE_WEBCAM_URL || '/webcam';

function MetricCard({ icon, label, value, unit, className }) {
  return (
    <div className={`metric-card ${className}`}>
      <div className="metric-icon">{icon}</div>
      <div className="metric-label">{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <div className="metric-value">{value !== null && value !== undefined && value !== -999 ? (typeof value === 'number' ? value.toFixed(1) : value) : '--'}</div>
        <div className="metric-unit">{unit}</div>
      </div>
    </div>
  );
}

const CHART_COLORS = {
  temperature: '#f97316',
  humidity: '#60a5fa',
  soil1: '#4ade80',
  soil2: '#34d399',
  nitrogen: '#a78bfa',
  phosphorus: '#f472b6',
  potassium: '#fb923c'
};

const CHART_OPTS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { labels: { color: '#8892a4', font: { size: 11 } } },
    tooltip: { backgroundColor: '#1e2235', titleColor: '#e8ecf0', bodyColor: '#8892a4' }
  },
  scales: {
    x: { ticks: { color: '#555e72', maxTicksLimit: 8, font: { size: 10 } }, grid: { color: '#2e3250' } },
    y: { ticks: { color: '#555e72', font: { size: 10 } }, grid: { color: '#2e3250' } }
  }
};

export default function Dashboard() {
  const { latestData } = useSocket();
  const [history, setHistory] = useState([]);
  const [downloading, setDownloading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [fullscreen, setFullscreen] = useState(false);
  const [webcamError, setWebcamError] = useState(false);
  const imgRef = useRef(null);
  const [imgSrc, setImgSrc] = useState('');

  const loadHistory = useCallback(async () => {
    try {
      const res = await api.get('/greenhouse/history?limit=288'); // ~24h at 5min intervals
      setHistory(res.data.data || []);
    } catch {}
  }, []);

  useEffect(() => { loadHistory(); }, []);

  // Refresh history every 5 minutes
  useEffect(() => {
    const interval = setInterval(loadHistory, 300000);
    return () => clearInterval(interval);
  }, [loadHistory]);

  // Webcam MJPEG stream
  useEffect(() => {
    const token = localStorage.getItem('gh_token');
    setImgSrc(`${WEBCAM_URL}/video_feed?t=${Date.now()}`);
  }, []);

  const labels = history.map(d => format(new Date(d.timestamp), 'HH:mm'));

  const tempHumChart = {
    labels,
    datasets: [
      { label: 'Temperature (°C)', data: history.map(d => d.temperature), borderColor: CHART_COLORS.temperature, backgroundColor: 'rgba(249,115,22,0.08)', fill: true, tension: 0.4, pointRadius: 0 },
      { label: 'Humidity (%)', data: history.map(d => d.humidity), borderColor: CHART_COLORS.humidity, backgroundColor: 'rgba(96,165,250,0.08)', fill: true, tension: 0.4, pointRadius: 0 }
    ]
  };

  const soilChart = {
    labels,
    datasets: [
      { label: 'Soil 1 (%)', data: history.map(d => d.soilMoisture1), borderColor: CHART_COLORS.soil1, backgroundColor: 'rgba(74,222,128,0.08)', fill: true, tension: 0.4, pointRadius: 0 },
      { label: 'Soil 2 (%)', data: history.map(d => d.soilMoisture2), borderColor: CHART_COLORS.soil2, backgroundColor: 'rgba(52,211,153,0.08)', fill: true, tension: 0.4, pointRadius: 0 }
    ]
  };

  const npkChart = {
    labels,
    datasets: [
      { label: 'N (mg/kg)', data: history.map(d => d.nitrogen), borderColor: CHART_COLORS.nitrogen, tension: 0.4, pointRadius: 0 },
      { label: 'P (mg/kg)', data: history.map(d => d.phosphorus), borderColor: CHART_COLORS.phosphorus, tension: 0.4, pointRadius: 0 },
      { label: 'K (mg/kg)', data: history.map(d => d.potassium), borderColor: CHART_COLORS.potassium, tension: 0.4, pointRadius: 0 }
    ]
  };

  const downloadData = async () => {
    setDownloading(true);
    try {
      const res = await api.get(`/greenhouse/download?date=${selectedDate}`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `greenhouse_${selectedDate}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {}
    setDownloading(false);
  };

  const d = latestData;

  return (
    <div>
      <div className="page-header">
        <h1>🌿 Dashboard</h1>
        <p>Live sensor data and greenhouse status</p>
      </div>
      <div className="page-body">
        {/* Sensor Metrics */}
        <div className="metric-grid mb-24">
          <MetricCard icon="🌡️" label="Temperature" value={d?.temperature} unit="°C" className="temp" />
          <MetricCard icon="💧" label="Humidity" value={d?.humidity} unit="%" className="humidity" />
          <MetricCard icon="🌱" label="Soil 1" value={d?.soilMoisture1} unit="%" className="soil" />
          <MetricCard icon="🌱" label="Soil 2" value={d?.soilMoisture2} unit="%" className="soil" />
          <MetricCard icon="🧪" label="Nitrogen" value={d?.nitrogen} unit="mg/kg" className="npk" />
          <MetricCard icon="🧪" label="Phosphorus" value={d?.phosphorus} unit="mg/kg" className="npk" />
          <MetricCard icon="🧪" label="Potassium" value={d?.potassium} unit="mg/kg" className="npk" />
          {d?.timestamp && (
            <div className="metric-card" style={{ justifyContent: 'center', alignItems: 'flex-start' }}>
              <div className="metric-icon">🕒</div>
              <div className="metric-label">Last Update</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, marginTop: 4, color: 'var(--text-primary)' }}>
                {format(new Date(d.timestamp), 'HH:mm:ss')}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {format(new Date(d.timestamp), 'MMM dd, yyyy')}
              </div>
            </div>
          )}
        </div>

        {/* Webcam + Charts row */}
        <div className="grid-2 mb-24" style={{ gridTemplateColumns: '1fr 1.5fr' }}>
          <div className="card">
            <div className="card-title">📹 Live Feed</div>
            <div
              className="webcam-container"
              onDoubleClick={() => setFullscreen(true)}
              title="Double-click to enlarge"
            >
              {!webcamError ? (
                <img
                  ref={imgRef}
                  src={imgSrc}
                  alt="Greenhouse webcam"
                  onError={() => setWebcamError(true)}
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              ) : (
                <div className="flex-center" style={{ height: '100%', color: 'var(--text-muted)', flexDirection: 'column', gap: 8 }}>
                  <span style={{ fontSize: '2rem' }}>📷</span>
                  <span>Camera unavailable</span>
                </div>
              )}
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 8, textAlign: 'center' }}>
              Double-click to fullscreen
            </p>
          </div>

          <div className="card">
            <div className="card-title">🌡️ Temperature & Humidity (24h)</div>
            <div className="chart-container">
              <Line data={tempHumChart} options={CHART_OPTS} />
            </div>
          </div>
        </div>

        <div className="grid-2 mb-24">
          <div className="card">
            <div className="card-title">🌱 Soil Moisture (24h)</div>
            <div className="chart-container">
              <Line data={soilChart} options={CHART_OPTS} />
            </div>
          </div>

          <div className="card">
            <div className="card-title">🧪 NPK Levels (24h)</div>
            <div className="chart-container">
              <Line data={npkChart} options={CHART_OPTS} />
            </div>
          </div>
        </div>

        {/* Download Section */}
        <div className="card">
          <div className="card-title">📥 Download Data</div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Select Date</label>
              <input
                type="date"
                className="form-input"
                value={selectedDate}
                max={format(new Date(), 'yyyy-MM-dd')}
                onChange={e => setSelectedDate(e.target.value)}
                style={{ width: 180 }}
              />
            </div>
            <button className="btn btn-primary" onClick={downloadData} disabled={downloading}>
              {downloading ? '⏳ Downloading...' : '📊 Download Excel'}
            </button>
          </div>
        </div>
      </div>

      {/* Fullscreen webcam */}
      {fullscreen && (
        <div className="webcam-fullscreen" onClick={() => setFullscreen(false)}>
          <button className="webcam-close" onClick={() => setFullscreen(false)}>✕</button>
          <img src={imgSrc} alt="Fullscreen webcam" />
        </div>
      )}
    </div>
  );
}
