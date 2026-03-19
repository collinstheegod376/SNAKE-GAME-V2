'use client'
import { useState, useCallback, useRef } from 'react'
import { PowerupKey, PowerupData } from './SnakeGame'

export const CTRL_NATURAL_W = 500

interface Props {
  onDirection:       (dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => void
  onRestart:         () => void
  onPowerupBtn:      () => void
  isPowerupMenuOpen: boolean
  availablePowerups: PowerupData[]
  activePowerupKey:  PowerupKey | null
  isLoggedIn:        boolean
}

// ── Directional button ────────────────────────────────────────────────────────
function JoyBtn({ dir, label, onPress }: { dir: string; label: string; onPress: () => void }) {
  const [pressed, setPressed] = useState(false)
  const guard = useRef(0)

  const fire = useCallback(() => {
    const now = Date.now()
    if (now - guard.current < 250) return
    guard.current = now
    setPressed(true)
    onPress()
    setTimeout(() => setPressed(false), 100)
  }, [onPress])

  const arrows: Record<string,string> = { UP:'▲', DOWN:'▼', LEFT:'◄', RIGHT:'►' }

  return (
    <button
      className={`jb ${pressed ? 'pr' : ''}`}
      onMouseDown={fire}
      onTouchStart={e => { e.preventDefault(); fire() }}
      aria-label={label}
    >
      {arrows[dir]}
      <style jsx>{`
        .jb {
          width: 70px; height: 70px; border-radius: 10px;
          background: linear-gradient(145deg, #3a2e1e, #1e1408);
          border: 1.5px solid #5a4a2a; color: #c8b89a; font-size: 20px;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          box-shadow: 0 5px 0 #0a0806, 0 7px 12px rgba(0,0,0,0.55),
            inset 0 1px 0 rgba(255,255,255,0.07);
          transition: transform 0.07s, box-shadow 0.07s, color 0.07s;
          user-select: none; touch-action: manipulation; flex-shrink: 0;
          -webkit-tap-highlight-color: transparent;
        }
        .jb:hover:not(.pr) { color: #ffb000; }
        .jb.pr {
          transform: translateY(4px);
          box-shadow: 0 1px 0 #0a0806, 0 2px 5px rgba(0,0,0,0.45);
          color: #ffb000;
        }
      `}</style>
    </button>
  )
}

// ── Round action button ───────────────────────────────────────────────────────
function RoundBtn({ label, icon, kind, onPress, active }: {
  label: string; icon: string; kind: 'start' | 'power'
  onPress: () => void; active?: boolean
}) {
  const [pressed, setPressed] = useState(false)
  const guard = useRef(0)

  const fire = useCallback(() => {
    const now = Date.now()
    if (now - guard.current < 300) return
    guard.current = now
    setPressed(true)
    onPress()
    setTimeout(() => setPressed(false), 140)
  }, [onPress])

  return (
    <div className="rw">
      <button
        className={`rb ${kind} ${pressed ? 'pr' : ''} ${active ? 'act' : ''}`}
        onMouseDown={fire}
        onTouchStart={e => { e.preventDefault(); fire() }}
        aria-label={label}
      >
        <span>{icon}</span>
      </button>
      <span className="rl">{label}</span>
      <style jsx>{`
        .rw { display: flex; flex-direction: column; align-items: center; gap: 6px; }
        .rb {
          width: 68px; height: 68px; border-radius: 50%; border: none;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          font-size: 24px;
          transition: transform 0.08s, box-shadow 0.08s, filter 0.08s;
          user-select: none; touch-action: manipulation; flex-shrink: 0;
          -webkit-tap-highlight-color: transparent;
        }
        .start {
          background: radial-gradient(circle at 35% 35%, #e63000, #991a00 60%, #661000);
          box-shadow: 0 6px 0 #330800, 0 9px 16px rgba(0,0,0,0.65),
            inset 0 1px 0 rgba(255,255,255,0.15), 0 0 20px rgba(204,34,0,0.22);
        }
        .power {
          background: radial-gradient(circle at 35% 35%, #ffcc44, #cc8800 60%, #885500);
          box-shadow: 0 6px 0 #442200, 0 9px 16px rgba(0,0,0,0.65),
            inset 0 1px 0 rgba(255,255,255,0.22), 0 0 20px rgba(255,176,0,0.22);
        }
        .power.act {
          background: radial-gradient(circle at 35% 35%, #ff8800, #cc4400 60%, #882200);
          box-shadow: 0 6px 0 #441100, 0 9px 16px rgba(0,0,0,0.65),
            inset 0 1px 0 rgba(255,255,255,0.15), 0 0 24px rgba(255,136,0,0.5);
          animation: gp 0.9s ease-in-out infinite;
        }
        @keyframes gp { 0%,100%{filter:brightness(1)} 50%{filter:brightness(1.3)} }
        .rb:not(.pr):hover { filter: brightness(1.12); transform: translateY(-2px); }
        .rb.pr { transform: translateY(5px); filter: brightness(0.8); }
        .start.pr { box-shadow: 0 1px 0 #330800, 0 2px 5px rgba(0,0,0,0.4); }
        .power.pr { box-shadow: 0 1px 0 #442200, 0 2px 5px rgba(0,0,0,0.4); }
        .rl { font-family: 'Press Start 2P', monospace; font-size: 4px; color: #7a6040; letter-spacing: 0.5px; }
      `}</style>
    </div>
  )
}

const PU_ICONS: Record<string,string> = {
  invisibility:'👻', rush:'⚡', ghost:'🌀', magnet:'🧲', freeze:'❄️', shield:'🛡️',
}

// ── Main controller ───────────────────────────────────────────────────────────
export default function ArcadeController({
  onDirection, onRestart, onPowerupBtn, isPowerupMenuOpen,
  availablePowerups, activePowerupKey, isLoggedIn,
}: Props) {

  // When menu open, joystick fires menu-nav events instead of game movement
  const handleDir = useCallback((dir: 'UP'|'DOWN'|'LEFT'|'RIGHT') => {
    if (isPowerupMenuOpen) {
      if (dir === 'UP'   || dir === 'LEFT')  window.dispatchEvent(new Event('menu:up'))
      if (dir === 'DOWN' || dir === 'RIGHT') window.dispatchEvent(new Event('menu:down'))
    } else {
      onDirection(dir)
    }
  }, [isPowerupMenuOpen, onDirection])

  // START: confirm menu selection when menu open, else restart game
  const handleStart = useCallback(() => {
    if (isPowerupMenuOpen) window.dispatchEvent(new Event('menu:confirm'))
    else onRestart()
  }, [isPowerupMenuOpen, onRestart])

  return (
    <div className="ctrl">

      {/* ── LEFT SIDE: Action buttons (START + POWER) ── */}
      <div className="section">
        <div className="slbl">{isPowerupMenuOpen ? 'NAVIGATING' : 'CONTROLS'}</div>
        <div className="abtns">
          {/* START button */}
          <RoundBtn
            label={isPowerupMenuOpen ? 'SELECT' : 'START'}
            icon={isPowerupMenuOpen ? '✔' : '▶'}
            kind="start"
            onPress={handleStart}
          />
          {/* POWER button */}
          {isLoggedIn && availablePowerups.length > 0 ? (
            <RoundBtn
              label={isPowerupMenuOpen ? 'CANCEL' : activePowerupKey ? 'ACTIVE' : 'POWER'}
              icon={isPowerupMenuOpen ? '✕' : activePowerupKey ? '✦' : '⚡'}
              kind="power"
              onPress={onPowerupBtn}
              active={isPowerupMenuOpen || !!activePowerupKey}
            />
          ) : (
            <RoundBtn label="POWER" icon="⚡" kind="power" onPress={() => {}} />
          )}
        </div>

        {isPowerupMenuOpen && (
          <div className="mhint">↑ ↓ JOY  •  START = USE</div>
        )}
        {!isPowerupMenuOpen && !activePowerupKey && isLoggedIn && availablePowerups.length > 0 && (
          <div className="pudots">
            {availablePowerups.map((p, i) => (
              <div key={`${p.key}-${i}`} className="pdot" title={p.name}>
                {PU_ICONS[p.key] || '⚡'}
              </div>
            ))}
          </div>
        )}
        {!isLoggedIn && <div className="nolo">LOGIN FOR POWERUPS</div>}
        {isLoggedIn && availablePowerups.length === 0 && !activePowerupKey && (
          <div className="nolo">NO POWER-UPS LEFT</div>
        )}
      </div>

      {/* ── CENTRE DIVIDER ── */}
      <div className="divider">
        <div className="dl" />
        <div className="coin">
          <div className="slot" />
          <span className="ct">COIN</span>
        </div>
        <div className="dl" />
      </div>

      {/* ── RIGHT SIDE: Joystick ── */}
      <div className="section">
        <div className="slbl">JOYSTICK</div>
        <div className="gate">
          <div className="dpad">
            <div className="row">
              <JoyBtn dir="UP" label="Up" onPress={() => handleDir('UP')} />
            </div>
            <div className="mid">
              <JoyBtn dir="LEFT"  label="Left"  onPress={() => handleDir('LEFT')}  />
              <div className="cntr"><div className="cdot" /></div>
              <JoyBtn dir="RIGHT" label="Right" onPress={() => handleDir('RIGHT')} />
            </div>
            <div className="row">
              <JoyBtn dir="DOWN" label="Down" onPress={() => handleDir('DOWN')} />
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .ctrl {
          width: 500px;
          display: flex; gap: 6px; align-items: center;
          background: linear-gradient(160deg, #2e2418, #201a0e 50%, #181208);
          border: 1.5px solid #3a2e1a; border-top: none;
          border-radius: 0 0 24px 24px;
          padding: 18px 18px 24px;
          box-shadow:
            5px 5px 0 #0a0806, 10px 10px 0 rgba(0,0,0,0.25),
            inset 0 1px 0 rgba(255,255,255,0.025),
            inset 0 -6px 24px rgba(0,0,0,0.5);
          position: relative;
        }
        .ctrl::before {
          content: ''; position: absolute;
          top: 0; left: 20px; right: 20px; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,176,0,0.08), transparent);
        }
        .section { display: flex; flex-direction: column; align-items: center; gap: 8px; flex: 1; }
        .slbl { font-family: 'Press Start 2P', monospace; font-size: 5px; color: #5a4820; letter-spacing: 2px; }

        .gate {
          background: #0e0a04; border: 1.5px solid #2a2010;
          border-radius: 14px; padding: 10px;
          box-shadow: inset 0 2px 10px rgba(0,0,0,0.85);
        }
        .dpad { display: flex; flex-direction: column; align-items: center; gap: 4px; }
        .row  { display: flex; justify-content: center; }
        .mid  { display: flex; gap: 4px; align-items: center; }
        .cntr {
          width: 30px; height: 30px; flex-shrink: 0; border-radius: 50%;
          background: #0a0704; border: 1px solid #1a1408;
          display: flex; align-items: center; justify-content: center;
        }
        .cdot {
          width: 9px; height: 9px; border-radius: 50%;
          background: radial-gradient(circle, #3a2a14, #1a1008);
          border: 1px solid #0a0806;
        }

        .divider { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 0 4px; }
        .dl { width: 2px; flex: 1; min-height: 20px; background: linear-gradient(180deg, transparent, #2a2010, transparent); }
        .coin { display: flex; flex-direction: column; align-items: center; gap: 3px; }
        .slot { width: 30px; height: 5px; background: #080502; border-radius: 3px; border: 1px solid #1a1408; box-shadow: inset 0 2px 4px rgba(0,0,0,0.9); }
        .ct   { font-family: 'Press Start 2P', monospace; font-size: 4px; color: #3a2a10; }

        .abtns { display: flex; gap: 18px; align-items: center; }

        .mhint {
          font-family: 'Press Start 2P', monospace; font-size: 4px;
          color: #ffb000; letter-spacing: 0.5px; text-align: center;
          animation: mh 1.2s ease-in-out infinite;
        }
        @keyframes mh { 0%,100%{opacity:1} 50%{opacity:0.35} }

        .pudots { display: flex; gap: 5px; flex-wrap: wrap; justify-content: center; max-width: 150px; }
        .pdot {
          font-size: 16px; background: rgba(255,176,0,0.05);
          border: 1px solid rgba(255,176,0,0.15); border-radius: 5px; padding: 4px 5px;
        }
        .nolo { font-family: 'Press Start 2P', monospace; font-size: 4px; color: #3a2a10; text-align: center; }
      `}</style>
    </div>
  )
}
