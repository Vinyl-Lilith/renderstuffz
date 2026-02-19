// src/pages/Logic.jsx
import { useState, useEffect } from 'react';
import api from '../api/client';
import { useSocket } from '../context/SocketContext';
import toast from 'react-hot-toast';

const FIELDS = [
  {
    key: 'soilMoisture', label: 'Soil Moisture', icon: '🌱',
    unit: '%', min: 0, max: 100, step: 1,
    desc: 'Water pump activates when average soil moisture drops below this',
    group: 'soil'
  },
  {
    key: 'tempMin', label: 'Temperature Min', icon: '🌡',
    unit: '°C', min: -10, max: 60, step: 0.5,
    desc: 'Low temperature alert threshold',
    group: 'climate'
  },
  {
    key: 'tempMax', label: 'Temperature Max', icon: '🌡',
    unit: '°C', min: -10, max: 80, step: 0.5,
    desc: 'Peltier cooling activates when temperature exceeds this',
    group: 'climate'
  },
  {
    key: 'humidityMin', label: 'Humidity Min', icon: '💧',
    unit: '%', min: 0, max: 100, step: 1,
    desc: 'Low humidity alert threshold',
    group: 'climate'
  },
  {
    key: 'humidityMax', label: 'Humidity Max', icon: '💧',
    unit: '%', min: 0, max: 100, step: 1,
    desc: 'Exhaust fan activates when humidity exceeds this',
    group: 'climate'
  },
  {
    key: 'nThreshold', label: 'Nitrogen (N)', icon: '⬡',
    unit: 'mg/kg', min: 0, max: 2000, step: 1,
    desc: 'Nutrient pump activates when N is below this level',
    group: 'npk'
  },
  {
    key: 'pThreshold', label: 'Phosphorus (P)', icon: '⬡',
    unit: 'mg/kg', min: 0, max: 2000, step: 1,
    desc: 'Nutrient pump activates when P is below this level',
    group: 'npk'
  },
  {
    key: 'kThreshold', label: 'Potassium (K)', icon: '⬡',
    unit: 'mg/kg', min: 0, max: 2000, step: 1,
    desc: 'Nutrient pump activates when K is below this level',
    group: 'npk'
  }
];

const GROUP_META = {
  soil: { label: 'Soil Control', color: 'var(--bio-primary)', bg: 'rgba(0,255,150,0.04)' },
  climate: { label: 'Climate Control', color: 'var(--accent-blue)', bg: 'rgba(0,212,255,0.04)' },
  npk: { label: 'NPK Control', color: 'var(--accent-violet)', bg: 'rgba(179,71,255,0.04)' }
};

function ThresholdCard({ field, currentVal, inputVal, onChange }) {
  const group = GROUP_META[field.group];
  return (
    <div className="threshold-card">
      <div className="flex-between mb-8">
        <div className="threshold-label">{field.icon} {field.label}</div>
      </div>

      {/* Arduino current value */}
      <div className="threshold-arduino-val">
        {currentVal !== undefined && currentVal !== null ? currentVal.toFixed(1) : '--'}
        <span className="threshold-arduino-unit">{field.unit}</span>
      </div>
      <div style={{ fontSize: '0.6rem', fontFamily: 'DM Mono', color: 'var(--text-dim)', marginBottom: 10, letterSpacing: '0.08em' }}>
        ↑ ARDUINO CURRENT VALUE
      </div>

      <div className="form-input-wrap">
        <input
          type="number"
          className="form-input"
          value={inputVal ?? ''}
          min={field.min}
          max={field.max}
          step={field.step}
          onChange={e => onChange(field.key, parseFloat(e.target.value) || 0)}
          style={{ paddingRight: 50 }}
        />
        <span className="form-unit">{field.unit}</span>
      </div>

      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.4 }}>
        {field.desc}
      </div>
    </div>
  );
}

export default function Logic() {
  const { thresholds: liveThresholds, setThresholds: setLiveThresholds } = useSocket();
  const [current, setCurrent] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/greenhouse/thresholds');
      const t = res.data.thresholds;
      setCurrent(t);
      const vals = {};
      FIELDS.forEach(f => { vals[f.key] = t[f.key]; });
      setForm(vals);
    } catch {
      toast.error('Failed to load thresholds');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Sync from socket updates
  useEffect(() => {
    if (liveThresholds && !current) {
      setCurrent(liveThresholds);
      const vals = {};
      FIELDS.forEach(f => { vals[f.key] = liveThresholds[f.key]; });
      setForm(vals);
    }
  }, [liveThresholds]);

  const handleChange = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.put('/greenhouse/thresholds', form);
      const updated = res.data.thresholds;
      setCurrent(updated);
      setLiveThresholds(updated);
      toast.success('✓ Thresholds saved and queued for Arduino');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!current) return;
    const vals = {};
    FIELDS.forEach(f => { vals[f.key] = current[f.key]; });
    setForm(vals);
    toast('Changes discarded', { icon: '↩' });
  };

  if (loading) {
    return (
      <div className="page-loading">
        <div className="flex-col flex-center gap-12">
          <div className="spinner"></div>
          <span style={{ fontFamily: 'DM Mono', fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.12em' }}>
            FETCHING ARDUINO STATE...
          </span>
        </div>
      </div>
    );
  }

  const groups = ['soil', 'climate', 'npk'];

  return (
    <div className="page-wrap">
      <div className="page-header">
        <div className="page-eyebrow">Automation Engine</div>
        <h1 className="page-title">Logic & Thresholds</h1>
        <p className="page-subtitle">
          Define the conditions that trigger automated control. Changes are sent directly to the Arduino.
        </p>
      </div>

      {/* Status bar */}
      {current && (
        <div className="alert-banner success mb-24 animate-in" style={{ justifyContent: 'space-between' }}>
          <div className="flex gap-10 items-center">
            <span>●</span>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 2 }}>Arduino Synced</div>
              <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                Last updated {current.updatedAt ? formatRelative(current.updatedAt) : 'Unknown'}
                {current.updatedBy && ` · by ${current.updatedBy}`}
              </div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={load} style={{ flexShrink: 0 }}>
            ↻ Refresh
          </button>
        </div>
      )}

      {/* Threshold sections by group */}
      {groups.map(group => {
        const meta = GROUP_META[group];
        const groupFields = FIELDS.filter(f => f.group === group);
        return (
          <div key={group} className="mb-32">
            <div className="section-label" style={{ color: meta.color }}>{meta.label}</div>
            <div className="threshold-grid">
              {groupFields.map(field => (
                <ThresholdCard
                  key={field.key}
                  field={field}
                  currentVal={current?.[field.key]}
                  inputVal={form[field.key]}
                  onChange={handleChange}
                />
              ))}
            </div>
          </div>
        );
      })}

      {/* Actions */}
      <div className="flex gap-12" style={{ flexWrap: 'wrap' }}>
        <button
          className="btn btn-primary btn-lg"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? '⏳ Saving...' : '↑ Apply to Arduino'}
        </button>
        <button className="btn btn-secondary btn-lg" onClick={handleReset}>
          ↩ Discard Changes
        </button>
      </div>
    </div>
  );
}

function formatRelative(dateStr) {
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
  } catch { return 'Unknown'; }
}

// need import
import { formatDistanceToNow } from 'date-fns';
