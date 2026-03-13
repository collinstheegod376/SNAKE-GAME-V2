'use client'
import { useState, useEffect } from 'react'
import { PowerupKey, PowerupData } from './SnakeGame'

interface Props {
  powerups: PowerupData[]
  onSelect: (key: PowerupKey) => void
  onCancel: () => void
}

const ICONS: Record<string, string> = {
  invisibility: '👻', rush: '⚡', ghost: '🌀',
  magnet: '🧲', freeze: '❄️', shield: '🛡️'
}
const COLORS: Record<string, string> = {
  invisibility: '#00e5ff', rush: '#ffb000', ghost: '#cc88ff',
  magnet: '#ff6644', freeze: '#88ccff', shield: '#88ff99'
}

export default function PowerupMenu({ powerups, onSelect, onCancel }: Props) {
  const [selected, setSelected] = useState(0)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault()
        setSelected(i => (i - 1 + powerups.length) % powerups.length)
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault()
        setSelected(i => (i + 1) % powerups.length)
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onSelect(powerups[selected].key)
      } else if (e.key === 'Escape') {
        onCancel()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selected, powerups, onSelect, onCancel])

  return (
    <div className="menu-overlay">
      <div className="menu-box">
        <div className="menu-title">SELECT POWER-UP</div>
        <div className="menu-sub">USE JOYSTICK TO NAVIGATE</div>
        <div className="menu-list">
          {powerups.map((p, i) => (
            <button
              key={p.key}
              className={`menu-item ${i === selected ? 'active' : ''}`}
              onClick={() => onSelect(p.key)}
              onMouseEnter={() => setSelected(i)}
              style={{ '--accent': COLORS[p.key] || '#ffb000' } as any}
            >
              <span className="item-icon">{ICONS[p.key] || '⚡'}</span>
              <div className="item-info">
                <div className="item-name">{p.name}</div>
                <div className="item-desc">{p.description || ''}</div>
              </div>
              {p.duration_ms && (
                <div className="item-dur">{p.duration_ms / 1000}s</div>
              )}
              {i === selected && <div className="item-cursor">▶</div>}
            </button>
          ))}
        </div>
        <button className="cancel-btn" onClick={onCancel}>✕ CANCEL / RESUME</button>
      </div>

      <style jsx>{`
        .menu-overlay {
          position: absolute;
          inset: 0;
          background: rgba(8,5,2,0.92);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 50;
          border-radius: 8px;
        }
        .menu-box {
          width: 340px;
          padding: 20px 16px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .menu-title {
          font-family: 'Press Start 2P', monospace;
          font-size: 10px;
          color: var(--amber);
          text-align: center;
          text-shadow: 0 0 16px rgba(255,176,0,0.5);
          letter-spacing: 2px;
        }
        .menu-sub {
          font-family: 'Share Tech Mono', monospace;
          font-size: 10px;
          color: #6a5020;
          text-align: center;
          letter-spacing: 1px;
        }
        .menu-list { display: flex; flex-direction: column; gap: 6px; }
        .menu-item {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(255,176,0,0.04);
          border: 1px solid rgba(255,176,0,0.12);
          border-radius: 6px;
          padding: 10px 12px;
          cursor: pointer;
          text-align: left;
          transition: all 0.12s;
          position: relative;
        }
        .menu-item.active {
          background: rgba(255,176,0,0.1);
          border-color: var(--accent, var(--amber));
          box-shadow: 0 0 12px rgba(255,176,0,0.15), inset 0 0 8px rgba(255,176,0,0.05);
        }
        .item-icon { font-size: 22px; flex-shrink: 0; line-height: 1; }
        .item-info { flex: 1; }
        .item-name {
          font-family: 'Press Start 2P', monospace;
          font-size: 6px;
          color: var(--amber);
          margin-bottom: 4px;
          letter-spacing: 0.5px;
        }
        .menu-item.active .item-name { color: var(--accent, var(--amber)); text-shadow: 0 0 8px var(--accent, var(--amber)); }
        .item-desc {
          font-family: 'Share Tech Mono', monospace;
          font-size: 10px;
          color: #7a6030;
          line-height: 1.3;
        }
        .item-dur {
          font-family: 'Press Start 2P', monospace;
          font-size: 6px;
          color: #6a5020;
          flex-shrink: 0;
        }
        .item-cursor {
          position: absolute;
          left: -12px;
          font-size: 8px;
          color: var(--amber);
          animation: blink 0.6s step-end infinite;
        }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        .cancel-btn {
          font-family: 'Press Start 2P', monospace;
          font-size: 5px;
          color: #6a5020;
          background: none;
          border: 1px solid rgba(255,176,0,0.12);
          border-radius: 4px;
          padding: 8px;
          cursor: pointer;
          text-align: center;
          transition: all 0.15s;
          letter-spacing: 1px;
        }
        .cancel-btn:hover { color: var(--amber); border-color: rgba(255,176,0,0.3); }
      `}</style>
    </div>
  )
}
