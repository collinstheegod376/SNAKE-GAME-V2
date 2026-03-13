'use client'
import { useState, useCallback, useEffect } from 'react'
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

function ArcadeBtn({ label, icon, color, onPress, size = 'normal' }: {
  label: string; icon: string; color: string; onPress: () => void; size?: 'normal' | 'small'
}) {
  const [pressed, setPressed] = useState(false)

  const handlePress = useCallback(() => {
    setPressed(true)
    onPress()
    setTimeout(() => setPressed(false), 150)
  }, [onPress])

  const sz = size === 'small' ? 56 : 68

  return (
    <button
      onMouseDown={handlePress}
      onTouchStart={(e) => { e.preventDefault(); handlePress() }}
      className={`arcade-btn ${color} ${pressed ? 'pressed' : ''}`}
      aria-label={label}
      style={{ width: sz, height: sz }}
    >
      <span className="btn-icon">{icon}</span>
      <span className="btn-label">{label}</span>
      <style jsx>{`
        .arcade-btn {
          position: relative;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 2px;
          transition: transform 0.08s, box-shadow 0.08s;
          user-select: none;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
          outline: none;
          flex-shrink: 0;
        }
        .red {
          background: radial-gradient(circle at 35% 35%, #ff4444 0%, #cc0000 60%, #990000 100%);
          box-shadow: 0 5px 0 #660000, 0 7px 10px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.2), 0 0 16px rgba(255,0,0,0.3);
        }
        .blue {
          background: radial-gradient(circle at 35% 35%, #4488ff 0%, #0044cc 60%, #003399 100%);
          box-shadow: 0 5px 0 #002266, 0 7px 10px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.2), 0 0 16px rgba(0,100,255,0.3);
        }
        .yellow {
          background: radial-gradient(circle at 35% 35%, #ffee44 0%, #ccaa00 60%, #997700 100%);
          box-shadow: 0 5px 0 #665500, 0 7px 10px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.3), 0 0 16px rgba(255,220,0,0.3);
        }
        .green {
          background: radial-gradient(circle at 35% 35%, #44ff88 0%, #00cc44 60%, #009933 100%);
          box-shadow: 0 5px 0 #006622, 0 7px 10px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.2), 0 0 16px rgba(0,255,100,0.3);
        }
        .arcade-btn:not(.pressed):hover { transform: translateY(-2px); filter: brightness(1.1); }
        .arcade-btn.pressed {
          transform: translateY(4px);
          filter: brightness(0.9);
        }
        .red.pressed { box-shadow: 0 1px 0 #660000, 0 2px 5px rgba(0,0,0,0.4), inset 0 2px 4px rgba(0,0,0,0.3); }
        .blue.pressed { box-shadow: 0 1px 0 #002266, 0 2px 5px rgba(0,0,0,0.4), inset 0 2px 4px rgba(0,0,0,0.3); }
        .yellow.pressed { box-shadow: 0 1px 0 #665500, 0 2px 5px rgba(0,0,0,0.4), inset 0 2px 4px rgba(0,0,0,0.3); }
        .green.pressed { box-shadow: 0 1px 0 #006622, 0 2px 5px rgba(0,0,0,0.4), inset 0 2px 4px rgba(0,0,0,0.3); }
        .btn-icon { font-size: 18px; line-height: 1; }
        .btn-label {
          font-family: 'Press Start 2P', monospace;
          font-size: 4px;
          color: rgba(0,0,0,0.7);
          letter-spacing: 0.5px;
        }
      `}</style>
    </button>
  )
}

