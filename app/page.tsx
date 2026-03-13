'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import CRTMonitor from '@/components/CRTMonitor'
import SnakeGame, { PowerupKey } from '@/components/SnakeGame'
import ArcadeButtons from '@/components/ArcadeButtons'
import AuthModal from '@/components/AuthModal'

interface Player {
  id: string
  username: string
  highScore: number
  isAdmin: boolean
  powerups: { key: PowerupKey; name: string; icon: string; duration_ms: number | null }[]
}

interface LeaderEntry { username: string; high_score: number; games: number }

export default function Home() {
  const [player, setPlayer] = useState<Player | null>(null)
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(0)
  const [showAuth, setShowAuth] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [powerOn, setPowerOn] = useState(false)
  const [selectedPowerup, setSelectedPowerup] = useState<PowerupKey | null>(null)
  const [activePowerup, setActivePowerup] = useState<PowerupKey | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderEntry[]>([])
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [monitorHeight, setMonitorHeight] = useState(0)
  const monitorRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<{ restart: () => void; activatePowerup: (key: PowerupKey) => void } | null>(null)

  useEffect(() => {
    setTimeout(() => setPowerOn(true), 400)
    fetch('/api/auth/me').then(r => r.json()).then(data => {
      if (data.player) {
        setPlayer(data.player)
        setHighScore(data.player.highScore)
        if (data.player.powerups?.length) setSelectedPowerup(data.player.powerups[0].key)
      }
    })
    fetch('/api/scores').then(r => r.json()).then(data => {
      if (data.scores) setLeaderboard(data.scores)
    })
  }, [])

  // Track scaled monitor height so page doesn't collapse on mobile
  useEffect(() => {
    function measure() {
      if (!monitorRef.current) return
      const vw = window.innerWidth
      const sc = Math.min(1, (vw - 32) / 540)
      // Monitor body ≈ 620px natural height, buttons ≈ 130px
      setMonitorHeight((620 + 130) * sc)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  const handleScore = useCallback(async (newScore: number) => {
    setScore(newScore)
    if (newScore > highScore) setHighScore(newScore)
  }, [highScore])

  const handleGameOver = useCallback(async (finalScore: number) => {
    setIsPlaying(false)
    setActivePowerup(null)
    if (!player) return
    try {
      const res = await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score: finalScore, powerupUsed: activePowerup })
      })
      const data = await res.json()
      if (data.highScore > highScore) {
        setHighScore(data.highScore)
        setSaveMsg('🏆 NEW HIGH SCORE!')
      } else {
        setSaveMsg('✓ SCORE SAVED')
      }
      setTimeout(() => setSaveMsg(''), 3000)
      fetch('/api/scores').then(r => r.json()).then(d => { if (d.scores) setLeaderboard(d.scores) })
    } catch {}
  }, [player, activePowerup, highScore])

  const handleRestart = useCallback(() => {
    setScore(0)
    setActivePowerup(null)
    gameRef.current?.restart()
  }, [])

  const handleActivatePowerup = useCallback(() => {
    if (!selectedPowerup || activePowerup || !isPlaying) return
    setActivePowerup(selectedPowerup)
    gameRef.current?.activatePowerup(selectedPowerup)
  }, [selectedPowerup, activePowerup, isPlaying])

  const handleDirection = useCallback((dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
    const map: Record<string, string> = { UP: 'ArrowUp', DOWN: 'ArrowDown', LEFT: 'ArrowLeft', RIGHT: 'ArrowRight' }
    window.dispatchEvent(new KeyboardEvent('keydown', { key: map[dir], bubbles: true }))
  }, [])

  const handleLogout = async () => {
    await fetch('/api/auth/login', { method: 'DELETE' })
    setPlayer(null); setHighScore(0); setSelectedPowerup(null)
  }

  const handleAuth = (p: Player) => {
    setPlayer(p); setHighScore(p.highScore)
    if (p.powerups?.length) setSelectedPowerup(p.powerups[0].key)
  }

  return (
    <main className="desk-surface">
      <div className="noise-overlay" />

      {/* Top bar */}
      <div className="top-bar">
        <div className="top-left">
          <span className="game-title">SERPENT SX</span>
          <span className="version">v2.0</span>
        </div>
        <div className="top-right">
          {saveMsg && <span className="save-msg">{saveMsg}</span>}
          {player ? (
            <div className="player-bar">
              {player.isAdmin && <a href="/admin" className="admin-link">⚙</a>}
              <span className="player-chip">👤 {player.username}</span>
              <button className="text-btn" onClick={handleLogout}>OUT</button>
            </div>
          ) : (
            <button className="login-btn" onClick={() => setShowAuth(true)}>PLAY ▶</button>
          )}
        </div>
      </div>

      {/* Arcade machine wrapper — uses natural height so page scrolls properly on mobile */}
      <div ref={monitorRef} className="arcade-wrapper" style={{ height: monitorHeight || 'auto' }}>
        <div className="arcade-inner">
          <CRTMonitor score={score} highScore={highScore} username={player?.username || null} powerOn={powerOn}>
            <div className={powerOn ? 'power-on-anim' : ''} style={{ width: '100%', height: '100%' }}>
              <SnakeGame
                onScore={handleScore}
                onGameOver={handleGameOver}
                grantedPowerups={player?.powerups || []}
                activePowerup={activePowerup}
                onActivatePowerup={handleActivatePowerup}
                gameRef={gameRef}
                isPlaying={isPlaying}
                onStart={() => setIsPlaying(true)}
                highScore={highScore}
              />
            </div>
          </CRTMonitor>

          <ArcadeButtons
            onDirection={handleDirection}
            onRestart={handleRestart}
            onPowerup={handleActivatePowerup}
            grantedPowerups={player?.powerups || []}
            activePowerupKey={activePowerup}
            selectedPowerup={selectedPowerup}
            onSelectPowerup={setSelectedPowerup}
            isLoggedIn={!!player}
          />

          {/* Leaderboard toggle */}
          <button className="lb-toggle" onClick={() => setShowLeaderboard(v => !v)}>
            🏆
          </button>
        </div>
      </div>

      {/* Leaderboard */}
      {showLeaderboard && (
        <div className="lb-panel">
          <div className="lb-title">◆ TOP SCORES ◆</div>
          <table className="lb-table">
            <thead><tr><th>#</th><th>PLAYER</th><th>SCORE</th></tr></thead>
            <tbody>
              {leaderboard.map((e, i) => (
                <tr key={i} className={e.username === player?.username ? 'my-row' : ''}>
                  <td>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</td>
                  <td>{e.username}</td>
                  <td>{e.high_score}</td>
                </tr>
              ))}
              {leaderboard.length === 0 && <tr><td colSpan={3} className="empty-lb">NO SCORES YET</td></tr>}
            </tbody>
          </table>
          {!player && (
            <button className="lb-login-btn" onClick={() => { setShowLeaderboard(false); setShowAuth(true) }}>
              LOGIN TO SAVE SCORE
            </button>
          )}
          <button className="lb-close" onClick={() => setShowLeaderboard(false)}>✕ CLOSE</button>
        </div>
      )}

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} onAuth={handleAuth} />}

      <style jsx>{`
        .top-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
          max-width: 700px;
          margin-bottom: 20px;
          z-index: 2;
          position: relative;
          padding: 0 4px;
        }
        .top-left { display: flex; align-items: baseline; gap: 8px; }
        .game-title {
          font-family: 'Press Start 2P', monospace;
          font-size: clamp(10px, 3vw, 16px);
          color: #00ff41;
          text-shadow: 0 0 20px rgba(0,255,65,0.6), 0 0 40px rgba(0,255,65,0.3);
          animation: titlePulse 3s ease-in-out infinite;
        }
        @keyframes titlePulse {
          0%,100% { text-shadow: 0 0 20px rgba(0,255,65,0.6), 0 0 40px rgba(0,255,65,0.3); }
          50% { text-shadow: 0 0 30px rgba(0,255,65,0.9), 0 0 60px rgba(0,255,65,0.5); }
        }
        .version { font-family: 'Share Tech Mono', monospace; font-size: 10px; color: #3a5a3a; }
        .top-right { display: flex; align-items: center; gap: 8px; }
        .save-msg {
          font-family: 'Press Start 2P', monospace;
          font-size: clamp(5px, 1.5vw, 7px);
          color: #ffcc00;
          text-shadow: 0 0 8px rgba(255,200,0,0.5);
        }
        .player-bar { display: flex; align-items: center; gap: 8px; }
        .player-chip {
          font-family: 'Press Start 2P', monospace;
          font-size: clamp(5px, 1.5vw, 7px);
          color: #00ff41;
          background: rgba(0,255,65,0.08);
          border: 1px solid rgba(0,255,65,0.2);
          padding: 5px 8px;
          border-radius: 4px;
          max-width: 120px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .admin-link {
          font-family: 'Press Start 2P', monospace;
          font-size: 10px;
          color: #ffcc00;
          text-decoration: none;
          border: 1px solid rgba(255,200,0,0.3);
          padding: 5px 8px;
          border-radius: 4px;
          transition: all 0.15s;
        }
        .admin-link:hover { background: rgba(255,200,0,0.1); }
        .text-btn {
          font-family: 'Press Start 2P', monospace;
          font-size: clamp(5px, 1.5vw, 6px);
          color: #4a7a4a;
          background: none;
          border: none;
          cursor: pointer;
        }
        .text-btn:hover { color: #00ff41; }
        .login-btn {
          font-family: 'Press Start 2P', monospace;
          font-size: clamp(6px, 1.8vw, 8px);
          color: #00ff41;
          background: rgba(0,255,65,0.06);
          border: 1px solid rgba(0,255,65,0.3);
          padding: 8px 14px;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
        }
        .login-btn:hover { background: rgba(0,255,65,0.12); }

        /* Wrapper holds the natural scaled height so page doesn't collapse */
        .arcade-wrapper {
          width: 100%;
          max-width: 560px;
          position: relative;
          z-index: 1;
        }
        .arcade-inner {
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .lb-toggle {
          position: absolute;
          right: -8px;
          top: 40px;
          background: rgba(0,0,0,0.6);
          border: 1px solid rgba(0,255,65,0.2);
          border-radius: 0 6px 6px 0;
          padding: 8px;
          cursor: pointer;
          font-size: 18px;
          transition: all 0.15s;
          touch-action: manipulation;
        }
        .lb-toggle:hover { background: rgba(0,255,65,0.08); }

        .lb-panel {
          width: calc(100% - 32px);
          max-width: 320px;
          background: linear-gradient(160deg, #0a140a 0%, #060c06 100%);
          border: 1px solid rgba(0,255,65,0.25);
          border-radius: 8px;
          padding: 16px;
          margin-top: 16px;
          z-index: 50;
          box-shadow: 0 0 40px rgba(0,255,65,0.1);
          animation: fadeIn 0.2s ease;
        }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; } }
        .lb-title {
          font-family: 'Press Start 2P', monospace;
          font-size: 7px;
          color: #00ff41;
          text-align: center;
          margin-bottom: 12px;
          text-shadow: 0 0 10px rgba(0,255,65,0.4);
        }
        .lb-table { width: 100%; border-collapse: collapse; }
        .lb-table th {
          font-family: 'Press Start 2P', monospace;
          font-size: 5px;
          color: #4a7a4a;
          padding: 4px;
          border-bottom: 1px solid rgba(0,255,65,0.1);
          text-align: left;
        }
        .lb-table td {
          font-family: 'Share Tech Mono', monospace;
          font-size: 11px;
          color: #00cc33;
          padding: 5px 4px;
          border-bottom: 1px solid rgba(0,255,65,0.05);
        }
        .lb-table tr.my-row td { color: #39ff14; background: rgba(0,255,65,0.05); }
        .empty-lb { text-align: center; color: #4a7a4a; font-size: 10px; padding: 12px; }
        .lb-login-btn {
          width: 100%;
          margin-top: 10px;
          font-family: 'Press Start 2P', monospace;
          font-size: 5px;
          color: #00ff41;
          background: rgba(0,255,65,0.08);
          border: 1px solid rgba(0,255,65,0.2);
          padding: 10px;
          border-radius: 4px;
          cursor: pointer;
        }
        .lb-close {
          width: 100%;
          margin-top: 8px;
          font-family: 'Press Start 2P', monospace;
          font-size: 5px;
          color: #4a7a4a;
          background: none;
          border: 1px solid rgba(0,255,65,0.1);
          padding: 8px;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .lb-close:hover { color: #00ff41; border-color: rgba(0,255,65,0.3); }
      `}</style>
    </main>
  )
}
