'use client'
import { useState, useEffect } from 'react'

interface Props {
  children: React.ReactNode
  score: number
  highScore: number
  username: string | null
  powerOn: boolean
}

export default function CRTMonitor({ children, score, highScore, username, powerOn }: Props) {
  const [flickerOpacity, setFlickerOpacity] = useState(1)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const id = setInterval(() => {
      if (Math.random() < 0.015) {
        setFlickerOpacity(0.88)
        setTimeout(() => setFlickerOpacity(1), 60)
      }
    }, 800)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    function updateScale() {
      const vw = window.innerWidth
      setScale(Math.min(1, (vw - 24) / 500))
    }
    updateScale()
    window.addEventListener('resize', updateScale)
    return () => window.removeEventListener('resize', updateScale)
  }, [])

  return (
    <div style={{ transform: `scale(${scale})`, transformOrigin: 'top center', width: 500, flexShrink: 0 }}>
      <div className="monitor-wrap">

        {/* Top brand bar */}
        <div className="monitor-top">
          <div className="brand-left">
            <span className="brand-name">ARCADE</span>
            <span className="brand-model">● CRT-9000</span>
          </div>
          <div className="brand-right">
            <div className={`power-led ${powerOn ? 'on' : ''}`} />
            <span className="power-label">{powerOn ? 'ON' : 'STDBY'}</span>
          </div>
        </div>

        {/* Monitor bezel */}
        <div className="monitor-bezel">
          {/* Vent slots */}
          <div className="vents">
            {Array.from({length: 14}).map((_,i) => <div key={i} className="vent" />)}
          </div>

          {/* Screen */}
          <div className="screen-housing">
            <div className="screen-glass" style={{ opacity: flickerOpacity }}>
              <div className="game-canvas">{children}</div>
              <div className="scanlines" />
              <div className="curvature" />
              <div className="reflection" />
              <div className="amber-glow-inner" />
            </div>
          </div>

          {/* HUD strip */}
          <div className="hud-strip">
            <div className="hud-block">
              <div className="hud-label">SCORE</div>
              <div className="hud-val">{String(score).padStart(6,'0')}</div>
            </div>
            <div className="hud-block center">
              <div className="hud-label">PLAYER</div>
              <div className="hud-val player">{username || '- - -'}</div>
            </div>
            <div className="hud-block right">
              <div className="hud-label">BEST</div>
              <div className="hud-val">{String(highScore).padStart(6,'0')}</div>
            </div>
          </div>

          {/* Bottom vents */}
          <div className="vents bottom">
            {Array.from({length: 14}).map((_,i) => <div key={i} className="vent" />)}
          </div>
        </div>

        {/* Neck + base */}
        <div className="neck" />
        <div className="base">
          <div className="base-inner">
            <div className="screw" /><div className="screw" /><div className="screw" />
          </div>
        </div>
      </div>

      <style jsx>{`
        .monitor-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          filter:
            drop-shadow(0 24px 48px rgba(255,176,0,0.12))
            drop-shadow(0 0 80px rgba(255,176,0,0.06));
        }
        .monitor-top {
          width: 500px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: linear-gradient(180deg, #3a2e1e 0%, #2a2014 100%);
          border: 1.5px solid #4a3820;
          border-bottom: none;
          border-radius: 10px 10px 0 0;
          padding: 6px 18px;
        }
        .brand-left { display: flex; align-items: center; gap: 10px; }
        .brand-name {
          font-family: 'Press Start 2P', monospace;
          font-size: 9px;
          color: var(--beige);
          letter-spacing: 4px;
          text-shadow: 0 1px 2px rgba(0,0,0,0.8);
        }
        .brand-model {
          font-family: 'Share Tech Mono', monospace;
          font-size: 10px;
          color: #6a5840;
          letter-spacing: 1px;
        }
        .brand-right { display: flex; align-items: center; gap: 6px; }
        .power-led {
          width: 7px; height: 7px; border-radius: 50%;
          background: #3a2a1a;
          border: 1px solid #2a1a0a;
        }
        .power-led.on {
          background: var(--amber);
          box-shadow: 0 0 6px var(--amber), 0 0 14px rgba(255,176,0,0.5);
          animation: ledBlink 2.5s ease-in-out infinite;
        }
        @keyframes ledBlink { 0%,100%{opacity:1} 50%{opacity:0.5} }
        .power-label {
          font-family: 'Share Tech Mono', monospace;
          font-size: 8px;
          color: #6a5840;
        }

        .monitor-bezel {
          width: 500px;
          background: linear-gradient(160deg, #3a2e1e 0%, #2a2014 40%, #1e180e 100%);
          border: 1.5px solid #4a3820;
          border-top: none;
          border-radius: 0 0 14px 14px;
          padding: 14px 18px 12px;
          box-shadow:
            inset 0 2px 8px rgba(0,0,0,0.6),
            inset 0 -4px 16px rgba(0,0,0,0.5),
            5px 5px 0 #0a0806,
            10px 10px 0 rgba(0,0,0,0.25),
            0 0 0 1px #0a0806;
          position: relative;
        }

        .vents {
          display: flex; gap: 6px; justify-content: center; padding: 4px 0;
          margin-bottom: 10px;
        }
        .vents.bottom { margin-bottom: 0; margin-top: 10px; }
        .vent {
          width: 24px; height: 4px;
          background: #0e0a04;
          border-radius: 2px;
          box-shadow: inset 0 1px 3px rgba(0,0,0,0.95), 0 1px 0 rgba(255,255,255,0.03);
        }

        .screen-housing {
          background: #080502;
          border-radius: 10px;
          padding: 4px;
          box-shadow:
            inset 0 0 40px rgba(0,0,0,0.95),
            inset 0 0 0 2px #0a0806,
            0 0 24px rgba(255,176,0,0.08);
        }

        .screen-glass {
          position: relative;
          width: 460px;
          height: 460px;
          border-radius: 8px;
          overflow: hidden;
          margin: 0 auto;
          transition: opacity 0.06s;
          /* Subtle screen curvature via border-radius */
          box-shadow: inset 0 0 60px rgba(0,0,0,0.4);
        }

        .game-canvas {
          position: absolute;
          inset: 0;
          border-radius: 8px;
          overflow: hidden;
        }

        .scanlines {
          position: absolute; inset: 0;
          background: repeating-linear-gradient(
            0deg, transparent, transparent 2px,
            rgba(0,0,0,0.18) 2px, rgba(0,0,0,0.18) 4px
          );
          pointer-events: none; border-radius: 8px; z-index: 10;
        }
        .curvature {
          position: absolute; inset: 0;
          background: radial-gradient(ellipse 88% 88% at 50% 50%, transparent 55%, rgba(0,0,0,0.55) 100%);
          pointer-events: none; border-radius: 8px; z-index: 11;
        }
        .reflection {
          position: absolute; inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.04) 0%, transparent 45%, rgba(255,255,255,0.01) 100%);
          pointer-events: none; border-radius: 8px; z-index: 12;
        }
        .amber-glow-inner {
          position: absolute; inset: -3px;
          box-shadow: inset 0 0 24px rgba(255,176,0,0.1), 0 0 40px rgba(255,176,0,0.06);
          border-radius: 10px; pointer-events: none; z-index: 13;
        }

        .hud-strip {
          display: flex;
          justify-content: space-between;
          padding: 7px 8px 4px;
          background: rgba(0,0,0,0.4);
          border-top: 1px solid rgba(255,176,0,0.12);
          margin-top: 2px;
        }
        .hud-block { display: flex; flex-direction: column; gap: 1px; }
        .hud-block.center { align-items: center; }
        .hud-block.right { align-items: flex-end; }
        .hud-label {
          font-family: 'Press Start 2P', monospace;
          font-size: 5px; color: #6a5020; letter-spacing: 1px;
        }
        .hud-val {
          font-family: 'Press Start 2P', monospace;
          font-size: 9px; color: var(--amber);
          text-shadow: 0 0 8px rgba(255,176,0,0.6);
          letter-spacing: 1px;
        }
        .hud-val.player {
          color: var(--amber-glow);
          font-size: 7px;
          text-shadow: 0 0 10px rgba(255,208,96,0.8);
          max-width: 150px;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }

        .neck {
          width: 70px; height: 26px;
          background: linear-gradient(180deg, #2a2014 0%, #1a1408 100%);
          border-left: 1.5px solid #3a2e1e;
          border-right: 1.5px solid #3a2e1e;
          clip-path: polygon(12% 0%, 88% 0%, 100% 100%, 0% 100%);
        }
        .base {
          width: 220px; height: 14px;
          background: linear-gradient(180deg, #2a2014 0%, #1a1408 100%);
          border-radius: 0 0 10px 10px;
          border: 1.5px solid #3a2e1e;
          border-top: none;
        }
        .base-inner {
          display: flex; justify-content: space-between;
          padding: 4px 20px; height: 100%; align-items: center;
        }
        .screw {
          width: 5px; height: 5px; border-radius: 50%;
          background: radial-gradient(circle, #4a3820, #1a1008);
          border: 1px solid #0a0806;
        }
      `}</style>
    </div>
  )
}
