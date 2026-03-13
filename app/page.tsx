'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import CRTMonitor from '@/components/CRTMonitor'
import SnakeGame, { PowerupKey, PowerupData, GameAPI } from '@/components/SnakeGame'
import ArcadeController from '@/components/ArcadeController'
import PowerupMenu from '@/components/PowerupMenu'
import AuthModal from '@/components/AuthModal'

interface Player {
  id: string; username: string; highScore: number
  isAdmin: boolean
  powerups: PowerupData[]
}

interface LeaderEntry { username: string; high_score: number; games: number }

export default function Home() {
  const [player, setPlayer] = useState<Player | null>(null)
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(0)
  const [showAuth, setShowAuth] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [powerOn, setPowerOn] = useState(false)
  const [activePowerup, setActivePowerup] = useState<PowerupKey | null>(null)
  const [showPowerupMenu, setShowPowerupMenu] = useState(false)
  const [leaderboard, setLeaderboard] = useState<LeaderEntry[]>([])
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [scale, setScale] = useState(1)
  const [arcadeHeight, setArcadeHeight] = useState(0)
  const gameRef = useRef<GameAPI | null>(null)

  useEffect(() => {
    setTimeout(() => setPowerOn(true), 500)
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (d.player) { setPlayer(d.player); setHighScore(d.player.highScore) }
    })
    fetch('/api/scores').then(r => r.json()).then(d => { if (d.scores) setLeaderboard(d.scores) })
  }, [])

  useEffect(() => {
    function update() {
      const sc = Math.min(1, (window.innerWidth - 24) / 500)
      setScale(sc)
      // Monitor ≈ 640px + controller ≈ 140px
      setArcadeHeight((640 + 140) * sc)
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const handleScore = useCallback((newScore: number) => {
    setScore(newScore)
    if (newScore > highScore) setHighScore(newScore)
  }, [highScore])

  const handleGameOver = useCallback(async (finalScore: number) => {
    setIsPlaying(false); setActivePowerup(null); setShowPowerupMenu(false)
    if (!player) return
    try {
      const res = await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score: finalScore, powerupUsed: activePowerup })
      })
      const data = await res.json()
      if (data.highScore > highScore) {
        setHighScore(data.highScore); setSaveMsg('🏆 NEW HIGH SCORE!')
      } else { setSaveMsg('✓ SCORE SAVED') }
      setTimeout(() => setSaveMsg(''), 3000)
      fetch('/api/scores').then(r => r.json()).then(d => { if (d.scores) setLeaderboard(d.scores) })
    } catch {}
  }, [player, activePowerup, highScore])

  const handleRestart = useCallback(() => {
    setScore(0); setActivePowerup(null); setShowPowerupMenu(false)
    gameRef.current?.restart()
  }, [])

  const handleOpenPowerupMenu = useCallback(() => {
    if (!isPlaying || activePowerup) return
    // Pause the game by setting paused flag via a direct state check
    setShowPowerupMenu(true)
    // Pause movement — we do this by temporarily overriding the state
    if (gameRef.current) {
      const state = gameRef.current.getState()
      if (!state.running || state.dead) return
    }
  }, [isPlaying, activePowerup])

  const handleSelectPowerup = useCallback((key: PowerupKey) => {
    setShowPowerupMenu(false)
    setActivePowerup(key)
    gameRef.current?.activatePowerup(key)
  }, [])

  const handleCancelPowerup = useCallback(() => {
    setShowPowerupMenu(false)
  }, [])

  const handleDirection = useCallback((dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
    if (showPowerupMenu) return // Block movement during menu
    gameRef.current?.moveDir(dir)
  }, [showPowerupMenu])

  const handleMenuNav = useCallback((dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
    if (showPowerupMenu) {
      const ev = new KeyboardEvent('keydown', {
        key: dir === 'UP' ? 'ArrowUp' : dir === 'DOWN' ? 'ArrowDown' : dir === 'LEFT' ? 'ArrowLeft' : 'ArrowRight',
        bubbles: true
      })
      window.dispatchEvent(ev)
    } else {
      handleDirection(dir)
    }
  }, [showPowerupMenu, handleDirection])

  const handleLogout = async () => {
    await fetch('/api/auth/login', { method: 'DELETE' })
    setPlayer(null); setHighScore(0)
  }

  const handleAuth = (p: Player) => {
    setPlayer(p); setHighScore(p.highScore)
  }

  return (
    <main className="desk-surface">
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
            <button className="login-btn" onClick={() => setShowAuth(true)}>▶ PLAY</button>
          )}
        </div>
      </div>

      {/* Arcade machine */}
      <div className="arcade-outer" style={{ height: arcadeHeight || 'auto' }}>
        <div className="arcade-inner">
          <CRTMonitor score={score} highScore={highScore} username={player?.username || null} powerOn={powerOn}>
            <div className={powerOn ? 'power-on-anim' : ''} style={{ width:'100%', height:'100%', position:'relative' }}>
              <SnakeGame
                onScore={handleScore}
                onGameOver={handleGameOver}
                grantedPowerups={player?.powerups || []}
                gameRef={gameRef}
                isPlaying={isPlaying}
                onStart={() => setIsPlaying(true)}
                highScore={highScore}
              />
              {/* Power-up menu overlaid on screen */}
              {showPowerupMenu && player && player.powerups.length > 0 && (
                <PowerupMenu
                  powerups={player.powerups}
                  onSelect={handleSelectPowerup}
                  onCancel={handleCancelPowerup}
                />
              )}
            </div>
          </CRTMonitor>

          <ArcadeController
            onDirection={handleMenuNav}
            onRestart={handleRestart}
            onOpenPowerupMenu={handleOpenPowerupMenu}
            grantedPowerups={player?.powerups || []}
            activePowerupKey={activePowerup}
            isLoggedIn={!!player}
            scale={scale}
          />

          {/* Leaderboard toggle */}
          <button className="lb-btn" onClick={() => setShowLeaderboard(v => !v)}>🏆</button>
        </div>
      </div>

      {/* Leaderboard */}
      {showLeaderboard && (
        <div className="lb-panel">
          <div className="lb-title">◆ LEADERBOARD ◆</div>
          <table className="lb-table">
            <thead><tr><th>#</th><th>PLAYER</th><th>SCORE</th></tr></thead>
            <tbody>
              {leaderboard.map((e, i) => (
                <tr key={i} className={e.username === player?.username ? 'mine' : ''}>
                  <td>{i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}</td>
                  <td>{e.username}</td>
                  <td>{e.high_score}</td>
                </tr>
              ))}
              {leaderboard.length === 0 && <tr><td colSpan={3} className="empty">NO SCORES YET</td></tr>}
            </tbody>
          </table>
          {!player && (
            <button className="lb-cta" onClick={() => { setShowLeaderboard(false); setShowAuth(true) }}>
              LOGIN TO SAVE SCORE
            </button>
          )}
          <button className="lb-close" onClick={() => setShowLeaderboard(false)}>✕ CLOSE</button>
        </div>
      )}

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} onAuth={handleAuth} />}

      <style jsx>{`
        .top-bar {
          display: flex; justify-content: space-between; align-items: center;
          width: 100%; max-width: 600px; margin-bottom: 20px;
          z-index: 2; position: relative; padding: 0 4px;
        }
        .top-left { display: flex; align-items: baseline; gap: 8px; }
        .game-title {
          font-family: 'Press Start 2P', monospace;
          font-size: clamp(10px, 3vw, 15px);
          color: var(--amber);
          text-shadow: 0 0 20px rgba(255,176,0,0.5), 0 0 40px rgba(255,176,0,0.25);
          animation: titlePulse 3s ease-in-out infinite;
        }
        @keyframes titlePulse {
          0%,100% { text-shadow: 0 0 16px rgba(255,176,0,0.5), 0 0 32px rgba(255,176,0,0.2); }
          50% { text-shadow: 0 0 24px rgba(255,176,0,0.8), 0 0 48px rgba(255,176,0,0.4); }
        }
        .version { font-family: 'Share Tech Mono', monospace; font-size: 10px; color: #5a4820; }
        .top-right { display: flex; align-items: center; gap: 8px; }
        .save-msg {
          font-family: 'Press Start 2P', monospace;
          font-size: clamp(5px, 1.5vw, 7px); color: var(--cyan);
          text-shadow: 0 0 8px rgba(0,229,255,0.5);
        }
        .player-bar { display: flex; align-items: center; gap: 8px; }
        .player-chip {
          font-family: 'Press Start 2P', monospace;
          font-size: clamp(5px, 1.5vw, 7px); color: var(--amber);
          background: rgba(255,176,0,0.07);
          border: 1px solid rgba(255,176,0,0.18);
          padding: 5px 8px; border-radius: 4px;
          max-width: 130px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .admin-link {
          font-family: 'Press Start 2P', monospace; font-size: 10px; color: var(--cyan);
          text-decoration: none; border: 1px solid rgba(0,229,255,0.25);
          padding: 5px 8px; border-radius: 4px; transition: all 0.15s;
        }
        .admin-link:hover { background: rgba(0,229,255,0.08); }
        .text-btn {
          font-family: 'Press Start 2P', monospace; font-size: clamp(5px,1.5vw,6px);
          color: #6a5020; background: none; border: none; cursor: pointer; transition: color 0.15s;
        }
        .text-btn:hover { color: var(--amber); }
        .login-btn {
          font-family: 'Press Start 2P', monospace; font-size: clamp(6px,1.8vw,8px);
          color: var(--amber); background: rgba(255,176,0,0.06);
          border: 1px solid rgba(255,176,0,0.25);
          padding: 8px 14px; border-radius: 4px; cursor: pointer; transition: all 0.15s;
        }
        .login-btn:hover { background: rgba(255,176,0,0.12); }

        .arcade-outer {
          width: 100%; max-width: 520px;
          position: relative; z-index: 1;
        }
        .arcade-inner {
          position: absolute; top: 0; left: 50%; transform: translateX(-50%);
          display: flex; flex-direction: column; align-items: center;
        }

        .lb-btn {
          position: absolute; right: -10px; top: 50px;
          background: rgba(0,0,0,0.6);
          border: 1px solid rgba(255,176,0,0.2);
          border-radius: 0 6px 6px 0; padding: 8px;
          cursor: pointer; font-size: 18px; transition: all 0.15s;
        }
        .lb-btn:hover { background: rgba(255,176,0,0.08); }

        .lb-panel {
          width: calc(100% - 32px); max-width: 300px;
          background: linear-gradient(160deg, #1e1608 0%, #120e04 100%);
          border: 1px solid rgba(255,176,0,0.2); border-radius: 8px;
          padding: 16px; margin-top: 16px; z-index: 50;
          box-shadow: 0 0 40px rgba(255,176,0,0.08);
          animation: fadeIn 0.2s ease;
        }
        @keyframes fadeIn { from{opacity:0;transform:translateY(-8px)} to{opacity:1} }
        .lb-title {
          font-family: 'Press Start 2P', monospace; font-size: 7px;
          color: var(--amber); text-align: center; margin-bottom: 12px;
          text-shadow: 0 0 10px rgba(255,176,0,0.35);
        }
        .lb-table { width: 100%; border-collapse: collapse; }
        .lb-table th {
          font-family: 'Press Start 2P', monospace; font-size: 5px;
          color: #6a5020; padding: 4px; border-bottom: 1px solid rgba(255,176,0,0.1); text-align: left;
        }
        .lb-table td {
          font-family: 'Share Tech Mono', monospace; font-size: 12px;
          color: #aa8040; padding: 5px 4px; border-bottom: 1px solid rgba(255,176,0,0.05);
        }
        .lb-table tr.mine td { color: var(--amber); background: rgba(255,176,0,0.04); }
        .empty { text-align: center; color: #5a4020; font-size: 10px; padding: 12px; }
        .lb-cta {
          width: 100%; margin-top: 10px;
          font-family: 'Press Start 2P', monospace; font-size: 5px;
          color: var(--amber); background: rgba(255,176,0,0.07);
          border: 1px solid rgba(255,176,0,0.2);
          padding: 10px; border-radius: 4px; cursor: pointer;
        }
        .lb-close {
          width: 100%; margin-top: 8px;
          font-family: 'Press Start 2P', monospace; font-size: 5px;
          color: #6a5020; background: none;
          border: 1px solid rgba(255,176,0,0.1);
          padding: 8px; border-radius: 4px; cursor: pointer; transition: all 0.15s;
        }
        .lb-close:hover { color: var(--amber); border-color: rgba(255,176,0,0.3); }
      `}</style>
    </main>
  )
}