export default function ArcadeButtons({ onDirection, onRestart, onPowerup, grantedPowerups, activePowerupKey, selectedPowerup, onSelectPowerup, isLoggedIn }: Props) {
  const [scale, setScale] = useState(1)
  const currentPowerup = grantedPowerups.find(p => p.key === selectedPowerup) || grantedPowerups[0]

  useEffect(() => {
    function updateScale() {
      const vw = window.innerWidth
      setScale(Math.min(1, (vw - 32) / 540))
    }
    updateScale()
    window.addEventListener('resize', updateScale)
    return () => window.removeEventListener('resize', updateScale)
  }, [])

  return (
    <div style={{ transform: `scale(${scale})`, transformOrigin: 'top center', width: 540, marginTop: -2 }}>
      <div className="panel-surface">
        {/* Left: D-pad */}
        <div className="dpad-section">
          <div className="section-label">MOVE</div>
          <div className="dpad">
            <div className="dpad-row">
              <ArcadeBtn label="UP" icon="▲" color="red" onPress={() => onDirection('UP')} />
            </div>
            <div className="dpad-mid">
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
        <div className="divider">
          <div className="div-line" />
          <div className="coin-slot">
            <div className="slot-hole" />
            <span className="slot-text">COIN</span>
          </div>
          <div className="div-line" />
        </div>

        {/* Right: Action buttons */}
        <div className="action-section">
          <div className="section-label">ACTION</div>
          <div className="action-btns">
            <ArcadeBtn label="RESTART" icon="↺" color="blue" onPress={onRestart} />
            {isLoggedIn && currentPowerup ? (
              <ArcadeBtn
                label={activePowerupKey ? 'ACTIVE' : 'POWER'}
                icon={currentPowerup.icon}
                color={activePowerupKey ? 'green' : 'yellow'}
                onPress={onPowerup}
              />
            ) : (
              <ArcadeBtn label="POWER" icon="⚡" color="yellow" onPress={() => {}} />
            )}
          </div>
          {isLoggedIn && grantedPowerups.length > 1 && (
            <div className="pu-pills">
              {grantedPowerups.map(p => (
                <button
                  key={p.key}
                  className={`pu-pill ${selectedPowerup === p.key ? 'active' : ''}`}
                  onClick={() => onSelectPowerup(p.key)}
                  title={p.name}
                >
                  {p.icon}
                </button>
              ))}
            </div>
          )}
          {!isLoggedIn && (
            <div className="login-hint">LOGIN TO USE POWERUPS</div>
          )}
        </div>
      </div>

      <style jsx>{`
        .panel-surface {
          background: linear-gradient(160deg, #1a1a10 0%, #141410 50%, #0e0e0a 100%);
          border: 2px solid #2a2a1a;
          border-top: none;
          border-radius: 0 0 20px 20px;
          padding: 16px 24px 20px;
          display: flex;
          gap: 12px;
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
          top: 0; left: 20px; right: 20px;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(0,255,65,0.1), transparent);
        }
        .dpad-section, .action-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          flex: 1;
        }
        .section-label {
          font-family: 'Press Start 2P', monospace;
          font-size: 5px;
          color: #4a6a4a;
          letter-spacing: 2px;
        }
        .dpad { display: flex; flex-direction: column; align-items: center; gap: 3px; }
        .dpad-row { display: flex; justify-content: center; }
        .dpad-mid { display: flex; gap: 3px; align-items: center; }
        .dpad-center {
          width: 24px; height: 24px;
          background: #0a0a06;
          border-radius: 4px;
          border: 1px solid #1a1a10;
          flex-shrink: 0;
        }
        .divider {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          padding: 0 4px;
        }
        .div-line {
          width: 2px;
          flex: 1;
          min-height: 24px;
          background: linear-gradient(180deg, transparent, #2a2a1a, transparent);
        }
        .coin-slot { display: flex; flex-direction: column; align-items: center; gap: 3px; }
        .slot-hole {
          width: 28px; height: 5px;
          background: #050505;
          border-radius: 3px;
          border: 1px solid #1a1a10;
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.9);
        }
        .slot-text {
          font-family: 'Press Start 2P', monospace;
          font-size: 4px;
          color: #3a3a2a;
        }
        .action-btns { display: flex; gap: 14px; align-items: center; }
        .pu-pills {
          display: flex;
          gap: 5px;
          flex-wrap: wrap;
          justify-content: center;
          max-width: 160px;
          margin-top: 2px;
        }
        .pu-pill {
          background: rgba(0,255,65,0.05);
          border: 1px solid rgba(0,255,65,0.2);
          border-radius: 4px;
          padding: 4px 5px;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.15s;
          line-height: 1;
          touch-action: manipulation;
        }
        .pu-pill:hover { background: rgba(0,255,65,0.1); }
        .pu-pill.active {
          background: rgba(0,255,65,0.15);
          border-color: #00ff41;
          box-shadow: 0 0 8px rgba(0,255,65,0.3);
        }
        .login-hint {
          font-family: 'Press Start 2P', monospace;
          font-size: 4px;
          color: #2a4a2a;
          text-align: center;
          margin-top: 4px;
          letter-spacing: 0.5px;
        }
      `}</style>
    </div>
  )
}
