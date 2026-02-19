// src/pages/Dashboard.jsx
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { format, formatDistanceToNow } from 'date-fns';
import api from '../api/client';
import { useSocket } from '../context/SocketContext';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const WEBCAM_BASE = import.meta.env.VITE_WEBCAM_URL || '';

// ── Metric Card ──
function MetricCard({ icon, label, value, unit, cls, alert, warning }) {
  const isNum = value !== null && value !== undefined && value !== -999;
  const display = isNum ? (typeof value === 'number' ? value.toFixed(1) : value) : '--';
  const valueClass = alert ? 'alert' : warning ? 'warning' : '';

  return (
    <div className={`metric-card animate-in ${cls}`}>
      <div className="metric-header">
        <div className="metric-icon-wrap">{icon}</div>
        <div className="metric-status-dot"></div>
      </div>
      <div className="metric-label-text">{label}</div>
      <div className="metric-value-row">
        <div className={`metric-value ${valueClass}`}>{display}</div>
        <div className="metric-unit">{unit}</div>
      </div>
    </div>
  );
}

// ── Chart config factory ──
function makeChartData(labels, datasets) {
  return {
    labels,
    datasets: datasets.map(ds => ({
      ...ds,
      fill: ds.fill !== undefined ? ds.fill : true,
      tension: 0.45,
      pointRadius: 0,
      pointHoverRadius: 4,
      borderWidth: 1.5,
    }))
  };
}

function chartOpts(yLabel = '') {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        labels: {
          color: 'rgba(125, 175, 145, 0.7)',
          font: { family: 'DM Mono', size: 10 },
          boxWidth: 12,
          padding: 12
        }
      },
      tooltip: {
        backgroundColor: 'rgba(12, 20, 32, 0.95)',
        titleColor: '#e8f5f0',
        bodyColor: '#7aaa8e',
        borderColor: 'rgba(0,255,150,0.2)',
        borderWidth: 1,
        padding: 10,
        titleFont: { family: 'Syne', size: 12, weight: '700' },
        bodyFont: { family: 'DM Mono', size: 11 }
      }
    },
    scales: {
      x: {
        ticks: {
          color: 'rgba(61, 102, 85, 0.8)',
          maxTicksLimit: 8,
          font: { family: 'DM Mono', size: 9 }
        },
        grid: { color: 'rgba(0, 255, 150, 0.04)', drawBorder: false }
      },
      y: {
        ticks: {
          color: 'rgba(61, 102, 85, 0.8)',
          font: { family: 'DM Mono', size: 9 }
        },
        grid: { color: 'rgba(0, 255, 150, 0.04)', drawBorder: false }
      }
    }
  };
}

