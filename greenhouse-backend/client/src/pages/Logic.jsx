// client/src/pages/Logic.jsx
import { useState, useEffect } from 'react';
import api from '../api/client';
import { useSocket } from '../context/SocketContext';
import toast from 'react-hot-toast';

const THRESHOLD_FIELDS = [
  { key: 'soilMoisture', label: 'Soil Moisture Threshold', icon: '🌱', unit: '%', min: 0, max: 100, description: 'Water pump activates when below this value' },
  { key: 'tempMin', label: 'Temperature Minimum', icon: '🌡️', unit: '°C', min: -10, max: 50, description: 'Heater/Peltier cold mode activates below this' },
  { key: 'tempMax', label: 'Temperature Maximum', icon: '🌡️', unit: '°C', min: -10, max: 60, description: 'Peltier cooling activates above this' },
  { key: 'humidityMin', label: 'Humidity Minimum', icon: '💧', unit: '%', min: 0, max: 100, description: 'Low humidity alert threshold' },
  { key: 'humidityMax', label: 'Humidity Maximum', icon: '💧', unit: '%', min: 0, max: 100, description: 'Exhaust fan activates above this' },
  { key: 'nThreshold', label: 'Nitrogen (N) Threshold', icon: '🧪', unit: 'mg/kg', min: 0, max: 1000, description: 'Nutrient pump activates when N is below this' },
  { key: 'pThreshold', label: 'Phosphorus (P) Threshold', icon: '🧪', unit: 'mg/kg', min: 0, max: 1000, description: 'Nutrient pump activates when P is below this' },
  { key: 'kThreshold', label: 'Potassium (K) Threshold', icon: '🧪', unit: 'mg/kg', min: 0, max: 1000, description: 'Nutrient pump activates when K is below this' }
];

export default function Logic() {
  const { thresholds: liveThresholds, setThresholds: setLiveThresholds } = useSocket();
  const [thresholds, setThresholds] = useState(null);
  const [formValues, setFormValues] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadThresholds();
  }, []);

  useEffect(() => {
    if (liveThresholds && !thresholds) {
      setThresholds(liveThresholds);
      const vals = {};
      THRESHOLD_FIELDS.forEach(f => { vals[f.key] = liveThresholds[f.key]; });
      setFormValues(vals);
    }
  }, [liveThresholds]);

  const loadThresholds = async () => {
    setLoading(true);
    try {
      const res = await api.get('/greenhouse/thresholds');
      const t = res.data.thresholds;
      setThresholds(t);
      const vals = {};
      THRESHOLD_FIELDS.forEach(f => { vals[f.key] = t[f.key]; });
      setFormValues(vals);
    } catch (err) {
      toast.error('Failed to load thresholds');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.put('/greenhouse/thresholds', formValues);
      setThresholds(res.data.thresholds);
      setLiveThresholds(res.data.thresholds);
      toast.success('✅ Thresholds saved and sent to Arduino!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save thresholds');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!thresholds) return;
    const vals = {};
    THRESHOLD_FIELDS.forEach(f => { vals[f.key] = thresholds[f.key]; });
    setFormValues(vals);
    toast('Changes discarded', { icon: '↩️' });
  };

  if (loading) {
    return (
      <div className="page-body" style={{ paddingTop: 40 }}>
        <div className="flex-center" style={{ height: 200 }}><div className="spinner"></div></div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>⚙️ Logic & Thresholds</h1>
        <p>Set the conditions that control greenhouse automation. Changes are sent directly to the Arduino.</p>
      </div>
      <div className="page-body">
        {/* Current Arduino thresholds notice */}
        {thresholds && (
          <div className="card mb-24" style={{ background: 'rgba(74,222,128,0.04)', borderColor: 'rgba(74,222,128,0.2)' }}>
            <div className="flex-between">
              <div>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>📡 Arduino Current Thresholds</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Last updated: {thresholds.updatedAt ? new Date(thresholds.updatedAt).toLocaleString() : 'Unknown'}
                  {thresholds.updatedBy && ` by ${thresholds.updatedBy}`}
                </div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={loadThresholds}>🔄 Refresh</button>
            </div>
          </div>
        )}

        <div className="threshold-grid mb-24">
          {THRESHOLD_FIELDS.map(field => (
            <div key={field.key} className="threshold-item">
              <label>{field.icon} {field.label}</label>
              <div className="threshold-current">
                Current Arduino value: <span>{thresholds?.[field.key] ?? '--'} {field.unit}</span>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type="number"
                  className="form-input"
                  value={formValues[field.key] ?? ''}
                  min={field.min}
                  max={field.max}
                  step="0.1"
                  onChange={e => setFormValues(prev => ({ ...prev, [field.key]: parseFloat(e.target.value) }))}
                />
                <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  {field.unit}
                </span>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 6 }}>
                {field.description}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-primary btn-lg" onClick={handleSave} disabled={saving}>
            {saving ? '⏳ Saving...' : '💾 Save & Apply Thresholds'}
          </button>
          <button className="btn btn-secondary btn-lg" onClick={handleReset}>
            ↩️ Discard Changes
          </button>
        </div>
      </div>
    </div>
  );
}
