'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import CRTMonitor  from '@/components/CRTMonitor'
import SnakeGame, { PowerupKey, PowerupData, GameAPI } from '@/components/SnakeGame'
import ArcadeController from '@/components/ArcadeController'
import PowerupMenu  from '@/components/PowerupMenu'
import AuthModal    from '@/components/AuthModal'

// Natural heights for scale math
const INNER_W   = 500
const MONITOR_H = 638   // top-bar(32) + bezel(566) + neck(26) + base(14)
const CTRL_H    = 170   // controller panel height (increased for bigger buttons)

// Power-up durations (mirrors game engine)
const PU_DURATIONS: Record<string, number | null> = {
  invisibility: 5000, rush: 8000, ghost: 5000,
  magnet: 6000,       freeze: 3000, shield: null,
}
const PU_ICONS: Record<string, string> = {
  invisibility: '👻', rush: '⚡', ghost: '🌀',
  magnet: '🧲', freeze: '❄️', shield: '🛡️',
}
const PU_COLORS: Record<string, string> = {
  invisibility: '#00e5ff', rush: '#ffb000', ghost: '#cc88ff',
  magnet: '#ff6644', freeze: '#88ccff', shield: '#88ff99',
}

interface Player {
  id: string; username: string; highScore: number
  isAdmin: boolean; powerups: PowerupData[]
}
interface LeaderEntry { username: string; high_score: number }