export default function Dashboard() {
  const { latestData } = useSocket();
  const [history, setHistory] = useState([]);
  const [downloading, setDownloading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [fullscreen, setFullscreen] = useState(false);
  const [webcamErr, setWebcamErr] = useState(false);
  const [imgKey, setImgKey] = useState(0);

  const loadHistory = useCallback(async () => {
    try {
      const res = await api.get('/greenhouse/history?limit=500');
      setHistory(res.data.data || []);
    } catch {}
  }, []);

  useEffect(() => { loadHistory(); }, []);
  useEffect(() => {
    const t = setInterval(loadHistory, 300000);
    return () => clearInterval(t);
  }, [loadHistory]);

  // Refresh webcam stream every 30s to prevent stale connection
  useEffect(() => {
    const t = setInterval(() => setImgKey(k => k + 1), 30000);
    return () => clearInterval(t);
  }, []);

  const d = latestData;
  const labels = history.map(r => format(new Date(r.timestamp), 'HH:mm'));

  // ── Chart datasets ──
  const tempHumData = makeChartData(labels, [
    {
      label: 'Temp (°C)',
      data: history.map(r => r.temperature),
      borderColor: '#ff6b35',
      backgroundColor: 'rgba(255,107,53,0.06)',
    },
    {
      label: 'Humidity (%)',
      data: history.map(r => r.humidity),
      borderColor: '#00d4ff',
      backgroundColor: 'rgba(0,212,255,0.06)',
    }
  ]);

  const soilData = makeChartData(labels, [
    {
      label: 'Soil 1 (%)',
      data: history.map(r => r.soilMoisture1),
      borderColor: '#00ff96',
      backgroundColor: 'rgba(0,255,150,0.06)',
    },
    {
      label: 'Soil 2 (%)',
      data: history.map(r => r.soilMoisture2),
      borderColor: '#7dffb3',
      backgroundColor: 'rgba(125,255,179,0.04)',
    }
  ]);

  const npkData = makeChartData(labels, [
    {
      label: 'Nitrogen',
      data: history.map(r => r.nitrogen),
      borderColor: '#b347ff',
      backgroundColor: 'rgba(179,71,255,0.05)',
      fill: false
    },
    {
      label: 'Phosphorus',
      data: history.map(r => r.phosphorus),
      borderColor: '#ff47b3',
      backgroundColor: 'transparent',
      fill: false
    },
    {
      label: 'Potassium',
      data: history.map(r => r.potassium),
      borderColor: '#ffb347',
      backgroundColor: 'transparent',
      fill: false
    }
  ]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await api.get(`/greenhouse/download?date=${selectedDate}`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `biocube_${selectedDate}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed', err);
    }
    setDownloading(false);
  };

  const webcamSrc = `${WEBCAM_BASE}/video_feed?k=${imgKey}`;

  return (
    <div className="page-wrap">
      <div className="page-header">
        <div className="page-eyebrow">System Monitor</div>
        <h1 className="page-title">Live Dashboard</h1>
        <p className="page-subtitle">
          Real-time greenhouse telemetry
          {d?.timestamp && (
            <span className="font-mono" style={{ marginLeft: 12, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              LAST UPDATE: {formatDistanceToNow(new Date(d.timestamp), { addSuffix: true })}
            </span>
          )}
        </p>
      </div>

      {/* ── Sensor Grid ── */}
      <div className="metrics-grid mb-24">
        <MetricCard icon="🌡" label="Temperature" value={d?.temperature} unit="°C" cls="temp" />
        <MetricCard icon="💧" label="Humidity" value={d?.humidity} unit="%" cls="humid" />
        <MetricCard icon="🌱" label="Soil Moisture 1" value={d?.soilMoisture1} unit="%" cls="soil" />
        <MetricCard icon="🌿" label="Soil Moisture 2" value={d?.soilMoisture2} unit="%" cls="soil" />
        <MetricCard icon="⬡" label="Nitrogen" value={d?.nitrogen} unit="mg/kg" cls="npk" />
        <MetricCard icon="⬡" label="Phosphorus" value={d?.phosphorus} unit="mg/kg" cls="npk" />
        <MetricCard icon="⬡" label="Potassium" value={d?.potassium} unit="mg/kg" cls="npk" />
      </div>

      {/* ── Webcam + Temp/Hum Chart ── */}
      <div className="grid-2 mb-16" style={{ gridTemplateColumns: '1fr 1.6fr' }}>
        <div className="card animate-in">
          <div className="card-label">Live Feed</div>
          <div
            className="webcam-container"
            onDoubleClick={() => !webcamErr && setFullscreen(true)}
            title="Double-click to fullscreen"
          >
            {!webcamErr ? (
              <>
                <img
                  src={webcamSrc}
                  alt="Greenhouse Live Feed"
                  onError={() => setWebcamErr(true)}
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
                <div className="webcam-overlay">
                  <div className="webcam-rec"></div>
                  <span className="webcam-rec-text">LIVE</span>
                </div>
              </>
            ) : (
              <div className="webcam-offline">
                <span style={{ fontSize: '2rem' }}>📷</span>
                <span style={{ fontFamily: 'DM Mono', fontSize: '0.7rem', letterSpacing: '0.12em' }}>
                  FEED UNAVAILABLE
                </span>
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ marginTop: 8 }}
                  onClick={() => { setWebcamErr(false); setImgKey(k => k + 1); }}
                >
                  Retry
                </button>
              </div>
            )}
          </div>
          <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'DM Mono', marginTop: 8, textAlign: 'center', letterSpacing: '0.08em' }}>
            DOUBLE-CLICK TO EXPAND
          </p>
        </div>

        <div className="card animate-in">
          <div className="card-label">Temperature &amp; Humidity · 24h</div>
          <div className="chart-wrap">
            <Line data={tempHumData} options={chartOpts()} />
          </div>
        </div>
      </div>

      {/* ── Soil + NPK Charts ── */}
      <div className="grid-2 mb-24">
        <div className="card animate-in">
          <div className="card-label">Soil Moisture · 24h</div>
          <div className="chart-wrap">
            <Line data={soilData} options={chartOpts('%')} />
          </div>
        </div>

        <div className="card animate-in">
          <div className="card-label">NPK Levels · 24h</div>
          <div className="chart-wrap">
            <Line data={npkData} options={chartOpts('mg/kg')} />
          </div>
        </div>
      </div>

      {/* ── Download ── */}
      <div className="card animate-in">
        <div className="card-label">Data Export</div>
        <div className="flex-between" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Export Telemetry Data</div>
            <div className="text-sm text-muted">Select a date and download all readings as Excel (.xlsx)</div>
          </div>
          <div className="flex gap-10 items-center" style={{ flexWrap: 'wrap' }}>
            <div>
              <label className="form-label">Date</label>
              <input
                type="date"
                className="form-input"
                value={selectedDate}
                max={format(new Date(), 'yyyy-MM-dd')}
                onChange={e => setSelectedDate(e.target.value)}
                style={{ width: 170 }}
              />
            </div>
            <div style={{ marginTop: 22 }}>
              <button
                className="btn btn-primary"
                onClick={handleDownload}
                disabled={downloading}
              >
                {downloading ? '⏳ Exporting...' : '↓ Export Excel'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Fullscreen webcam ── */}
      {fullscreen && (
        <div className="webcam-fullscreen-overlay" onClick={() => setFullscreen(false)}>
          <button className="webcam-close-btn" onClick={() => setFullscreen(false)}>✕</button>
          <img
            src={webcamSrc}
            alt="Fullscreen Feed"
            className="webcam-fullscreen-img"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
