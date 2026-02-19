// src/pages/Manual.jsx
import { useState } from 'react';
import api from '../api/client';
import { useSocket } from '../context/SocketContext';
import toast from 'react-hot-toast';

const ACTUATORS = [
  {
    key: 'water_pump',
    stateKey: 'waterPump',
    label: 'Water Pump',
    icon: '💧',
    desc: 'Peristaltic pump — waters the plants',
    color: '#00d4ff'
  },
  {
    key: 'nutrient_pump',
    stateKey: 'nutrientPump',
    label: 'Nutrient Pump',
    icon: '⬡',
    desc: 'Peristaltic pump — delivers nutrients',
    color: '#b347ff'
  },
  {
    key: 'exhaust_fan',
    stateKey: 'exhaustFan',
    label: 'Exhaust Fan',
    icon: '🌀',
    desc: 'PC fan — controls air circulation',
    color: '#00d4ff'
  },
  {
    key: 'peltier',
    stateKey: 'peltier',
    label: 'Peltier Cooler',
    icon: '❄',
    desc: 'Thermoelectric cooler — soft-start enabled',
    color: '#7dffb3'
  },
];

function ActuatorCard({ act, isOn, isManual, onToggle, loading }) {
  return (
    <div className={`actuator-card ${isOn ? 'on' : ''}`}>
      <div className="actuator-top">
        <div
          className="actuator-icon-box"
          style={isOn ? { color: act.color, borderColor: act.color + '44' } : {}}
        >
          {act.icon}
        </div>
        <label className="toggle">
          <input
            type="checkbox"
            checked={isOn}
            onChange={e => onToggle(act.key, e.target.checked)}
            disabled={loading || !isManual}
          />
          <span className="toggle-track"></span>
        </label>
      </div>

      <div className="actuator-name">{act.label}</div>
      <div className="actuator-desc">{act.desc}</div>

      <div className="actuator-bottom">
        <span
          className={`badge ${isOn ? 'badge-online' : 'badge-neutral'}`}
          style={isOn ? { borderColor: act.color + '40', color: act.color } : {}}
        >
          {isOn ? '● ACTIVE' : '○ STANDBY'}
        </span>
        {!isManual && (
          <span className="badge badge-info" style={{ fontSize: '0.58rem' }}>AUTO</span>
        )}
      </div>
    </div>
  );
}

export default function Manual() {
  const { actuatorStatus } = useSocket();
  const [loading, setLoading] = useState(false);

  const mode = actuatorStatus?.mode || 'auto';

  const getState = (key) => {
    if (!actuatorStatus) return false;
    return actuatorStatus[key] || false;
  };

  const handleModeChange = async (newMode) => {
    setLoading(true);
    try {
      await api.post('/greenhouse/manual', { mode: newMode });
      toast.success(`Control mode → ${newMode.toUpperCase()}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change mode');
    } finally { setLoading(false); }
  };

  const handleToggle = async (actuator, state) => {
    if (mode !== 'manual') {
      toast.error('Switch to Manual mode first');
      return;
    }
    setLoading(true);
    try {
      await api.post('/greenhouse/manual', { actuator, state });
      toast.success(`${actuator.replace('_', ' ')} → ${state ? 'ON' : 'OFF'}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="page-wrap">
      <div className="page-header">
        <div className="page-eyebrow">Direct Control</div>
        <h1 className="page-title">Manual Control</h1>
        <p className="page-subtitle">
          Override automated control and operate actuators directly.
          Switch to Manual mode to enable individual controls.
        </p>
      </div>

      {/* Mode selector */}
      <div className="card mb-24 animate-in">
        <div className="card-label">Control Mode</div>
        <div className="flex-between" style={{ flexWrap: 'wrap', gap: 16 }}>
          <div className="mode-toggle">
            <button
              className={`mode-btn ${mode === 'auto' ? 'active' : ''}`}
              onClick={() => handleModeChange('auto')}
              disabled={loading || mode === 'auto'}
            >
              🤖 Automatic
            </button>
            <button
              className={`mode-btn ${mode === 'manual' ? 'active' : ''}`}
              onClick={() => handleModeChange('manual')}
              disabled={loading || mode === 'manual'}
            >
              🎛 Manual
            </button>
          </div>

          <div className="flex gap-10 items-center">
            <span className={`badge ${mode === 'manual' ? 'badge-warning' : 'badge-online'}`}>
              {mode === 'manual' ? '⚠ MANUAL ACTIVE' : '✓ AUTO ACTIVE'}
            </span>
          </div>
        </div>

        {mode === 'manual' && (
          <div className="alert-banner warning mt-12">
            <span>⚠</span>
            <div>
              Manual mode is active. Automated greenhouse control is suspended.
              Remember to return to Automatic mode when finished.
            </div>
          </div>
        )}
      </div>

      {/* Actuator grid */}
      <div className="section-label mb-12">Actuators</div>
      <div className="actuator-grid mb-24">
        {ACTUATORS.map(act => (
          <div className="animate-in" key={act.key}>
            <ActuatorCard
              act={act}
              isOn={getState(act.stateKey)}
              isManual={mode === 'manual'}
              onToggle={handleToggle}
              loading={loading}
            />
          </div>
        ))}
      </div>

      {/* Peltier detail panel */}
      {actuatorStatus?.peltier && (
        <div className="card animate-in">
          <div className="card-label">Peltier Module Detail</div>
          <div className="flex gap-24" style={{ flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '0.65rem', fontFamily: 'DM Mono', color: 'var(--text-muted)', marginBottom: 4, letterSpacing: '0.1em' }}>PWM POWER</div>
              <div style={{ fontFamily: 'Syne', fontSize: '1.8rem', fontWeight: 800, color: 'var(--bio-primary)' }}>
                {actuatorStatus.peltierPwm
                  ? Math.round((actuatorStatus.peltierPwm / 255) * 100)
                  : 0}
                <span style={{ fontSize: '0.9rem', fontFamily: 'DM Mono', color: 'var(--text-muted)', fontWeight: 400 }}>%</span>
              </div>
            </div>

            <div className="divider" style={{ width: 1, height: 'auto', margin: '0' }}></div>

            <div>
              <div style={{ fontSize: '0.65rem', fontFamily: 'DM Mono', color: 'var(--text-muted)', marginBottom: 8, letterSpacing: '0.1em' }}>HOT-SIDE FAN</div>
              <span className={`badge ${actuatorStatus.peltierHotFan ? 'badge-online' : 'badge-neutral'}`}>
                {actuatorStatus.peltierHotFan ? '● RUNNING' : '○ STOPPED'}
              </span>
            </div>

            <div>
              <div style={{ fontSize: '0.65rem', fontFamily: 'DM Mono', color: 'var(--text-muted)', marginBottom: 8, letterSpacing: '0.1em' }}>COLD-SIDE FAN</div>
              <span className={`badge ${actuatorStatus.peltierColdFan ? 'badge-online' : 'badge-neutral'}`}>
                {actuatorStatus.peltierColdFan ? '● RUNNING' : '○ STOPPED'}
              </span>
            </div>

            <div>
              <div style={{ fontSize: '0.65rem', fontFamily: 'DM Mono', color: 'var(--text-muted)', marginBottom: 8, letterSpacing: '0.1em' }}>SOFT-START</div>
              <span className="badge badge-info">ENABLED</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
