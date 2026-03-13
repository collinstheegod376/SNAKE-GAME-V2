'use client'
import { useState, useCallback, useEffect, useRef } from 'react'
import { PowerupKey, PowerupData } from './SnakeGame'

interface Props {
  onDirection: (dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => void
  onRestart: () => void
  onOpenPowerupMenu: () => void
  grantedPowerups: PowerupData[]
  activePowerupKey: PowerupKey | null
  isLoggedIn: boolean
  scale: number
}

function JoystickBtn({ dir, onPress }: { dir: string; onPress: () => void }) {
  const [pressed, setPressed] = useState(false)
  const handle = useCallback(() => {
    setPressed(true)
    onPress()
    setTimeout(() => setPressed(false), 120)
  }, [onPress])

  const arrows: Record<string, string> = { UP: '▲', DOWN: '▼', LEFT: '◄', RIGHT: '►' }

  return (
    <button
      onMouseDown={handle}
      onTouchStart={e => { e.preventDefault(); handle() }}
      className={`joy-btn ${pressed ? 'pressed' : ''}`}
      aria-label={dir}
    >
      {arrows[dir]}
      <style jsx>{`
        .joy-btn {
          width: 52px; height: 52px;
          background: linear-gradient(145deg, #3a2e1e, #1e1408);
          border: 1.5px solid #5a4a2a;
          border-radius: 8px;
          color: var(--beige);
          font-size: 16px;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: transform 0.07s, box-shadow 0.07s, background 0.07s;
          box-shadow: 0 4px 0 #0a0806, 0 6px 10px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06);
          user-select: none;
          touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
          flex-shrink: 0;
        }
        .joy-btn:hover:not(.pressed) {
          background: linear-gradient(145deg, #4a3a28, #2a1c10);
          color: var(--amber);
        }
        .joy-btn.pressed {
          transform: translateY(3px);
          box-shadow: 0 1px 0 #0a0806, 0 2px 4px rgba(0,0,0,0.4);
          background: linear-gradient(145deg, #2a2010, #1a1008);
          color: var(--amber);
        }
      `}</style>
    </button>
  )
}

function ActionBtn({ label, icon, variant, onPress, active }: {
  label: string; icon: string; variant: 'start' | 'powerup'; onPress: () => void; active?: boolean
}) {
  const [pressed, setPressed] = useState(false)
  const handle = useCallback(() => {
    setPressed(true)
    onPress()
    setTimeout(() => setPressed(false), 150)
  }, [onPress])

  return (
    <div className="action-wrap">
      <button
        onMouseDown={handle}
        onTouchStart={e => { e.preventDefault(); handle() }}
        className={`action-btn ${variant} ${pressed ? 'pressed' : ''} ${active ? 'active' : ''}`}
        aria-label={label}
      >
        <span className="a-icon">{icon}</span>
      </button>
      <span className="a-label">{label}</span>
      <style jsx>{`
        .action-wrap {
          display: flex; flex-direction: column; align-items: center; gap: 6px;
        }
        .action-btn {
          width: 62px; height: 62px; border-radius: 50%;
          border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          font-size: 22px;
          transition: transform 0.08s, box-shadow 0.08s, filter 0.08s;
          user-select: none; touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
          flex-shrink: 0;
        }
        .start {
          background: radial-gradient(circle at 35% 35%, #e63000 0%, #991a00 60%, #661000 100%);
          box-shadow: 0 5px 0 #330800, 0 8px 16px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.15), 0 0 20px rgba(204,34,0,0.25);
        }
        .powerup {
          background: radial-gradient(circle at 35% 35%, #ffcc44 0%, #cc8800 60%, #885500 100%);
          box-shadow: 0 5px 0 #442200, 0 8px 16px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.2), 0 0 20px rgba(255,176,0,0.25);
        }
        .powerup.active {
          background: radial-gradient(circle at 35% 35%, #44ff88 0%, #00aa44 60%, #006622 100%);
          box-shadow: 0 5px 0 #003311, 0 8px 16px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.2), 0 0 20px rgba(0,255,100,0.3);
          animation: activePulse 0.8s ease-in-out infinite;
        }
        @keyframes activePulse { 0%,100%{filter:brightness(1)} 50%{filter:brightness(1.2)} }
        .action-btn:not(.pressed):hover { filter: brightness(1.12); transform: translateY(-2px); }
        .action-btn.pressed { transform: translateY(4px); filter: brightness(0.85); }
        .start.pressed { box-shadow: 0 1px 0 #330800, 0 2px 6px rgba(0,0,0,0.4); }
        .powerup.pressed { box-shadow: 0 1px 0 #442200, 0 2px 6px rgba(0,0,0,0.4); }
        .a-icon { line-height: 1; }
        .a-label {
          font-family: 'Press Start 2P', monospace;
          font-size: 4px;
          color: #7a6040;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }
      `}</style>
    </div>
  )
}

export default function ArcadeController({ onDirection, onRestart, onOpenPowerupMenu, grantedPowerups, activePowerupKey, isLoggedIn, scale }: Props) {
  return (
    <div style={{ transform: `scale(${scale})`, transformOrigin: 'top center', width: 500, flexShrink: 0, marginTop: -2 }}>
      <div className="controller">
        {/* Joystick panel */}
        <div className="joystick-panel">
          <div className="panel-label">JOYSTICK</div>
          <div className="joystick-gate">
            {/* Gate decoration */}
            <div className="gate-decoration" />
            <div className="dpad">
              <div className="dpad-row">
                <JoystickBtn dir="UP" onPress={() => onDirection('UP')} />
              </div>
              <div className="dpad-mid">
                <JoystickBtn dir="LEFT" onPress={() => onDirection('LEFT')} />
                <div className="dpad-center">
                  <div className="center-dot" />
                </div>
                <JoystickBtn dir="RIGHT" onPress={() => onDirection('RIGHT')} />
              </div>
              <div className="dpad-row">
                <JoystickBtn dir="DOWN" onPress={() => onDirection('DOWN')} />
              </div>
            </div>
          </div>
        </div>

        {/* Divider with coin slot */}
        <div className="center-panel">
          <div className="div-line" />
          <div className="coin-area">
            <div className="coin-slot" />
            <div className="coin-text">INSERT</div>
            <div className="coin-text">COIN</div>
          </div>
          <div className="div-line" />
        </div>

        {/* Action buttons */}
        <div className="action-panel">
          <div className="panel-label">CONTROLS</div>
          <div className="action-btns">
            <ActionBtn
              label="START"
              icon="▶"
              variant="start"
              onPress={onRestart}
            />
            {isLoggedIn && grantedPowerups.length > 0 ? (
              <ActionBtn
                label={activePowerupKey ? 'ACTIVE!' : 'POWER'}
                icon={activePowerupKey ? '✦' : '⚡'}
                variant="powerup"
                onPress={onOpenPowerupMenu}
                active={!!activePowerupKey}
              />
            ) : (
              <ActionBtn label="POWER" icon="⚡" variant="powerup" onPress={() => {}} />
            )}
          </div>
          {isLoggedIn && grantedPowerups.length > 0 && (
            <div className="powerup-dots">
              {grantedPowerups.map(p => (
                <div key={p.key} className="pu-dot" title={p.name}>
                  {p.icon}
                </div>
              ))}
            </div>
          )}
          {!isLoggedIn && (
            <div className="login-hint">LOGIN FOR POWER-UPS</div>
          )}
        </div>
      </div>

      <style jsx>{`
        .controller {
          background: linear-gradient(160deg, #2e2418 0%, #201a0e 50%, #181208 100%);
          border: 1.5px solid #3a2e1a;
          border-top: none;
          border-radius: 0 0 24px 24px;
          padding: 18px 24px 22px;
          display: flex;
          gap: 10px;
          align-items: center;
          box-shadow:
            5px 5px 0 #0a0806,
            10px 10px 0 rgba(0,0,0,0.25),
            inset 0 1px 0 rgba(255,255,255,0.03),
            inset 0 -6px 24px rgba(0,0,0,0.5);
          position: relative;
        }
        .controller::before {
          content: '';
          position: absolute;
          top: 0; left: 20px; right: 20px; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,176,0,0.08), transparent);
        }
        /* Subtle surface texture lines */
        .controller::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 0 0 24px 24px;
          background: repeating-linear-gradient(
            90deg, transparent 0px, transparent 40px,
            rgba(255,255,255,0.01) 40px, rgba(255,255,255,0.01) 41px
          );
          pointer-events: none;
        }
        .joystick-panel, .action-panel {
          display: flex; flex-direction: column; align-items: center;
          gap: 8px; flex: 1;
        }
        .panel-label {
          font-family: 'Press Start 2P', monospace;
          font-size: 5px; color: #5a4820; letter-spacing: 2px;
        }
        .joystick-gate {
          position: relative;
          background: #0e0a04;
          border: 1.5px solid #2a2010;
          border-radius: 12px;
          padding: 10px;
          box-shadow: inset 0 2px 8px rgba(0,0,0,0.8);
        }
        .gate-decoration {
          position: absolute;
          inset: 4px;
          border: 1px dashed rgba(255,176,0,0.08);
          border-radius: 8px;
          pointer-events: none;
        }
        .dpad { display: flex; flex-direction: column; align-items: center; gap: 4px; }
        .dpad-row { display: flex; justify-content: center; }
        .dpad-mid { display: flex; gap: 4px; align-items: center; }
        .dpad-center {
          width: 28px; height: 28px; flex-shrink: 0;
          background: #0a0704;
          border: 1px solid #1a1408;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
        }
        .center-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: radial-gradient(circle, #3a2a14, #1a1008);
          border: 1px solid #0a0806;
        }
        .center-panel {
          display: flex; flex-direction: column; align-items: center;
          gap: 8px; padding: 0 6px;
        }
        .div-line {
          width: 2px; flex: 1; min-height: 20px;
          background: linear-gradient(180deg, transparent, #2a2010, transparent);
        }
        .coin-area { display: flex; flex-direction: column; align-items: center; gap: 3px; }
        .coin-slot {
          width: 32px; height: 5px;
          background: #080502; border-radius: 3px;
          border: 1px solid #1a1408;
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.95);
        }
        .coin-text {
          font-family: 'Press Start 2P', monospace;
          font-size: 4px; color: #3a2a10; letter-spacing: 0.5px;
        }
        .action-btns { display: flex; gap: 18px; align-items: center; }
        .powerup-dots {
          display: flex; gap: 5px; flex-wrap: wrap;
          justify-content: center; max-width: 140px;
        }
        .pu-dot {
          font-size: 14px; line-height: 1;
          background: rgba(255,176,0,0.05);
          border: 1px solid rgba(255,176,0,0.15);
          border-radius: 4px; padding: 4px 5px;
        }
        .login-hint {
          font-family: 'Press Start 2P', monospace;
          font-size: 4px; color: #3a2a10;
          letter-spacing: 0.5px; text-align: center;
        }
      `}</style>
    </div>
  )
}