export default function Home() {
  const [player,           setPlayer]           = useState<Player | null>(null)
  const [score,            setScore]            = useState(0)
  const [highScore,        setHighScore]        = useState(0)
  const [showAuth,         setShowAuth]         = useState(false)
  const [isPlaying,        setIsPlaying]        = useState(false)
  const [powerOn,          setPowerOn]          = useState(false)
  const [activePowerup,    setActivePowerup]    = useState<PowerupKey | null>(null)
  // How long is left on the active powerup (for the DOM indicator)
  const [puTimeLeft,       setPuTimeLeft]       = useState(0)
  const [puDuration,       setPuDuration]       = useState(0)
  const [showPowerupMenu,  setShowPowerupMenu]  = useState(false)
  const [leaderboard,      setLeaderboard]      = useState<LeaderEntry[]>([])
  const [showLeaderboard,  setShowLeaderboard]  = useState(false)
  const [saveMsg,          setSaveMsg]          = useState('')
  // ── Finite power-ups: track what's still available (decrements on use)
  const [availablePowerups, setAvailablePowerups] = useState<PowerupData[]>([])
  const [scale,            setScale]            = useState(1)
  const [isLandscape,      setIsLandscape]      = useState(false)

  const gameRef      = useRef<GameAPI | null>(null)
  const puTimerRef   = useRef<ReturnType<typeof setInterval> | null>(null)
  const puEndTimeRef = useRef<number>(0)

  // ── Viewport scale ────────────────────────────────────────────────────────
  useEffect(() => {
    function calc() {
      const vw = window.innerWidth, vh = window.innerHeight
      const land = vw > vh + 50
      setIsLandscape(land)
      if (land) {
        const byH = Math.min(1, (vh - 32) / MONITOR_H)
        const byW = Math.min(1, (vw - 24) / (INNER_W * 2 + 24))
        setScale(Math.min(byH, byW))
      } else {
        setScale(Math.min(1, (vw - 16) / INNER_W))
      }
    }
    calc()
    window.addEventListener('resize', calc)
    window.addEventListener('orientationchange', () => setTimeout(calc, 150))
    return () => window.removeEventListener('resize', calc)
  }, [])

  // ── Session + leaderboard ─────────────────────────────────────────────────
  useEffect(() => {
    setTimeout(() => setPowerOn(true), 500)
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (d.player) {
        setPlayer(d.player)
        setHighScore(d.player.highScore)
        setAvailablePowerups(d.player.powerups || [])
      }
    })
    fetch('/api/scores').then(r => r.json()).then(d => {
      if (d.scores) setLeaderboard(d.scores)
    })
  }, [])

  // Reset available powerups when player changes (login / logout)
  useEffect(() => {
    setAvailablePowerups(player?.powerups || [])
  }, [player])

  // ── Stable refs for game callbacks ───────────────────────────────────────
  const activePowerupRef = useRef<PowerupKey | null>(null)
  const highScoreRef     = useRef(highScore)
  useEffect(() => { activePowerupRef.current = activePowerup }, [activePowerup])
  useEffect(() => { highScoreRef.current = highScore }, [highScore])

  // ── Active powerup countdown timer ───────────────────────────────────────
  const startPuTimer = useCallback((key: PowerupKey) => {
    const dur = PU_DURATIONS[key]
    if (!dur) { setPuDuration(0); setPuTimeLeft(0); return }
    const endTime = Date.now() + dur
    puEndTimeRef.current = endTime
    setPuDuration(dur)
    setPuTimeLeft(dur)

    if (puTimerRef.current) clearInterval(puTimerRef.current)
    puTimerRef.current = setInterval(() => {
      const rem = Math.max(0, puEndTimeRef.current - Date.now())
      setPuTimeLeft(rem)
      if (rem === 0) {
        clearInterval(puTimerRef.current!)
        puTimerRef.current = null
        setActivePowerup(null)
      }
    }, 80)
  }, [])

  const clearPuTimer = useCallback(() => {
    if (puTimerRef.current) { clearInterval(puTimerRef.current); puTimerRef.current = null }
    setPuTimeLeft(0); setPuDuration(0)
  }, [])

  // ── Score / game over ─────────────────────────────────────────────────────
  const handleScore = useCallback((newScore: number) => {
    setScore(newScore)
    if (newScore > highScoreRef.current) setHighScore(newScore)
  }, [])

  const handleGameOver = useCallback(async (finalScore: number) => {
    setIsPlaying(false)
    setActivePowerup(null)
    setShowPowerupMenu(false)
    clearPuTimer()
    if (!player) return
    try {
      const res  = await fetch('/api/scores', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score: finalScore, powerupUsed: activePowerupRef.current }),
      })
      const data = await res.json()
      if (data.highScore > highScoreRef.current) {
        setHighScore(data.highScore); setSaveMsg('🏆 NEW HIGH SCORE!')
      } else {
        setSaveMsg('✓ SCORE SAVED')
      }
      setTimeout(() => setSaveMsg(''), 3000)
      fetch('/api/scores').then(r => r.json()).then(d => { if (d.scores) setLeaderboard(d.scores) })
    } catch {}
  }, [player, clearPuTimer])

  // ── Controls ──────────────────────────────────────────────────────────────
  const handleRestart = useCallback(() => {
    setScore(0)
    setActivePowerup(null)
    setShowPowerupMenu(false)
    clearPuTimer()
    // Reset available powerups for the new game (re-sync from player)
    // NOTE: powerups carry over across games — only consumed when used
    gameRef.current?.restart()
  }, [clearPuTimer])

  const openPowerupMenu = useCallback(() => {
    // Guard: only open when actively playing, no powerup already running, game is running
    if (!isPlaying) return
    if (activePowerup) return
    if (availablePowerups.length === 0) return
    if (!gameRef.current?.isRunning()) return
    gameRef.current.pause()
    setShowPowerupMenu(true)
  }, [isPlaying, activePowerup, availablePowerups])

  const closePowerupMenu = useCallback(() => {
    setShowPowerupMenu(false)
    gameRef.current?.resume()
  }, [])

  const handleSelectPowerup = useCallback((key: PowerupKey) => {
    // ── 1. Close the menu first (synchronous state update)
    setShowPowerupMenu(false)

    // ── 2. Remove this powerup from the available list (finite powerups)
    setAvailablePowerups(prev => {
      const idx = prev.findIndex(p => p.key === key)
      if (idx === -1) return prev
      return [...prev.slice(0, idx), ...prev.slice(idx + 1)]
    })

    // ── 3. Mark as active (for indicator display)
    setActivePowerup(key)

    // ── 4. Start the DOM countdown timer
    startPuTimer(key)

    // ── 5. Resume the game FIRST (unpauses regardless of powerup guard),
    //    THEN activate the effect so the guard sees g.running = true
    gameRef.current?.resume()
    gameRef.current?.activatePowerup(key)
  }, [startPuTimer])

  const handleDirection = useCallback((dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
    gameRef.current?.moveDir(dir)
  }, [])

  const handleLogout = async () => {
    await fetch('/api/auth/login', { method: 'DELETE' })
    setPlayer(null); setHighScore(0)
  }

  // ── Scale CSS helpers ─────────────────────────────────────────────────────
  const monitorBox = { width: INNER_W * scale, height: MONITOR_H * scale }
  const ctrlBox    = { width: INNER_W * scale, height: CTRL_H * scale }

  const scaledStyle = (h: number): React.CSSProperties => ({
    width: INNER_W, position: 'absolute', top: 0, left: 0,
    transform: `scale(${scale})`, transformOrigin: 'top left',
    minHeight: h,
  })

  // ── Active powerup indicator progress (0–1)
  const puProgress = puDuration > 0 ? puTimeLeft / puDuration : 0

  return (
    <main className="desk">
      {/* ── Top bar ── */}
      <div className="topbar">
        <div className="tl">
          <span className="gtitle">SERPENT SX</span>
          <span className="ver">v2.0</span>
        </div>
        <div className="tr">
          {saveMsg && <span className="smsg">{saveMsg}</span>}
          {player ? (
            <div className="pbar">
              {player.isAdmin && <a href="/admin" className="alink">⚙</a>}
              <span className="pchip">👤 {player.username}</span>
              <button className="tbtn" onClick={handleLogout}>OUT</button>
            </div>
          ) : (
            <button className="lbtn" onClick={() => setShowAuth(true)}>▶ PLAY</button>
          )}
        </div>
      </div>

      {/* ── Arcade machine ── */}
      <div className={`machine ${isLandscape ? 'land' : 'port'}`}>

        {/* Monitor */}
        <div style={{ position: 'relative', width: monitorBox.width, height: monitorBox.height, flexShrink: 0 }}>
          <div style={scaledStyle(MONITOR_H)}>
            <CRTMonitor score={score} highScore={highScore} username={player?.username || null} powerOn={powerOn}>
              <div className={powerOn ? 'power-on-anim' : ''} style={{ width: '100%', height: '100%', position: 'relative' }}>
                <SnakeGame
                  onScore={handleScore}
                  onGameOver={handleGameOver}
                  grantedPowerups={player?.powerups || []}
                  gameRef={gameRef}
                  onStart={() => setIsPlaying(true)}
                  highScore={highScore}
                />
                {/* Power-up selection menu overlay */}
                {showPowerupMenu && availablePowerups.length > 0 && (
                  <PowerupMenu
                    powerups={availablePowerups}
                    onSelect={handleSelectPowerup}
                    onCancel={closePowerupMenu}
                  />
                )}
                {/* Active power-up DOM indicator — layered above canvas */}
                {activePowerup && !showPowerupMenu && (
                  <div className="pu-indicator">
                    <span className="pu-icon">{PU_ICONS[activePowerup] || '⚡'}</span>
                    <div className="pu-info">
                      <div className="pu-name">{activePowerup.toUpperCase()}</div>
                      {puDuration > 0 ? (
                        <div className="pu-bar-wrap">
                          <div
                            className="pu-bar"
                            style={{
                              width: `${puProgress * 100}%`,
                              background: PU_COLORS[activePowerup] || '#ffb000',
                              boxShadow: `0 0 6px ${PU_COLORS[activePowerup] || '#ffb000'}`,
                            }}
                          />
                          <span className="pu-time">{(puTimeLeft / 1000).toFixed(1)}s</span>
                        </div>
                      ) : (
                        <div className="pu-shield-label">ACTIVE</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CRTMonitor>
          </div>
        </div>

        {/* Controller */}
        <div style={{ position: 'relative', width: ctrlBox.width, height: ctrlBox.height, flexShrink: 0 }}>
          <div style={scaledStyle(CTRL_H)}>
            <ArcadeController
              onDirection={handleDirection}
              onRestart={handleRestart}
              onPowerupBtn={showPowerupMenu ? closePowerupMenu : openPowerupMenu}
              isPowerupMenuOpen={showPowerupMenu}
              availablePowerups={availablePowerups}
              activePowerupKey={activePowerup}
              isLoggedIn={!!player}
            />
          </div>
        </div>

        {/* Leaderboard toggle */}
        <button className="lbbtn" onClick={() => setShowLeaderboard(v => !v)} title="Leaderboard">🏆</button>
      </div>

      {/* ── Leaderboard ── */}
      {showLeaderboard && (
        <div className="lb">
          <div className="lbt">◆ LEADERBOARD ◆</div>
          <table className="lbtbl">
            <thead><tr><th>#</th><th>PLAYER</th><th>SCORE</th></tr></thead>
            <tbody>
              {leaderboard.map((e, i) => (
                <tr key={i} className={e.username === player?.username ? 'me' : ''}>
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

      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          onAuth={(p: Player) => { setPlayer(p); setHighScore(p.highScore) }}
        />
      )}

      <style jsx>{`
        /* ── Page base ── */
        .desk {
          min-height: 100vh;
          background:
            radial-gradient(ellipse 70% 40% at 50% 100%, rgba(255,176,0,0.04) 0%, transparent 70%),
            linear-gradient(180deg, #0a0806, #0d0a06);
          display: flex; flex-direction: column; align-items: center;
          padding:
            max(16px, env(safe-area-inset-top,    16px))
            max(8px,  env(safe-area-inset-right,   8px))
            max(24px, env(safe-area-inset-bottom, 24px))
            max(8px,  env(safe-area-inset-left,    8px));
          box-sizing: border-box; overflow-x: hidden; overflow-y: auto;
        }

        /* ── Top bar ── */
        .topbar {
          display: flex; justify-content: space-between; align-items: center;
          width: 100%; max-width: 540px; margin-bottom: 12px; flex-shrink: 0;
        }
        .tl { display: flex; align-items: baseline; gap: 8px; }
        .gtitle {
          font-family: 'Press Start 2P', monospace;
          font-size: clamp(9px, 2.8vw, 15px); color: #ffb000;
          text-shadow: 0 0 18px rgba(255,176,0,0.5), 0 0 36px rgba(255,176,0,0.25);
          animation: tp 3s ease-in-out infinite;
        }
        @keyframes tp {
          0%,100% { text-shadow: 0 0 16px rgba(255,176,0,0.5), 0 0 32px rgba(255,176,0,0.2); }
          50%      { text-shadow: 0 0 24px rgba(255,176,0,0.85), 0 0 48px rgba(255,176,0,0.4); }
        }
        .ver  { font-family: 'Share Tech Mono', monospace; font-size: 10px; color: #5a4820; }
        .tr   { display: flex; align-items: center; gap: 8px; }
        .smsg { font-family: 'Press Start 2P', monospace; font-size: clamp(5px,1.5vw,7px); color: #00e5ff; text-shadow: 0 0 8px rgba(0,229,255,0.5); }
        .pbar { display: flex; align-items: center; gap: 7px; }
        .pchip {
          font-family: 'Press Start 2P', monospace; font-size: clamp(5px,1.5vw,7px);
          color: #ffb000; background: rgba(255,176,0,0.07);
          border: 1px solid rgba(255,176,0,0.18); padding: 5px 8px; border-radius: 4px;
          max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .alink {
          font-family: 'Press Start 2P', monospace; font-size: 10px; color: #00e5ff;
          text-decoration: none; border: 1px solid rgba(0,229,255,0.25);
          padding: 5px 8px; border-radius: 4px; transition: all 0.15s;
        }
        .alink:hover { background: rgba(0,229,255,0.08); }
        .tbtn { font-family: 'Press Start 2P', monospace; font-size: clamp(5px,1.5vw,6px); color: #6a5020; background: none; border: none; cursor: pointer; transition: color 0.15s; }
        .tbtn:hover { color: #ffb000; }
        .lbtn {
          font-family: 'Press Start 2P', monospace; font-size: clamp(6px,1.8vw,8px);
          color: #ffb000; background: rgba(255,176,0,0.06);
          border: 1px solid rgba(255,176,0,0.25); padding: 8px 14px;
          border-radius: 4px; cursor: pointer; transition: all 0.15s; touch-action: manipulation;
        }
        .lbtn:hover { background: rgba(255,176,0,0.12); }

        /* ── Machine wrapper ── */
        .machine { position: relative; display: flex; flex-shrink: 0; }
        .machine.port { flex-direction: column; align-items: center; }
        .machine.land { flex-direction: row; align-items: flex-start; }

        /* ── Active power-up indicator (DOM overlay on canvas) ── */
        :global(.pu-indicator) {
          position: absolute;
          bottom: 4px; left: 4px; right: 4px;
          display: flex; align-items: center; gap: 8px;
          background: rgba(8, 5, 2, 0.82);
          border: 1px solid rgba(255,176,0,0.25);
          border-radius: 6px; padding: 6px 10px;
          z-index: 20; pointer-events: none;
          animation: puFadeIn 0.25s ease;
        }
        @keyframes puFadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; } }
        :global(.pu-icon) { font-size: 20px; line-height: 1; flex-shrink: 0; }
        :global(.pu-info) { flex: 1; display: flex; flex-direction: column; gap: 3px; }
        :global(.pu-name) {
          font-family: 'Press Start 2P', monospace; font-size: 6px;
          color: #ffb000; letter-spacing: 1px;
          text-shadow: 0 0 8px rgba(255,176,0,0.5);
        }
        :global(.pu-bar-wrap) {
          position: relative; height: 8px;
          background: rgba(255,255,255,0.07); border-radius: 4px; overflow: hidden;
        }
        :global(.pu-bar) {
          position: absolute; left: 0; top: 0; bottom: 0;
          border-radius: 4px; transition: width 0.1s linear;
        }
        :global(.pu-time) {
          position: absolute; right: 4px; top: 50%;
          transform: translateY(-50%);
          font-family: 'Press Start 2P', monospace; font-size: 5px;
          color: #000; mix-blend-mode: difference; letter-spacing: 0.5px;
        }
        :global(.pu-shield-label) {
          font-family: 'Press Start 2P', monospace; font-size: 5px;
          color: #88ff99; letter-spacing: 1px; animation: sl 1s ease-in-out infinite;
        }
        @keyframes sl { 0%,100%{opacity:1} 50%{opacity:0.4} }

        /* ── Leaderboard toggle ── */
        .lbbtn {
          position: absolute; right: -10px; top: 50px;
          background: rgba(0,0,0,0.6); border: 1px solid rgba(255,176,0,0.2);
          border-radius: 0 6px 6px 0; padding: 8px; cursor: pointer;
          font-size: 18px; transition: all 0.15s; touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
        }
        .lbbtn:hover { background: rgba(255,176,0,0.08); }

        /* ── Leaderboard panel ── */
        .lb {
          width: calc(100% - 24px); max-width: 300px;
          background: linear-gradient(160deg, #1e1608, #120e04);
          border: 1px solid rgba(255,176,0,0.2); border-radius: 8px;
          padding: 14px; margin-top: 14px; flex-shrink: 0;
          box-shadow: 0 0 40px rgba(255,176,0,0.08); animation: fi 0.2s ease;
        }
        @keyframes fi { from { opacity:0; transform:translateY(-8px); } to { opacity:1; } }
        .lbt { font-family: 'Press Start 2P', monospace; font-size: 7px; color: #ffb000; text-align: center; margin-bottom: 10px; text-shadow: 0 0 10px rgba(255,176,0,0.3); }
        .lbtbl { width: 100%; border-collapse: collapse; }
        .lbtbl th { font-family: 'Press Start 2P', monospace; font-size: 5px; color: #6a5020; padding: 4px; border-bottom: 1px solid rgba(255,176,0,0.1); text-align: left; }
        .lbtbl td { font-family: 'Share Tech Mono', monospace; font-size: 12px; color: #aa8040; padding: 5px 4px; border-bottom: 1px solid rgba(255,176,0,0.05); }
        .lbtbl tr.me td { color: #ffb000; background: rgba(255,176,0,0.04); }
        .empty { text-align: center; color: #5a4020; font-size: 10px; padding: 10px; }
        .lb-cta  { width:100%; margin-top:10px; font-family:'Press Start 2P',monospace; font-size:5px; color:#ffb000; background:rgba(255,176,0,0.07); border:1px solid rgba(255,176,0,0.2); padding:9px; border-radius:4px; cursor:pointer; }
        .lb-close{ width:100%; margin-top:7px; font-family:'Press Start 2P',monospace; font-size:5px; color:#6a5020; background:none; border:1px solid rgba(255,176,0,0.1); padding:8px; border-radius:4px; cursor:pointer; transition:all 0.15s; }
        .lb-close:hover { color:#ffb000; border-color:rgba(255,176,0,0.3); }
      `}</style>
    </main>
  )
}
