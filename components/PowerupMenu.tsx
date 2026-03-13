'use client'
import { useState, useEffect, useCallback } from 'react'
import { PowerupKey, PowerupData } from './SnakeGame'

interface Props {
  powerups: PowerupData[]
  onSelect:  (key: PowerupKey) => void
  onCancel:  () => void
}

const ICONS: Record<string,string> = { invisibility:'👻',rush:'⚡',ghost:'🌀',magnet:'🧲',freeze:'❄️',shield:'🛡️' }
const COLORS: Record<string,string> = { invisibility:'#00e5ff',rush:'#ffb000',ghost:'#cc88ff',magnet:'#ff6644',freeze:'#88ccff',shield:'#88ff99' }
const DESCS:  Record<string,string> = {
  invisibility: 'No self-collision for 5s',
  rush:         '2× speed & 2× score for 8s',
  ghost:        'Pass through walls for 5s',
  magnet:       'Food moves toward you for 6s',
  freeze:       'Pause your movement for 3s',
  shield:       'Block one fatal collision',
}

export default function PowerupMenu({ powerups, onSelect, onCancel }: Props) {
  const [idx, setIdx] = useState(0)

  const up      = useCallback(() => setIdx(i => (i - 1 + powerups.length) % powerups.length), [powerups.length])
  const down    = useCallback(() => setIdx(i => (i + 1) % powerups.length),                   [powerups.length])
  const confirm = useCallback(() => { if (powerups[idx]) onSelect(powerups[idx].key) }, [idx, powerups, onSelect])

  // Keyboard: use capture phase so this fires BEFORE SnakeGame's keydown handler
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key==='ArrowUp'  || e.key==='w') { e.preventDefault(); e.stopImmediatePropagation(); up() }
      else if (e.key==='ArrowDown' || e.key==='s') { e.preventDefault(); e.stopImmediatePropagation(); down() }
      else if (e.key==='Enter'  || e.key===' ')   { e.preventDefault(); e.stopImmediatePropagation(); confirm() }
      else if (e.key==='Escape')                   { e.preventDefault(); e.stopImmediatePropagation(); onCancel() }
    }
    window.addEventListener('keydown', h, true)
    return () => window.removeEventListener('keydown', h, true)
  }, [up, down, confirm, onCancel])

  // Joystick custom events dispatched by ArcadeController when menu is open
  useEffect(() => {
    const U = () => up(); const D = () => down(); const C = () => confirm()
    window.addEventListener('menu:up',      U)
    window.addEventListener('menu:down',    D)
    window.addEventListener('menu:confirm', C)
    return () => {
      window.removeEventListener('menu:up',      U)
      window.removeEventListener('menu:down',    D)
      window.removeEventListener('menu:confirm', C)
    }
  }, [up, down, confirm])

  return (
    <div className="overlay">
      <div className="box">
        <div className="title">SELECT POWER-UP</div>
        <div className="sub">JOYSTICK ↑↓  •  START = ACTIVATE</div>

        <div className="list">
          {powerups.map((p, i) => (
            <button
              key={p.key}
              className={`item ${i===idx?'sel':''}`}
              onClick={() => onSelect(p.key)}
              onMouseEnter={() => setIdx(i)}
              style={{'--c': COLORS[p.key]||'#ffb000'} as React.CSSProperties}
            >
              {i===idx && <span className="cur">▶</span>}
              <span className="ico">{ICONS[p.key]||'⚡'}</span>
              <div className="info">
                <div className="nm">{p.name}</div>
                <div className="ds">{DESCS[p.key]||p.description||''}</div>
              </div>
              {p.duration_ms && <div className="dr">{p.duration_ms/1000}s</div>}
            </button>
          ))}
        </div>

        <button className="cancel" onClick={onCancel}>✕  CANCEL — RESUME GAME</button>
      </div>

      <style jsx>{`
        .overlay {
          position:absolute; inset:0; z-index:80;
          background:rgba(8,5,2,0.93); border-radius:8px;
          display:flex; align-items:center; justify-content:center;
        }
        .box { width:340px; padding:20px 16px; display:flex; flex-direction:column; gap:10px; }
        .title { font-family:'Press Start 2P',monospace; font-size:10px; color:#ffb000; text-align:center; text-shadow:0 0 16px rgba(255,176,0,0.5); letter-spacing:1px; }
        .sub   { font-family:'Share Tech Mono',monospace; font-size:10px; color:#6a5020; text-align:center; letter-spacing:1px; }
        .list  { display:flex; flex-direction:column; gap:5px; }
        .item {
          display:flex; align-items:center; gap:10px; position:relative;
          background:rgba(255,176,0,0.03); border:1px solid rgba(255,176,0,0.1);
          border-radius:6px; padding:10px 12px; cursor:pointer; text-align:left; width:100%;
          transition:all 0.1s;
        }
        .item.sel { background:rgba(255,176,0,0.1); border-color:var(--c); box-shadow:0 0 12px rgba(255,176,0,0.12); }
        .cur { position:absolute; left:-10px; font-size:8px; color:#ffb000; animation:bl 0.55s step-end infinite; }
        @keyframes bl{0%,100%{opacity:1}50%{opacity:0}}
        .ico  { font-size:22px; flex-shrink:0; line-height:1; }
        .info { flex:1; }
        .nm   { font-family:'Press Start 2P',monospace; font-size:6px; color:#ffb000; margin-bottom:4px; letter-spacing:0.5px; }
        .item.sel .nm { color:var(--c); text-shadow:0 0 8px var(--c); }
        .ds   { font-family:'Share Tech Mono',monospace; font-size:10px; color:#7a6030; }
        .dr   { font-family:'Press Start 2P',monospace; font-size:6px; color:#5a4020; flex-shrink:0; }
        .cancel { font-family:'Press Start 2P',monospace; font-size:5px; color:#6a5020; background:none; border:1px solid rgba(255,176,0,0.1); border-radius:4px; padding:9px; cursor:pointer; transition:all 0.15s; letter-spacing:0.5px; width:100%; }
        .cancel:hover { color:#ffb000; border-color:rgba(255,176,0,0.3); }
      `}</style>
    </div>
  )
}
