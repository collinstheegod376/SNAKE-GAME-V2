'use client'
import { useState, useCallback } from 'react'
import { PowerupKey, PowerupData } from './SnakeGame'

// Natural (unscaled) width — used by page.tsx scaling math
export const CTRL_NATURAL_W = 500

interface Props {
  onDirection: (dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => void
  onRestart:        () => void
  onPowerupBtn:     () => void
  isPowerupMenuOpen: boolean
  grantedPowerups:  PowerupData[]
  activePowerupKey: PowerupKey | null
  isLoggedIn:       boolean
}

function JoyBtn({ dir, label, onPress }: { dir: string; label: string; onPress: () => void }) {
  const [p, setP] = useState(false)
  const fire = useCallback(() => {
    setP(true); onPress(); setTimeout(() => setP(false), 110)
  }, [onPress])
  const a: Record<string,string> = { UP:'▲', DOWN:'▼', LEFT:'◄', RIGHT:'►' }
  return (
    <button className={`jb ${p?'pr':''}`} onMouseDown={fire} onTouchStart={e=>{e.preventDefault();fire()}} aria-label={label}>
      {a[dir]}
      <style jsx>{`
        .jb {
          width:54px; height:54px; border-radius:8px;
          background:linear-gradient(145deg,#3a2e1e,#1e1408);
          border:1.5px solid #5a4a2a; color:#c8b89a; font-size:16px;
          cursor:pointer; display:flex; align-items:center; justify-content:center;
          box-shadow:0 4px 0 #0a0806,0 6px 10px rgba(0,0,0,0.5),inset 0 1px 0 rgba(255,255,255,0.06);
          transition:transform 0.07s,box-shadow 0.07s,color 0.07s;
          user-select:none; touch-action:manipulation; flex-shrink:0; -webkit-tap-highlight-color:transparent;
        }
        .jb:hover:not(.pr) { color:#ffb000; }
        .jb.pr { transform:translateY(3px); box-shadow:0 1px 0 #0a0806,0 2px 4px rgba(0,0,0,0.4); color:#ffb000; }
      `}</style>
    </button>
  )
}

function RoundBtn({ label, icon, kind, onPress, active }: {
  label:string; icon:string; kind:'start'|'power'; onPress:()=>void; active?:boolean
}) {
  const [p, setP] = useState(false)
  const fire = useCallback(() => { setP(true); onPress(); setTimeout(()=>setP(false),150) }, [onPress])
  return (
    <div className="rw">
      <button className={`rb ${kind} ${p?'pr':''} ${active?'act':''}`} onMouseDown={fire} onTouchStart={e=>{e.preventDefault();fire()}} aria-label={label}>
        <span>{icon}</span>
      </button>
      <span className="rl">{label}</span>
      <style jsx>{`
        .rw { display:flex; flex-direction:column; align-items:center; gap:5px; }
        .rb {
          width:64px; height:64px; border-radius:50%; border:none;
          cursor:pointer; display:flex; align-items:center; justify-content:center;
          font-size:22px; transition:transform 0.08s,box-shadow 0.08s,filter 0.08s;
          user-select:none; touch-action:manipulation; flex-shrink:0; -webkit-tap-highlight-color:transparent;
        }
        .start { background:radial-gradient(circle at 35% 35%,#e63000,#991a00 60%,#661000); box-shadow:0 5px 0 #330800,0 8px 14px rgba(0,0,0,0.6),inset 0 1px 0 rgba(255,255,255,0.15),0 0 18px rgba(204,34,0,0.2); }
        .power { background:radial-gradient(circle at 35% 35%,#ffcc44,#cc8800 60%,#885500); box-shadow:0 5px 0 #442200,0 8px 14px rgba(0,0,0,0.6),inset 0 1px 0 rgba(255,255,255,0.2),0 0 18px rgba(255,176,0,0.2); }
        .power.act { background:radial-gradient(circle at 35% 35%,#ff8800,#cc4400 60%,#882200); box-shadow:0 5px 0 #441100,0 8px 14px rgba(0,0,0,0.6),inset 0 1px 0 rgba(255,255,255,0.15),0 0 22px rgba(255,136,0,0.4); animation:gp 0.9s ease-in-out infinite; }
        @keyframes gp{0%,100%{filter:brightness(1)}50%{filter:brightness(1.25)}}
        .rb:not(.pr):hover { filter:brightness(1.12); transform:translateY(-2px); }
        .rb.pr { transform:translateY(4px); filter:brightness(0.82); }
        .start.pr { box-shadow:0 1px 0 #330800,0 2px 5px rgba(0,0,0,0.4); }
        .power.pr { box-shadow:0 1px 0 #442200,0 2px 5px rgba(0,0,0,0.4); }
        .rl { font-family:'Press Start 2P',monospace; font-size:4px; color:#7a6040; letter-spacing:0.5px; }
      `}</style>
    </div>
  )
}

export default function ArcadeController({ onDirection, onRestart, onPowerupBtn, isPowerupMenuOpen, grantedPowerups, activePowerupKey, isLoggedIn }: Props) {

  const handleDir = useCallback((dir: 'UP'|'DOWN'|'LEFT'|'RIGHT') => {
    if (isPowerupMenuOpen) {
      // Route joystick input to menu navigation events
      if (dir==='UP'  || dir==='LEFT')  window.dispatchEvent(new Event('menu:up'))
      if (dir==='DOWN'|| dir==='RIGHT') window.dispatchEvent(new Event('menu:down'))
    } else {
      onDirection(dir)
    }
  }, [isPowerupMenuOpen, onDirection])

  const handleStart = useCallback(() => {
    if (isPowerupMenuOpen) window.dispatchEvent(new Event('menu:confirm'))
    else onRestart()
  }, [isPowerupMenuOpen, onRestart])

  return (
    // Renders at exactly 500px wide — parent handles scaling
    <div className="ctrl">
      {/* Joystick section */}
      <div className="section">
        <div className="slbl">JOYSTICK</div>
        <div className="gate">
          <div className="dpad">
            <div className="row"><JoyBtn dir="UP"    label="Up"    onPress={()=>handleDir('UP')}    /></div>
            <div className="mid">
              <JoyBtn dir="LEFT"  label="Left"  onPress={()=>handleDir('LEFT')}  />
              <div className="cntr"><div className="cdot"/></div>
              <JoyBtn dir="RIGHT" label="Right" onPress={()=>handleDir('RIGHT')} />
            </div>
            <div className="row"><JoyBtn dir="DOWN"  label="Down"  onPress={()=>handleDir('DOWN')}  /></div>
          </div>
        </div>
      </div>

      {/* Center divider */}
      <div className="div">
        <div className="dl"/><div className="coin"><div className="slot"/><span className="ct">COIN</span></div><div className="dl"/>
      </div>

      {/* Action buttons */}
      <div className="section">
        <div className="slbl">{isPowerupMenuOpen ? 'NAVIGATING' : 'CONTROLS'}</div>
        <div className="abtns">
          <RoundBtn label={isPowerupMenuOpen?'SELECT':'START'} icon={isPowerupMenuOpen?'✔':'▶'} kind="start" onPress={handleStart} />
          {isLoggedIn && grantedPowerups.length > 0 ? (
            <RoundBtn
              label={isPowerupMenuOpen?'CANCEL':activePowerupKey?'ACTIVE':'POWER'}
              icon={isPowerupMenuOpen?'✕':activePowerupKey?'✦':'⚡'}
              kind="power" onPress={onPowerupBtn}
              active={isPowerupMenuOpen || !!activePowerupKey}
            />
          ) : (
            <RoundBtn label="POWER" icon="⚡" kind="power" onPress={()=>{}} />
          )}
        </div>
        {isPowerupMenuOpen && <div className="mhint">↑↓ NAVIGATE  •  START=USE</div>}
        {!isPowerupMenuOpen && isLoggedIn && grantedPowerups.length > 0 && (
          <div className="pudots">{grantedPowerups.map(p=><div key={p.key} className="pdot" title={p.name}>{p.icon}</div>)}</div>
        )}
        {!isLoggedIn && <div className="nolo">LOGIN FOR POWERUPS</div>}
      </div>

      <style jsx>{`
        .ctrl {
          width: 500px;
          display:flex; gap:8px; align-items:center;
          background:linear-gradient(160deg,#2e2418,#201a0e 50%,#181208);
          border:1.5px solid #3a2e1a; border-top:none;
          border-radius:0 0 24px 24px; padding:16px 22px 20px;
          box-shadow:5px 5px 0 #0a0806,10px 10px 0 rgba(0,0,0,0.25),
            inset 0 1px 0 rgba(255,255,255,0.025),inset 0 -6px 24px rgba(0,0,0,0.5);
          position:relative;
        }
        .ctrl::before { content:''; position:absolute; top:0; left:20px; right:20px; height:1px; background:linear-gradient(90deg,transparent,rgba(255,176,0,0.08),transparent); }
        .section { display:flex; flex-direction:column; align-items:center; gap:7px; flex:1; }
        .slbl { font-family:'Press Start 2P',monospace; font-size:5px; color:#5a4820; letter-spacing:2px; }
        .gate { background:#0e0a04; border:1.5px solid #2a2010; border-radius:12px; padding:10px; box-shadow:inset 0 2px 8px rgba(0,0,0,0.8); }
        .dpad { display:flex; flex-direction:column; align-items:center; gap:3px; }
        .row { display:flex; justify-content:center; }
        .mid { display:flex; gap:3px; align-items:center; }
        .cntr { width:26px; height:26px; flex-shrink:0; border-radius:50%; background:#0a0704; border:1px solid #1a1408; display:flex; align-items:center; justify-content:center; }
        .cdot { width:8px; height:8px; border-radius:50%; background:radial-gradient(circle,#3a2a14,#1a1008); border:1px solid #0a0806; }
        .div { display:flex; flex-direction:column; align-items:center; gap:7px; padding:0 4px; }
        .dl { width:2px; flex:1; min-height:18px; background:linear-gradient(180deg,transparent,#2a2010,transparent); }
        .coin { display:flex; flex-direction:column; align-items:center; gap:3px; }
        .slot { width:30px; height:5px; background:#080502; border-radius:3px; border:1px solid #1a1408; box-shadow:inset 0 2px 4px rgba(0,0,0,0.9); }
        .ct { font-family:'Press Start 2P',monospace; font-size:4px; color:#3a2a10; }
        .abtns { display:flex; gap:16px; align-items:center; }
        .mhint { font-family:'Press Start 2P',monospace; font-size:4px; color:#ffb000; letter-spacing:0.5px; text-align:center; animation:mh 1.2s ease-in-out infinite; }
        @keyframes mh{0%,100%{opacity:1}50%{opacity:0.4}}
        .pudots { display:flex; gap:4px; flex-wrap:wrap; justify-content:center; max-width:140px; }
        .pdot { font-size:14px; background:rgba(255,176,0,0.05); border:1px solid rgba(255,176,0,0.14); border-radius:4px; padding:3px 4px; }
        .nolo { font-family:'Press Start 2P',monospace; font-size:4px; color:#3a2a10; text-align:center; }
      `}</style>
    </div>
  )
}
