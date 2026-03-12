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
  const gameRef = useRef<{ restart: () => void; activatePowerup: (key: PowerupKey) => void } | null>(null)

  useEffect(() => {
    // Power on effect
    setTimeout(() => setPowerOn(true), 400)
    
    // Load session
    fetch('/api/auth/me').then(r => r.json()).then(data => {
      if (data.player) {
        setPlayer(data.player)
        setHighScore(data.player.highScore)
        if (data.player.powerups?.length) setSelectedPowerup(data.player.powerups[0].key)
      }
    })

    // Load leaderboard
    fetch('/api/scores').then(r => r.json()).then(data => {
      if (data.scores) setLeaderboard(data.scores)
    })
  }, [])

  const handleScore = useCallback(async (newScore: number, powerupUsed: string | null) => {
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
        setTimeout(() => setSaveMsg(''), 3000)
      } else {
        setSaveMsg('✓ SCORE SAVED')
        setTimeout(() => setSaveMsg(''), 2000)
      }
      // Refresh leaderboard
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
    const dirMap: Record<string, string> = { UP: 'ArrowUp', DOWN: 'ArrowDown', LEFT: 'ArrowLeft', RIGHT: 'ArrowRight' }
    window.dispatchEvent(new KeyboardEvent('keydown', { key: dirMap[dir], bubbles: true }))
  }, [])

  const handleLogout = async () => {
    await fetch('/api/auth/login', { method: 'DELETE' })
    setPlayer(null)
    setHighScore(0)
    setSelectedPowerup(null)
  }

  const handleAuth = (p: Player) => {
    setPlayer(p)
    setHighScore(p.highScore)
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
              {player.isAdmin && (
                <a href="/admin" className="admin-link">⚙ ADMIN</a>
              )}
              <span className="player-chip">👤 {player.username}</span>
              <button className="text-btn" onClick={handleLogout}>LOGOUT</button>
            </div>
          ) : (
            <button className="login-btn" onClick={() => setShowAuth(true)}>INSERT COIN ▶</button>
          )}
        </div>
      </div>

      {/* Main arcade machine */}
      <div className="arcade-machine" style={{ zIndex: 1, position: 'relative' }}>
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

        {/* Side panel - leaderboard toggle */}
        <button className="lb-toggle" onClick={() => setShowLeaderboard(v => !v)}>
          <span>🏆</span>
          <span>TOP</span>
        </button>
      </div>

      {/* Leaderboard panel */}
      {showLeaderboard && (
        <div className="lb-panel">
          <div className="lb-title">◆ LEADERBOARD ◆</div>
          <table className="lb-table">
            <thead>
              <tr><th>#</th><th>PLAYER</th><th>SCORE</th></tr>
            </thead>
            <tbody>
              {leaderboard.map((e, i) => (
                <tr key={i} className={e.username === player?.username ? 'my-row' : ''}>
                  <td>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</td>
                  <td>{e.username}</td>
                  <td>{e.high_score}</td>
                </tr>
              ))}
              {leaderboard.length === 0 && <tr><td colSpan={3} style={{ textAlign: 'center', color: '#4a7a4a' }}>NO SCORES YET</td></tr>}
            </tbody>
          </table>
          {!player && (
            <button className="lb-login-btn" onClick={() => { setShowLeaderboard(false); setShowAuth(true) }}>
              LOGIN TO SAVE SCORE
            </button>
          )}
        </div>
      )}

      {/* Power-up legend (only when logged in) */}
      {player && player.powerups.length > 0 && (
        <div className="powerup-legend">
          <div className="legend-title">GRANTED POWER-UPS</div>
          <div className="legend-items">
            {player.powerups.map(p => (
              <div key={p.key} className={`legend-item ${selectedPowerup === p.key ? 'selected' : ''}`} onClick={() => setSelectedPowerup(p.key)}>
                <span className="legend-icon">{p.icon}</span>
                <div>
                  <div className="legend-name">{p.name}</div>
                  {p.duration_ms && <div className="legend-dur">{p.duration_ms / 1000}s</div>}
                </div>
              </div>
            ))}
          </div>
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
          margin-bottom: 24px;
          z-index: 2;
          position: relative;
        }
        .top-left { display: flex; align-items: baseline; gap: 8px; }
        .game-title {
          font-family: 'Press Start 2P', monospace;
          font-size: 16px;
          color: #00ff41;
          text-shadow: 0 0 20px rgba(0,255,65,0.6), 0 0 40px rgba(0,255,65,0.3);
          animation: titlePulse 3s ease-in-out infinite;
        }
        @keyframes titlePulse {
          0%, 100% { text-shadow: 0 0 20px rgba(0,255,65,0.6), 0 0 40px rgba(0,255,65,0.3); }
          50% { text-shadow: 0 0 30px rgba(0,255,65,0.9), 0 0 60px rgba(0,255,65,0.5); }
        }
        .version {
          font-family: 'Share Tech Mono', monospace;
          font-size: 10px;
          color: #3a5a3a;
        }
        .top-right { display: flex; align-items: center; gap: 12px; }
        .save-msg {
          font-family: 'Press Start 2P', monospace;
          font-size: 7px;
          color: #ffcc00;
          text-shadow: 0 0 8px rgba(255,200,0,0.5);
          animation: fadeIn 0.3s ease;
        }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; } }
        .player-bar { display: flex; align-items: center; gap: 10px; }
        .player-chip {
          font-family: 'Press Start 2P', monospace;
          font-size: 7px;
          color: #00ff41;
          background: rgba(0,255,65,0.08);
          border: 1px solid rgba(0,255,65,0.2);
          padding: 6px 10px;
          border-radius: 4px;
        }
        .admin-link {
          font-family: 'Press Start 2P', monospace;
          font-size: 6px;
          color: #ffcc00;
          text-decoration: none;
          border: 1px solid rgba(255,200,0,0.3);
          padding: 6px 8px;
          border-radius: 4px;
          transition: all 0.15s;
        }
        .admin-link:hover { background: rgba(255,200,0,0.1); border-color: #ffcc00; }
        .text-btn {
          font-family: 'Press Start 2P', monospace;
          font-size: 6px;
          color: #4a7a4a;
          background: none;
          border: none;
          cursor: pointer;
          transition: color 0.15s;
        }
        .text-btn:hover { color: #00ff41; }
        .login-btn {
          font-family: 'Press Start 2P', monospace;
          font-size: 7px;
          color: #00ff41;
          background: rgba(0,255,65,0.06);
          border: 1px solid rgba(0,255,65,0.3);
          padding: 10px 16px;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.15s;
          animation: loginPulse 2s ease-in-out infinite;
        }
        @keyframes loginPulse {
          0%, 100% { box-shadow: 0 0 0 rgba(0,255,65,0); }
          50% { box-shadow: 0 0 16px rgba(0,255,65,0.2); }
        }
        .login-btn:hover { background: rgba(0,255,65,0.12); box-shadow: 0 0 20px rgba(0,255,65,0.2); }
        .arcade-machine { position: relative; }
        .lb-toggle {
          position: absolute;
          right: -48px;
          top: 40px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          background: rgba(0,0,0,0.6);
          border: 1px solid rgba(0,255,65,0.2);
          border-radius: 0 6px 6px 0;
          padding: 10px 8px;
          cursor: pointer;
          color: #00ff41;
          font-family: 'Press Start 2P', monospace;
          font-size: 5px;
          transition: all 0.15s;
        }
        .lb-toggle:hover { background: rgba(0,255,65,0.08); border-color: rgba(0,255,65,0.4); }
        .lb-toggle span:first-child { font-size: 14px; }
        .lb-panel {
          position: fixed;
          right: 20px;
          top: 50%;
          transform: translateY(-50%);
          background: linear-gradient(160deg, #0a140a 0%, #060c06 100%);
          border: 1px solid rgba(0,255,65,0.25);
          border-radius: 8px;
          padding: 20px;
          width: 220px;
          z-index: 50;
          box-shadow: 0 0 40px rgba(0,255,65,0.1);
          animation: fadeIn 0.2s ease;
        }
        .lb-title {
          font-family: 'Press Start 2P', monospace;
          font-size: 7px;
          color: #00ff41;
          text-align: center;
          margin-bottom: 14px;
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
        .lb-login-btn {
          width: 100%;
          margin-top: 12px;
          font-family: 'Press Start 2P', monospace;
          font-size: 5px;
          color: #00ff41;
          background: rgba(0,255,65,0.08);
          border: 1px solid rgba(0,255,65,0.2);
          padding: 10px;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .lb-login-btn:hover { background: rgba(0,255,65,0.14); }
        .powerup-legend {
          margin-top: 20px;
          z-index: 1;
          position: relative;
        }
        .legend-title {
          font-family: 'Press Start 2P', monospace;
          font-size: 6px;
          color: #4a7a4a;
          text-align: center;
          margin-bottom: 8px;
          letter-spacing: 2px;
        }
        .legend-items { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
        .legend-item {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(0,0,0,0.3);
          border: 1px solid rgba(0,255,65,0.1);
          border-radius: 6px;
          padding: 6px 10px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .legend-item.selected {
          border-color: rgba(0,255,65,0.4);
          background: rgba(0,255,65,0.06);
          box-shadow: 0 0 10px rgba(0,255,65,0.1);
        }
        .legend-item:hover:not(.selected) { border-color: rgba(0,255,65,0.2); }
        .legend-icon { font-size: 18px; }
        .legend-name {
          font-family: 'Press Start 2P', monospace;
          font-size: 5px;
          color: #00cc33;
        }
        .legend-dur {
          font-family: 'Share Tech Mono', monospace;
          font-size: 9px;
          color: #3a6a3a;
          margin-top: 2px;
        }
      `}</style>
    </main>
  )
}
