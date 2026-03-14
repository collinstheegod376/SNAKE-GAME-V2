'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { PowerupKey, PowerupData } from './SnakeGame'

interface Props {
  powerups: PowerupData[]
  onSelect: (key: PowerupKey) => void
  onCancel: () => void
}

const ICONS: Record<string,string>  = { invisibility:'👻', rush:'⚡', ghost:'🌀', magnet:'🧲', freeze:'❄️', shield:'🛡️' }
const COLORS: Record<string,string> = { invisibility:'#00e5ff', rush:'#ffb000', ghost:'#cc88ff', magnet:'#ff6644', freeze:'#88ccff', shield:'#88ff99' }
const DESCS: Record<string,string>  = {
  invisibility: 'No self-collision · 5 seconds',
  rush:         '2× speed & score · 8 seconds',
  ghost:        'Pass through walls · 5 seconds',
  magnet:       'Food pulls toward you · 6 seconds',
  freeze:       'Freeze movement · 3 seconds',
  shield:       'Block one fatal hit',
}

export default function PowerupMenu({ powerups, onSelect, onCancel }: Props) {
  const [idx, setIdx] = useState(0)

  // Prevent double-activation (touchstart + click, or two rapid events)
  const selectedRef = useRef(false)

  const safeSelect = useCallback((key: PowerupKey) => {
    if (selectedRef.current) return
    selectedRef.current = true
    onSelect(key)
  }, [onSelect])

  const up      = useCallback(() => setIdx(i => (i - 1 + powerups.length) % powerups.length), [powerups.length])
  const down    = useCallback(() => setIdx(i => (i + 1) % powerups.length),                   [powerups.length])
  const confirm = useCallback(() => { if (powerups[idx]) safeSelect(powerups[idx].key) }, [idx, powerups, safeSelect])

  // Keyboard — capture phase fires BEFORE SnakeGame's keydown handler
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if      (e.key === 'ArrowUp'   || e.key === 'w') { e.preventDefault(); e.stopImmediatePropagation(); up() }
      else if (e.key === 'ArrowDown' || e.key === 's') { e.preventDefault(); e.stopImmediatePropagation(); down() }
      else if (e.key === 'Enter'     || e.key === ' ') { e.preventDefault(); e.stopImmediatePropagation(); confirm() }
      else if (e.key === 'Escape')                      { e.preventDefault(); e.stopImmediatePropagation(); onCancel() }
    }
    window.addEventListener('keydown', h, true)
    return () => window.removeEventListener('keydown', h, true)
  }, [up, down, confirm, onCancel])

  // Joystick custom events from ArcadeController
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
        <div className="title">⚡ SELECT POWER-UP</div>
        <div className="subtitle">JOYSTICK ↑ ↓  •  START = ACTIVATE</div>

        <div className="list">
          {powerups.map((p, i) => (
            <button
              key={`${p.key}-${i}`}
              className={`item ${i === idx ? 'sel' : ''}`}
              onMouseEnter={() => setIdx(i)}
              /* Touch: prevent ghost click from also firing */
              onTouchStart={e => { e.preventDefault(); setIdx(i) }}
              onTouchEnd={e => { e.preventDefault(); safeSelect(p.key) }}
              onClick={() => safeSelect(p.key)}
              style={{ '--c': COLORS[p.key] || '#ffb000' } as React.CSSProperties}
            >
              {i === idx && <span className="cursor">▶</span>}
              <span className="ico">{ICONS[p.key] || '⚡'}</span>
              <div className="info">
                <div className="name">{p.name}</div>
                <div className="desc">{DESCS[p.key] || p.description || ''}</div>
              </div>
              {p.duration_ms && <div className="dur">{p.duration_ms / 1000}s</div>}
            </button>
          ))}
        </div>

        <button className="cancel"
          onTouchStart={e => { e.preventDefault() }}
          onTouchEnd={e => { e.preventDefault(); onCancel() }}
          onClick={onCancel}
        >
          ✕ CANCEL — RESUME GAME
        </button>
      </div>

      <style jsx>{`
        .overlay {
          position: absolute; inset: 0; z-index: 80;
          background: rgba(8,5,2,0.94);
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          animation: fadeIn 0.18s ease;
        }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        .box {
          width: 340px; padding: 20px 16px;
          display: flex; flex-direction: column; gap: 10px;
        }
        .title {
          font-family: 'Press Start 2P', monospace; font-size: 10px;
          color: #ffb000; text-align: center;
          text-shadow: 0 0 16px rgba(255,176,0,0.55); letter-spacing: 1px;
        }
        .subtitle {
          font-family: 'Share Tech Mono', monospace; font-size: 10px;
          color: #6a5020; text-align: center; letter-spacing: 1px;
        }
        .list { display: flex; flex-direction: column; gap: 6px; }
        .item {
          position: relative;
          display: flex; align-items: center; gap: 10px;
          background: rgba(255,176,0,0.03);
          border: 1px solid rgba(255,176,0,0.1);
          border-radius: 7px; padding: 11px 12px;
          cursor: pointer; text-align: left; width: 100%;
          transition: background 0.1s, border-color 0.1s, box-shadow 0.1s;
          touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
        }
        .item.sel {
          background: rgba(255,176,0,0.1);
          border-color: var(--c);
          box-shadow: 0 0 14px rgba(255,176,0,0.14), inset 0 0 6px rgba(255,176,0,0.04);
        }
        .cursor {
          position: absolute; left: -10px;
          font-size: 8px; color: #ffb000;
          animation: blink 0.55s step-end infinite;
        }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        .ico   { font-size: 22px; flex-shrink: 0; line-height: 1; }
        .info  { flex: 1; }
        .name  {
          font-family: 'Press Start 2P', monospace; font-size: 6px;
          color: #ffb000; margin-bottom: 4px; letter-spacing: 0.5px;
        }
        .item.sel .name { color: var(--c); text-shadow: 0 0 8px var(--c); }
        .desc  { font-family: 'Share Tech Mono', monospace; font-size: 10px; color: #7a6030; line-height: 1.3; }
        .dur   { font-family: 'Press Start 2P', monospace; font-size: 6px; color: #5a4020; flex-shrink: 0; }
        .cancel {
          font-family: 'Press Start 2P', monospace; font-size: 5px;
          color: #6a5020; background: none;
          border: 1px solid rgba(255,176,0,0.1);
          border-radius: 5px; padding: 10px; cursor: pointer;
          transition: all 0.15s; letter-spacing: 0.5px; width: 100%;
          touch-action: manipulation; -webkit-tap-highlight-color: transparent;
        }
        .cancel:hover { color: #ffb000; border-color: rgba(255,176,0,0.3); }
      `}</style>
    </div>
  )
}
