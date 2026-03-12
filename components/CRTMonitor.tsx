'use client'
import { useRef, useEffect, useState } from 'react'

interface Props {
  children: React.ReactNode
  score: number
  highScore: number
  username: string | null
  powerOn: boolean
}

export default function CRTMonitor({ children, score, highScore, username, powerOn }: Props) {
  const [flickerOpacity, setFlickerOpacity] = useState(1)

  useEffect(() => {
    const id = setInterval(() => {
      if (Math.random() < 0.02) {
        setFlickerOpacity(0.92)
        setTimeout(() => setFlickerOpacity(1), 50)
      }
    }, 500)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="crt-scene">
      {/* Monitor outer casing */}
      <div className="monitor-body">
        {/* Brand plate */}
        <div className="brand-plate">
          <span className="brand-text">ARCADE</span>
          <span className="brand-model">SX-4000</span>
        </div>

        {/* Bezel */}
        <div className="monitor-bezel">
          {/* Vent slots top */}
          <div className="vent-row top-vents">
            {Array.from({ length: 12 }).map((_, i) => <div key={i} className="vent-slot" />)}
          </div>

          {/* Screen area */}
          <div className="screen-frame">
            {/* CRT curved glass effect */}
            <div className="crt-glass" style={{ opacity: flickerOpacity }}>
              {/* Actual game screen */}
              <div className="game-screen">
                {children}
              </div>
              {/* Scanlines overlay */}
              <div className="scanlines" />
              {/* CRT curvature vignette */}
              <div className="crt-vignette" />
              {/* Glass reflection */}
              <div className="glass-reflection" />
              {/* Phosphor glow */}
              <div className="phosphor-glow" />
            </div>

            {/* HUD bar below screen */}
            <div className="screen-hud">
              <div className="hud-item">
                <span className="hud-label">SCORE</span>
                <span className="hud-value">{String(score).padStart(6, '0')}</span>
              </div>
              <div className="hud-item center">
                <span className="hud-label">PLAYER</span>
                <span className="hud-value player-name">{username || '---'}</span>
              </div>
              <div className="hud-item right">
                <span className="hud-label">BEST</span>
                <span className="hud-value">{String(highScore).padStart(6, '0')}</span>
              </div>
            </div>
          </div>

          {/* Vent slots bottom */}
          <div className="vent-row bottom-vents">
            {Array.from({ length: 12 }).map((_, i) => <div key={i} className="vent-slot" />)}
          </div>

          {/* Power indicator */}
          <div className={`power-led ${powerOn ? 'on' : 'off'}`}>
            <div className="led-dot" />
            <span className="led-label">{powerOn ? 'ON' : 'OFF'}</span>
          </div>
        </div>

        {/* Monitor stand/neck */}
        <div className="monitor-neck">
          <div className="neck-detail" />
        </div>

        {/* Monitor base */}
        <div className="monitor-base">
          <div className="base-plate">
            <div className="base-screw" />
            <div className="base-screw" />
          </div>
        </div>
      </div>

      <style jsx>{`
        .crt-scene {
          display: flex;
          flex-direction: column;
          align-items: center;
          filter: drop-shadow(0 30px 60px rgba(0,255,65,0.15)) drop-shadow(0 0 80px rgba(0,255,65,0.08));
        }

        .monitor-body {
          display: flex;
          flex-direction: column;
          align-items: center;
          transform: perspective(1200px) rotateX(3deg);
          transform-style: preserve-3d;
        }

        .brand-plate {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 540px;
          padding: 6px 20px;
          background: linear-gradient(180deg, #2a2a22 0%, #1a1a14 100%);
          border-radius: 4px 4px 0 0;
          border: 1px solid #3a3a2a;
          border-bottom: none;
        }
        .brand-text {
          font-family: 'Press Start 2P', monospace;
          font-size: 8px;
          color: #c8b89a;
          letter-spacing: 4px;
          text-shadow: 0 1px 2px rgba(0,0,0,0.8);
        }
        .brand-model {
          font-family: 'Share Tech Mono', monospace;
          font-size: 9px;
          color: #7a7060;
          letter-spacing: 2px;
        }

        .monitor-bezel {
          width: 540px;
          background: linear-gradient(160deg, #2e2e24 0%, #1e1e16 40%, #161610 100%);
          border: 2px solid #3a3a2a;
          border-radius: 0 0 12px 12px;
          padding: 16px 20px 12px;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.06),
            inset 0 -4px 12px rgba(0,0,0,0.6),
            4px 4px 0 #0a0a06,
            8px 8px 0 rgba(0,0,0,0.3),
            0 0 0 1px #0a0a06;
          position: relative;
          transform-style: preserve-3d;
        }

        .vent-row {
          display: flex;
          gap: 6px;
          justify-content: center;
          padding: 4px 0;
        }
        .top-vents { margin-bottom: 8px; }
        .bottom-vents { margin-top: 8px; }
        .vent-slot {
          width: 30px;
          height: 4px;
          background: #0a0a06;
          border-radius: 2px;
          box-shadow: inset 0 1px 2px rgba(0,0,0,0.9), 0 1px 0 rgba(255,255,255,0.04);
        }

        .screen-frame {
          position: relative;
          background: #050805;
          border-radius: 8px;
          padding: 3px;
          box-shadow:
            inset 0 0 30px rgba(0,0,0,0.9),
            inset 0 0 0 2px #0a0a06,
            0 0 20px rgba(0,255,65,0.1);
        }

        .crt-glass {
          position: relative;
          width: 400px;
          height: 400px;
          border-radius: 6px;
          overflow: hidden;
          transition: opacity 0.05s;
        }

        .game-screen {
          position: absolute;
          inset: 0;
          border-radius: 6px;
          overflow: hidden;
        }

        .scanlines {
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0,0,0,0.15) 2px,
            rgba(0,0,0,0.15) 4px
          );
          pointer-events: none;
          border-radius: 6px;
          z-index: 10;
        }

        .crt-vignette {
          position: absolute;
          inset: 0;
          background: radial-gradient(
            ellipse 90% 90% at 50% 50%,
            transparent 60%,
            rgba(0,0,0,0.5) 100%
          );
          pointer-events: none;
          border-radius: 6px;
          z-index: 11;
        }

        .glass-reflection {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            135deg,
            rgba(255,255,255,0.03) 0%,
            transparent 50%,
            rgba(255,255,255,0.01) 100%
          );
          pointer-events: none;
          border-radius: 6px;
          z-index: 12;
        }

        .phosphor-glow {
          position: absolute;
          inset: -2px;
          box-shadow: inset 0 0 20px rgba(0,255,65,0.12), 0 0 30px rgba(0,255,65,0.08);
          border-radius: 8px;
          pointer-events: none;
          z-index: 13;
        }

        .screen-hud {
          display: flex;
          justify-content: space-between;
          padding: 6px 8px 4px;
          background: rgba(0,0,0,0.3);
          border-top: 1px solid rgba(0,255,65,0.1);
        }
        .hud-item {
          display: flex;
          flex-direction: column;
          gap: 1px;
        }
        .hud-item.center { align-items: center; }
        .hud-item.right { align-items: flex-end; }
        .hud-label {
          font-family: 'Press Start 2P', monospace;
          font-size: 5px;
          color: #4a8a4a;
          letter-spacing: 1px;
        }
        .hud-value {
          font-family: 'Press Start 2P', monospace;
          font-size: 8px;
          color: #00ff41;
          text-shadow: 0 0 8px rgba(0,255,65,0.6);
          letter-spacing: 1px;
        }
        .player-name {
          color: #39ff14;
          font-size: 7px;
          text-shadow: 0 0 10px rgba(57,255,20,0.8);
          max-width: 140px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .power-led {
          position: absolute;
          bottom: 16px;
          right: 16px;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .led-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }
        .power-led.on .led-dot {
          background: #00ff41;
          box-shadow: 0 0 6px #00ff41, 0 0 12px rgba(0,255,65,0.5);
          animation: ledPulse 2s ease-in-out infinite;
        }
        .power-led.off .led-dot {
          background: #2a2a2a;
        }
        .led-label {
          font-family: 'Share Tech Mono', monospace;
          font-size: 7px;
          color: #5a5a4a;
        }
        @keyframes ledPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }

        .monitor-neck {
          width: 80px;
          height: 30px;
          background: linear-gradient(180deg, #1e1e16 0%, #161610 100%);
          border-left: 2px solid #2a2a20;
          border-right: 2px solid #2a2a20;
          position: relative;
          clip-path: polygon(10% 0%, 90% 0%, 100% 100%, 0% 100%);
          box-shadow: 2px 0 0 #0a0a06, -2px 0 0 #0a0a06;
        }
        .neck-detail {
          position: absolute;
          top: 8px;
          left: 50%;
          transform: translateX(-50%);
          width: 30px;
          height: 2px;
          background: #0a0a06;
          border-radius: 1px;
        }

        .monitor-base {
          width: 200px;
          height: 12px;
          background: linear-gradient(180deg, #1e1e16 0%, #141410 100%);
          border-radius: 0 0 8px 8px;
          border: 1px solid #2a2a20;
          border-top: none;
        }
        .base-plate {
          display: flex;
          justify-content: space-between;
          padding: 4px 16px;
          align-items: center;
          height: 100%;
        }
        .base-screw {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: radial-gradient(circle, #3a3a2a, #1a1a12);
          border: 1px solid #0a0a06;
        }
      `}</style>
    </div>
  )
}
