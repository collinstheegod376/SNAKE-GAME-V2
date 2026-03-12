'use client'
import { useState, useCallback } from 'react'
import { PowerupKey } from './SnakeGame'

interface PowerupData {
  key: PowerupKey
  name: string
  icon: string
}

interface Props {
  onDirection: (dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => void
  onRestart: () => void
  onPowerup: () => void
  grantedPowerups: PowerupData[]
  activePowerupKey: PowerupKey | null
  selectedPowerup: PowerupKey | null
  onSelectPowerup: (key: PowerupKey) => void
  isLoggedIn: boolean
}

function ArcadeBtn({ label, icon, color, onPress, className = '' }: {
  label: string; icon: string; color: string; onPress: () => void; className?: string
}) {
  const [pressed, setPressed] = useState(false)

  const handlePress = useCallback(() => {
    setPressed(true)
    onPress()
    setTimeout(() => setPressed(false), 150)
  }, [onPress])

  return (
    <button
      onMouseDown={handlePress}
      onTouchStart={(e) => { e.preventDefault(); handlePress() }}
      className={`arcade-btn ${color} ${pressed ? 'pressed' : ''} ${className}`}
      aria-label={label}
    >
      <span className="btn-icon">{icon}</span>
      <span className="btn-label">{label}</span>
      <style jsx>{`
        .arcade-btn {
          position: relative;
          width: 72px;
          height: 72px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
          transition: transform 0.08s, box-shadow 0.08s;
          user-select: none;
          -webkit-tap-highlight-color: transparent;
          outline: none;
        }
        .red {
          background: radial-gradient(circle at 35% 35%, #ff4444 0%, #cc0000 60%, #990000 100%);
          box-shadow:
            0 6px 0 #660000,
            0 8px 12px rgba(0,0,0,0.6),
            inset 0 1px 0 rgba(255,255,255,0.2),
            0 0 20px rgba(255,0,0,0.3);
        }
        .blue {
          background: radial-gradient(circle at 35% 35%, #4488ff 0%, #0044cc 60%, #003399 100%);
          box-shadow:
            0 6px 0 #002266,
            0 8px 12px rgba(0,0,0,0.6),
            inset 0 1px 0 rgba(255,255,255,0.2),
            0 0 20px rgba(0,100,255,0.3);
        }
        .yellow {
          background: radial-gradient(circle at 35% 35%, #ffee44 0%, #ccaa00 60%, #997700 100%);
          box-shadow:
            0 6px 0 #665500,
            0 8px 12px rgba(0,0,0,0.6),
            inset 0 1px 0 rgba(255,255,255,0.3),
            0 0 20px rgba(255,220,0,0.3);
        }
        .green {
          background: radial-gradient(circle at 35% 35%, #44ff88 0%, #00cc44 60%, #009933 100%);
          box-shadow:
            0 6px 0 #006622,
            0 8px 12px rgba(0,0,0,0.6),
            inset 0 1px 0 rgba(255,255,255,0.2),
            0 0 20px rgba(0,255,100,0.3);
        }
        .arcade-btn:not(.pressed):hover {
          transform: translateY(-2px);
          filter: brightness(1.1);
        }
        .arcade-btn.pressed {
          transform: translateY(4px);
          box-shadow:
            0 2px 0 #660000,
            0 3px 6px rgba(0,0,0,0.4),
            inset 0 2px 4px rgba(0,0,0,0.3);
          filter: brightness(0.9);
        }
        .red.pressed { box-shadow: 0 2px 0 #660000, 0 3px 6px rgba(0,0,0,0.4), inset 0 2px 4px rgba(0,0,0,0.3); }
        .blue.pressed { box-shadow: 0 2px 0 #002266, 0 3px 6px rgba(0,0,0,0.4), inset 0 2px 4px rgba(0,0,0,0.3); }
        .yellow.pressed { box-shadow: 0 2px 0 #665500, 0 3px 6px rgba(0,0,0,0.4), inset 0 2px 4px rgba(0,0,0,0.3); }
        .green.pressed { box-shadow: 0 2px 0 #006622, 0 3px 6px rgba(0,0,0,0.4), inset 0 2px 4px rgba(0,0,0,0.3); }
        .btn-icon { font-size: 20px; line-height: 1; }
        .btn-label {
          font-family: 'Press Start 2P', monospace;
          font-size: 4px;
          color: rgba(0,0,0,0.7);
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }
      `}</style>
    </button>
  )
}

export default function ArcadeButtons({ onDirection, onRestart, onPowerup, grantedPowerups, activePowerupKey, selectedPowerup, onSelectPowerup, isLoggedIn }: Props) {
  const currentPowerup = grantedPowerups.find(p => p.key === selectedPowerup) || grantedPowerups[0]

  return (
    <div className="arcade-panel">
      {/* Panel surface */}
      <div className="panel-surface">
        {/* Left: D-pad */}
        <div className="dpad-section">
          <div className="dpad-label">MOVE</div>
          <div className="dpad">
            <div className="dpad-row">
              <ArcadeBtn label="UP" icon="▲" color="red" onPress={() => onDirection('UP')} />
            </div>
            <div className="dpad-row middle">
              <ArcadeBtn label="LEFT" icon="◄" color="red" onPress={() => onDirection('LEFT')} />
              <div className="dpad-center" />
              <ArcadeBtn label="RIGHT" icon="►" color="red" onPress={() => onDirection('RIGHT')} />
            </div>
            <div className="dpad-row">
              <ArcadeBtn label="DOWN" icon="▼" color="red" onPress={() => onDirection('DOWN')} />
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="panel-divider">
          <div className="divider-line" />
          <div className="coin-slot">
            <div className="slot-hole" />
            <span className="slot-text">INSERT COIN</span>
          </div>
          <div className="divider-line" />
        </div>

        {/* Right: Action buttons */}
        <div className="action-section">
          <div className="action-label">ACTIONS</div>
          <div className="action-btns">
            <ArcadeBtn label="RESTART" icon="↺" color="blue" onPress={onRestart} />
            {isLoggedIn && currentPowerup ? (
              <div className="powerup-btn-wrap">
                <ArcadeBtn
                  label={activePowerupKey ? 'ACTIVE!' : 'POWER'}
                  icon={currentPowerup.icon}
                  color={activePowerupKey ? 'green' : 'yellow'}
                  onPress={onPowerup}
                />
                {grantedPowerups.length > 1 && (
                  <select
                    className="powerup-select"
                    value={selectedPowerup || ''}
                    onChange={e => onSelectPowerup(e.target.value as PowerupKey)}
                    title="Select power-up"
                  >
                    {grantedPowerups.map(p => (
                      <option key={p.key} value={p.key}>{p.icon} {p.name}</option>
                    ))}
                  </select>
                )}
              </div>
            ) : (
              <ArcadeBtn label="POWER" icon="⚡" color="yellow" onPress={() => {}} />
            )}
          </div>
          {isLoggedIn && grantedPowerups.length > 0 && (
            <div className="powerup-info">
              {grantedPowerups.map(p => (
                <button
                  key={p.key}
                  className={`powerup-pill ${selectedPowerup === p.key ? 'active' : ''}`}
                  onClick={() => onSelectPowerup(p.key)}
                  title={p.name}
                >
                  {p.icon}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .arcade-panel {
          width: 540px;
          margin-top: -2px;
        }
        .panel-surface {
          background: linear-gradient(160deg, #1a1a10 0%, #141410 50%, #0e0e0a 100%);
          border: 2px solid #2a2a1a;
          border-top: none;
          border-radius: 0 0 20px 20px;
          padding: 20px 30px 24px;
          display: flex;
          gap: 20px;
          align-items: center;
          box-shadow:
            4px 4px 0 #0a0a06,
            8px 8px 0 rgba(0,0,0,0.3),
            inset 0 1px 0 rgba(255,255,255,0.03),
            inset 0 -4px 20px rgba(0,0,0,0.5);
          position: relative;
        }
        .panel-surface::before {
          content: '';
          position: absolute;
          top: 0;
          left: 20px;
          right: 20px;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(0,255,65,0.1), transparent);
        }
        .dpad-section, .action-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          flex: 1;
        }
        .dpad-label, .action-label {
          font-family: 'Press Start 2P', monospace;
          font-size: 5px;
          color: #4a6a4a;
          letter-spacing: 2px;
        }
        .dpad {
          display: flex;
          flex-direction: column;
          gap: 4px;
          align-items: center;
        }
        .dpad-row {
          display: flex;
          justify-content: center;
        }
        .dpad-row.middle {
          display: flex;
          gap: 4px;
          align-items: center;
        }
        .dpad-center {
          width: 28px;
          height: 28px;
          background: #0a0a06;
          border-radius: 4px;
          border: 1px solid #1a1a10;
        }
        .panel-divider {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 0 4px;
        }
        .divider-line {
          width: 2px;
          flex: 1;
          background: linear-gradient(180deg, transparent, #2a2a1a, transparent);
          min-height: 30px;
        }
        .coin-slot {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }
        .slot-hole {
          width: 36px;
          height: 6px;
          background: #050505;
          border-radius: 3px;
          border: 1px solid #1a1a10;
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.9);
        }
        .slot-text {
          font-family: 'Press Start 2P', monospace;
          font-size: 4px;
          color: #3a3a2a;
          letter-spacing: 0.5px;
        }
        .action-btns {
          display: flex;
          gap: 16px;
          align-items: center;
        }
        .powerup-btn-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }
        .powerup-select {
          font-family: 'Press Start 2P', monospace;
          font-size: 4px;
          background: #0a0a06;
          color: #00ff41;
          border: 1px solid #2a4a2a;
          border-radius: 3px;
          padding: 2px 4px;
          cursor: pointer;
          width: 80px;
          outline: none;
        }
        .powerup-info {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          justify-content: center;
          max-width: 160px;
        }
        .powerup-pill {
          background: rgba(0,255,65,0.05);
          border: 1px solid rgba(0,255,65,0.2);
          border-radius: 4px;
          padding: 4px 6px;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.15s;
          line-height: 1;
        }
        .powerup-pill:hover {
          background: rgba(0,255,65,0.1);
          border-color: rgba(0,255,65,0.4);
        }
        .powerup-pill.active {
          background: rgba(0,255,65,0.15);
          border-color: #00ff41;
          box-shadow: 0 0 8px rgba(0,255,65,0.3);
        }
      `}</style>
    </div>
  )
}
