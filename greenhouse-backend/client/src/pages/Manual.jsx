// client/src/pages/Manual.jsx
import { useState } from 'react';
import api from '../api/client';
import { useSocket } from '../context/SocketContext';
import toast from 'react-hot-toast';

const ACTUATORS = [
  { key: 'water_pump', label: 'Water Pump', icon: '💧', description: 'Peristaltic pump for watering' },
  { key: 'nutrient_pump', label: 'Nutrient Pump', icon: '🧪', description: 'Peristaltic pump for nutrients' },
  { key: 'exhaust_fan', label: 'Exhaust Fan', icon: '🌀', description: 'PC fan for air circulation' },
  { key: 'peltier', label: 'Peltier Cooler', icon: '❄️', description: 'Peltier module with soft-start (fans auto-controlled)' }
];

function ActuatorCard({ actuator, state, onChange, loading, mode }) {
  const isOn = state;
  const isManual = mode === 'manual';

  return (
    <div className={`actuator-card ${isOn ? 'active' : ''}`}>
      <div className="actuator-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="actuator-icon">{actuator.icon}</span>
          <div>
            <div className="actuator-name">{actuator.label}</div>
            <div className="actuator-status">{actuator.description}</div>
          </div>
        </div>
        <label className="toggle">
          <input
            type="checkbox"
            checked={isOn}
            onChange={(e) => onChange(actuator.key, e.target.checked)}
            disabled={loading || !isManual}
          />
          <span className="toggle-slider"></span>
        </label>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <span className={`badge ${isOn ? 'badge-online' : 'badge-offline'}`}>
          {isOn ? '● ON' : '○ OFF'}
        </span>
        {!isManual && (
          <span className="badge badge-info">Auto Mode</span>
        )}
      </div>
    </div>
  );
}

export default function Manual() {
  const { actuatorStatus } = useSocket();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('auto');

  const states = {
    water_pump: actuatorStatus?.waterPump || false,
    nutrient_pump: actuatorStatus?.nutrientPump || false,
    exhaust_fan: actuatorStatus?.exhaustFan || false,
    peltier: actuatorStatus?.peltier || false
  };

  const actualMode = actuatorStatus?.mode || mode;

  const handleModeChange = async (newMode) => {
    setLoading(true);
    try {
      await api.post('/greenhouse/manual', { mode: newMode });
      setMode(newMode);
      toast.success(`Mode set to ${newMode}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change mode');
    } finally {
      setLoading(false);
    }
  };

  const handleActuatorChange = async (actuator, state) => {
    if (actualMode !== 'manual') {
      toast.error('Switch to Manual mode first');
      return;
    }
    setLoading(true);
    try {
      await api.post('/greenhouse/manual', { actuator, state });
      toast.success(`${actuator.replace('_', ' ')} turned ${state ? 'ON' : 'OFF'}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to control actuator');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>🎛️ Manual Control</h1>
        <p>Override automatic control and manually operate actuators</p>
      </div>
      <div className="page-body">
        {/* Mode Toggle */}
        <div className="card mb-24">
          <div className="card-title">Control Mode</div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button
              className={`btn ${actualMode === 'auto' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => handleModeChange('auto')}
              disabled={loading || actualMode === 'auto'}
            >
              🤖 Automatic
            </button>
            <button
              className={`btn ${actualMode === 'manual' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => handleModeChange('manual')}
              disabled={loading || actualMode === 'manual'}
            >
              🎛️ Manual
            </button>
            <div style={{ marginLeft: 8 }}>
              <span className={`badge ${actualMode === 'manual' ? 'badge-warning' : 'badge-online'}`}>
                {actualMode === 'manual' ? '⚠️ Manual Mode Active' : '✅ Auto Mode Active'}
              </span>
            </div>
          </div>
          {actualMode === 'manual' && (
            <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 8, fontSize: '0.85rem', color: 'var(--warning)' }}>
              ⚠️ Manual mode is active. Automatic greenhouse control is disabled. Remember to switch back to Auto mode.
            </div>
          )}
        </div>

        {/* Actuators */}
        <div className="section-title">Actuator Controls</div>
        <div className="actuator-grid mb-24">
          {ACTUATORS.map(act => (
            <ActuatorCard
              key={act.key}
              actuator={act}
              state={states[act.key]}
              onChange={handleActuatorChange}
              loading={loading}
              mode={actualMode}
            />
          ))}
        </div>

        {/* Peltier status detail */}
        {actuatorStatus?.peltier && (
          <div className="card">
            <div className="card-title">❄️ Peltier Module Status</div>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>PWM Power</div>
                <div style={{ fontWeight: 700 }}>{Math.round((actuatorStatus.peltierPwm / 255) * 100)}%</div>
              </div>
              <div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Hot Side Fan</div>
                <span className={`badge ${actuatorStatus.peltierHotFan ? 'badge-online' : 'badge-offline'}`}>
                  {actuatorStatus.peltierHotFan ? 'ON' : 'OFF'}
                </span>
              </div>
              <div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Cold Side Fan</div>
                <span className={`badge ${actuatorStatus.peltierColdFan ? 'badge-online' : 'badge-offline'}`}>
                  {actuatorStatus.peltierColdFan ? 'ON' : 'OFF'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
