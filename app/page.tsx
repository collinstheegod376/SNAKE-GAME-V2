'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import CRTMonitor       from '@/components/CRTMonitor'
import SnakeGame, { PowerupKey, PowerupData, GameAPI } from '@/components/SnakeGame'
import ArcadeController from '@/components/ArcadeController'
import PowerupMenu      from '@/components/PowerupMenu'
import AuthModal        from '@/components/AuthModal'

// ── Natural component dimensions for scale math ───────────────────────────────
const INNER_W   = 500
const MONITOR_H = 638   // top-bar(32) + bezel(566) + neck(26) + base(14)
const CTRL_H    = 170

// ── Power-up metadata ─────────────────────────────────────────────────────────
const PU_ICONS: Record<string,string> = {
  invisibility:'👻', rush:'⚡', ghost:'🌀', magnet:'🧲', freeze:'❄️', shield:'🛡️',
}
const PU_COLORS: Record<string,string> = {
  invisibility:'#00e5ff', rush:'#ffb000', ghost:'#cc88ff',
  magnet:'#ff6644',       freeze:'#88ccff', shield:'#88ff99',
}
const PU_NAMES: Record<string,string> = {
  invisibility:'INVISIBILITY', rush:'SPEED RUSH', ghost:'GHOST MODE',
  magnet:'MAGNET',             freeze:'FREEZE',   shield:'SHIELD',
}

interface Player {
  id: string; username: string; highScore: number; isAdmin: boolean; powerups: PowerupData[]
}
interface LeaderEntry { username: string; high_score: number }

// ── Leaderboard overlay (rendered inside the monitor screen) ──────────────────
function LeaderboardOverlay({
  entries, currentUser, isLoggedIn, onClose, onLogin,
}: {
  entries: LeaderEntry[]; currentUser?: string; isLoggedIn: boolean
  onClose: () => void; onLogin: () => void
}) {
  return (
    <div className="lb-overlay">
      <div className="lb-inner">
        <div className="lb-title">🏆 LEADERBOARD</div>
        <div className="lb-table-wrap">
          <table className="lb-table">
            <thead>
              <tr>
                <th>RANK</th>
                <th>PLAYER</th>
                <th>SCORE</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 && (
                <tr><td colSpan={3} className="lb-empty">NO SCORES YET</td></tr>
              )}
              {entries.map((e, i) => (
                <tr
                  key={i}
                  className={[
                    i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : '',
                    e.username === currentUser ? 'me' : '',
                  ].filter(Boolean).join(' ')}
                >
                  <td className="rank-cell">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                  </td>
                  <td className="name-cell">{e.username}</td>
                  <td className="score-cell">{String(e.high_score).padStart(6,'0')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!isLoggedIn && (
          <button className="lb-login-cta" onClick={onLogin}>
            ▶ LOGIN TO SAVE YOUR SCORE
          </button>
        )}

        <button className="lb-close" onClick={onClose}>✕ CLOSE</button>
      </div>

      <style jsx>{`
        .lb-overlay {
          position: absolute; inset: 0; z-index: 70;
          background: rgba(8,5,2,0.96);
          border-radius: 8px;
          display: flex; align-items: flex-start; justify-content: center;
          padding: 18px 14px;
          animation: lbFade 0.2s ease;
        }
        @keyframes lbFade { from { opacity:0; transform:scale(0.97); } to { opacity:1; transform:scale(1); } }

        .lb-inner {
          width: 100%; max-width: 340px;
          display: flex; flex-direction: column; gap: 12px;
        }

        .lb-title {
          font-family: 'Press Start 2P', monospace; font-size: 11px;
          color: #ffb000; text-align: center;
          text-shadow: 0 0 20px rgba(255,176,0,0.6), 0 0 40px rgba(255,176,0,0.3);
          letter-spacing: 2px;
        }

        .lb-table-wrap {
          overflow-y: auto; max-height: 280px;
          border: 1px solid rgba(255,176,0,0.15);
          border-radius: 6px;
        }
        .lb-table {
          width: 100%; border-collapse: collapse;
        }
        .lb-table thead {
          position: sticky; top: 0;
          background: #0e0a04; z-index: 1;
        }
        .lb-table th {
          font-family: 'Press Start 2P', monospace; font-size: 5px;
          color: #6a5020; padding: 8px 6px;
          border-bottom: 1px solid rgba(255,176,0,0.15);
          text-align: left; letter-spacing: 1px;
        }
        .lb-table td {
          font-family: 'Share Tech Mono', monospace; font-size: 12px;
          color: #7a6030; padding: 7px 6px;
          border-bottom: 1px solid rgba(255,176,0,0.05);
        }
        .lb-table tr:last-child td { border-bottom: none; }

        /* Top 3 highlights */
        .rank-1 td { background: rgba(255,176,0,0.08); }
        .rank-1 .name-cell, .rank-1 .score-cell { color: #ffb000; }
        .rank-2 td { background: rgba(180,180,180,0.05); }
        .rank-2 .name-cell, .rank-2 .score-cell { color: #c0c0c0; }
        .rank-3 td { background: rgba(180,100,40,0.06); }
        .rank-3 .name-cell, .rank-3 .score-cell { color: #cd7f32; }

        /* Current user row */
        .me td { outline: 1px solid rgba(255,176,0,0.25); }
        .me .name-cell { color: #ffd060; font-style: italic; }
        .me .name-cell::after { content: ' ◀'; font-size: 9px; color: #ffb000; }

        .rank-cell  { font-size: 14px; width: 36px; text-align: center; }
        .name-cell  { font-weight: bold; max-width: 130px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .score-cell { font-family: 'Press Start 2P',monospace; font-size: 7px; color: #aa8040; text-align: right; }
        .rank-1 .score-cell, .rank-2 .score-cell, .rank-3 .score-cell { color: inherit; }

        .lb-empty {
          text-align: center; color: #4a3820; font-size: 10px;
          padding: 24px; font-family: 'Press Start 2P',monospace;
        }

        .lb-login-cta {
          font-family: 'Press Start 2P', monospace; font-size: 6px;
          color: #ffb000; background: rgba(255,176,0,0.07);
          border: 1px solid rgba(255,176,0,0.25);
          border-radius: 5px; padding: 11px; cursor: pointer; width: 100%;
          letter-spacing: 0.5px; transition: all 0.15s;
          touch-action: manipulation;
        }
        .lb-login-cta:hover { background: rgba(255,176,0,0.14); }

        .lb-close {
          font-family: 'Press Start 2P', monospace; font-size: 5px;
          color: #5a4020; background: none;
          border: 1px solid rgba(255,176,0,0.12);
          border-radius: 5px; padding: 10px; cursor: pointer; width: 100%;
          transition: all 0.15s; touch-action: manipulation;
        }
        .lb-close:hover { color: #ffb000; border-color: rgba(255,176,0,0.3); }
      `}</style>
    </div>
  )
}

// ── Active power-up indicator (inside monitor, above canvas) ──────────────────
function PowerupIndicator({ powerupKey, endTime }: { powerupKey: PowerupKey; endTime: number }) {
  const [timeLeft, setTimeLeft] = useState(() => endTime > 0 ? Math.max(0, endTime - Date.now()) : 0)
  const [duration] = useState(() => endTime > 0 ? Math.max(0, endTime - Date.now()) : 0)

  useEffect(() => {
    if (endTime === 0) return  // shield — no timer
    const id = setInterval(() => {
      setTimeLeft(Math.max(0, endTime - Date.now()))
    }, 80)
    return () => clearInterval(id)
  }, [endTime])

  const progress = duration > 0 ? timeLeft / duration : 1
  const color    = PU_COLORS[powerupKey] || '#ffb000'
  const icon     = PU_ICONS[powerupKey]  || '⚡'
  const name     = PU_NAMES[powerupKey]  || powerupKey.toUpperCase()
  const isShield = endTime === 0

  return (
    <div className="pu-ind">
      <span className="pu-ico">{icon}</span>
      <div className="pu-body">
        <div className="pu-nm" style={{ color }}>{name}</div>
        {isShield ? (
          <div className="pu-shield">ACTIVE — ABSORBS ONE HIT</div>
        ) : (
          <div className="pu-bar-outer">
            <div
              className="pu-bar-fill"
              style={{
                width:      `${progress * 100}%`,
                background: color,
                boxShadow:  `0 0 8px ${color}`,
              }}
            />
            <span className="pu-timer">{(timeLeft / 1000).toFixed(1)}s</span>
          </div>
        )}
      </div>
      <style jsx>{`
        .pu-ind {
          position: absolute; top: 8px; right: 8px;
          display: flex; align-items: center; gap: 8px;
          background: rgba(8,5,2,0.88);
          border: 1px solid rgba(255,255,255,0.1);
          border-left: 3px solid ${color};
          border-radius: 6px; padding: 7px 10px;
          z-index: 30; pointer-events: none; min-width: 140px;
          animation: indFade 0.25s ease;
          box-shadow: 0 0 16px rgba(0,0,0,0.6), 0 0 20px ${color}22;
        }
        @keyframes indFade { from { opacity:0; transform:translateX(8px); } to { opacity:1; } }
        .pu-ico  { font-size: 20px; line-height: 1; flex-shrink: 0; }
        .pu-body { flex: 1; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
        .pu-nm   {
          font-family: 'Press Start 2P', monospace; font-size: 5px;
          letter-spacing: 0.5px; white-space: nowrap; overflow: hidden;
          text-shadow: 0 0 8px ${color}aa;
        }
        .pu-shield {
          font-family: 'Share Tech Mono', monospace; font-size: 9px;
          color: #88ff99; letter-spacing: 0.5px;
          animation: shBlink 1.2s ease-in-out infinite;
        }
        @keyframes shBlink { 0%,100%{opacity:1} 50%{opacity:0.45} }
        .pu-bar-outer {
          position: relative; height: 7px;
          background: rgba(255,255,255,0.08);
          border-radius: 4px; overflow: hidden;
        }
        .pu-bar-fill {
          position: absolute; left: 0; top: 0; bottom: 0;
          border-radius: 4px; transition: width 0.1s linear;
        }
        .pu-timer {
          position: absolute; inset: 0;
          display: flex; align-items: center; justify-content: flex-end;
          padding-right: 3px;
          font-family: 'Press Start 2P', monospace; font-size: 4px;
          color: rgba(255,255,255,0.85);
          text-shadow: 0 0 4px rgba(0,0,0,0.8);
        }
      `}</style>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
export default function Home() {
  const [player,           setPlayer]           = useState<Player | null>(null)
  const [score,            setScore]            = useState(0)
  const [highScore,        setHighScore]        = useState(0)
  const [showAuth,         setShowAuth]         = useState(false)
  const [isPlaying,        setIsPlaying]        = useState(false)
  const [powerOn,          setPowerOn]          = useState(false)
  // Power-up state driven exclusively by engine callback
  const [activePowerup,    setActivePowerup]    = useState<PowerupKey | null>(null)
  const [puEndTime,        setPuEndTime]        = useState(0)
  const [showPowerupMenu,  setShowPowerupMenu]  = useState(false)
  const [availablePowerups,setAvailablePowerups]= useState<PowerupData[]>([])
  // UI state
  const [showLeaderboard,  setShowLeaderboard]  = useState(false)
  const [leaderboard,      setLeaderboard]      = useState<LeaderEntry[]>([])
  const [saveMsg,          setSaveMsg]          = useState('')
  const [scale,            setScale]            = useState(1)
  const [isLandscape,      setIsLandscape]      = useState(false)

  const gameRef      = useRef<GameAPI | null>(null)
  const highScoreRef = useRef(highScore)
  const activePuRef  = useRef<PowerupKey | null>(null)
  useEffect(() => { highScoreRef.current = highScore }, [highScore])
  useEffect(() => { activePuRef.current  = activePowerup }, [activePowerup])

  // ── Viewport scale ────────────────────────────────────────────────────────
  useEffect(() => {
    function calc() {
      const vw = window.innerWidth, vh = window.innerHeight
      const land = vw > vh + 50
      setIsLandscape(land)
      setScale(land
        ? Math.min(1, (vh - 32) / MONITOR_H, (vw - 24) / (INNER_W * 2 + 24))
        : Math.min(1, (vw - 16) / INNER_W))
    }
    calc()
    window.addEventListener('resize', calc)
    window.addEventListener('orientationchange', () => setTimeout(calc, 150))
    return () => window.removeEventListener('resize', calc)
  }, [])

  // ── Session ───────────────────────────────────────────────────────────────
  useEffect(() => {
    setTimeout(() => setPowerOn(true), 500)
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (d.player) { setPlayer(d.player); setHighScore(d.player.highScore) }
    })
    fetch('/api/scores').then(r => r.json()).then(d => { if (d.scores) setLeaderboard(d.scores) })
  }, [])

  useEffect(() => { setAvailablePowerups(player?.powerups ?? []) }, [player])

  // ── Engine → parent powerup sync ─────────────────────────────────────────
  // Called by SnakeGame when powerup activates OR expires naturally.
  // This is the SINGLE source of truth for the indicator.
  const handlePowerupChange = useCallback((key: PowerupKey | null, endTime: number) => {
    setActivePowerup(key)
    setPuEndTime(endTime)
  }, [])

  // ── Score / game over ─────────────────────────────────────────────────────
  const handleScore = useCallback((newScore: number) => {
    setScore(newScore)
    if (newScore > highScoreRef.current) setHighScore(newScore)
  }, [])

  const handleGameOver = useCallback(async (finalScore: number) => {
    setIsPlaying(false)
    setActivePowerup(null); setPuEndTime(0)
    setShowPowerupMenu(false); setShowLeaderboard(false)
    if (!player) return
    try {
      const res  = await fetch('/api/scores', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score: finalScore, powerupUsed: activePuRef.current }),
      })
      const data = await res.json()
      if (data.highScore > highScoreRef.current) {
        setHighScore(data.highScore); setSaveMsg('🏆 NEW HIGH SCORE!')
      } else { setSaveMsg('✓ SCORE SAVED') }
      setTimeout(() => setSaveMsg(''), 3000)
      fetch('/api/scores').then(r => r.json()).then(d => { if (d.scores) setLeaderboard(d.scores) })
    } catch {}
  }, [player])

  // ── Controls ──────────────────────────────────────────────────────────────
  const handleRestart = useCallback(() => {
    setScore(0)
    setActivePowerup(null); setPuEndTime(0)
    setShowPowerupMenu(false); setShowLeaderboard(false)
    gameRef.current?.restart()
  }, [])

  const openPowerupMenu = useCallback(() => {
    if (!isPlaying || activePowerup) return
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
    // 1. Close menu
    setShowPowerupMenu(false)
    // 2. Consume from finite list
    setAvailablePowerups(prev => {
      const i = prev.findIndex(p => p.key === key)
      return i === -1 ? prev : [...prev.slice(0, i), ...prev.slice(i + 1)]
    })
    // 3. Resume game then activate (resume FIRST so guard in activatePowerup passes)
    gameRef.current?.resume()
    gameRef.current?.activatePowerup(key)
    // Note: setActivePowerup & setPuEndTime are set by handlePowerupChange callback from engine
  }, [])

  const handleDirection = useCallback((dir: 'UP'|'DOWN'|'LEFT'|'RIGHT') => {
    gameRef.current?.moveDir(dir)
  }, [])

  const handleLogout = async () => {
    await fetch('/api/auth/login', { method: 'DELETE' })
    setPlayer(null); setHighScore(0)
  }

  // ── Scale helpers ─────────────────────────────────────────────────────────
  const monBox = { width: INNER_W * scale, height: MONITOR_H * scale }
  const ctlBox = { width: INNER_W * scale, height: CTRL_H    * scale }
  const innerStyle = (h: number): React.CSSProperties => ({
    width: INNER_W, position: 'absolute', top: 0, left: 0,
    transform: `scale(${scale})`, transformOrigin: 'top left', minHeight: h,
  })

  // Leaderboard button toggles; close when game restarts
  const handleLeaderboardToggle = useCallback(() => {
    setShowLeaderboard(v => {
      if (!v) {
        // Refresh scores when opening
        fetch('/api/scores').then(r => r.json()).then(d => { if (d.scores) setLeaderboard(d.scores) })
      }
      return !v
    })
  }, [])

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

        {/* ── Monitor ── */}
        <div style={{ position:'relative', width:monBox.width, height:monBox.height, flexShrink:0 }}>
          <div style={innerStyle(MONITOR_H)}>
            <CRTMonitor score={score} highScore={highScore} username={player?.username ?? null} powerOn={powerOn}>
              {/* Everything inside the CRT screen lives here */}
              <div className={powerOn ? 'power-on-anim' : ''} style={{ width:'100%', height:'100%', position:'relative' }}>

                {/* Game canvas — always mounted */}
                <SnakeGame
                  onScore={handleScore}
                  onGameOver={handleGameOver}
                  onPowerupChange={handlePowerupChange}
                  grantedPowerups={player?.powerups ?? []}
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

                {/* Leaderboard overlay — inside the monitor screen */}
                {showLeaderboard && !showPowerupMenu && (
                  <LeaderboardOverlay
                    entries={leaderboard}
                    currentUser={player?.username}
                    isLoggedIn={!!player}
                    onClose={() => setShowLeaderboard(false)}
                    onLogin={() => { setShowLeaderboard(false); setShowAuth(true) }}
                  />
                )}

                {/* Active power-up indicator — top-right of game screen */}
                {activePowerup && !showPowerupMenu && !showLeaderboard && (
                  <PowerupIndicator
                    key={`${activePowerup}-${puEndTime}`}
                    powerupKey={activePowerup}
                    endTime={puEndTime}
                  />
                )}

              </div>
            </CRTMonitor>
          </div>
        </div>

        {/* ── Controller ── */}
        <div style={{ position:'relative', width:ctlBox.width, height:ctlBox.height, flexShrink:0 }}>
          <div style={innerStyle(CTRL_H)}>
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

        {/* Leaderboard toggle button */}
        <button className="lbbtn" onClick={handleLeaderboardToggle} title="Leaderboard">
          {showLeaderboard ? '✕' : '🏆'}
        </button>
      </div>

      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          onAuth={(p: Player) => { setPlayer(p); setHighScore(p.highScore) }}
        />
      )}

      <style jsx>{`
        .desk {
          min-height: 100vh;
          background:
            radial-gradient(ellipse 70% 40% at 50% 100%, rgba(255,176,0,0.04) 0%, transparent 70%),
            linear-gradient(180deg, #0a0806, #0d0a06);
          display: flex; flex-direction: column; align-items: center;
          padding:
            max(16px, env(safe-area-inset-top, 16px))
            max(8px,  env(safe-area-inset-right, 8px))
            max(24px, env(safe-area-inset-bottom, 24px))
            max(8px,  env(safe-area-inset-left, 8px));
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
        .smsg {
          font-family: 'Press Start 2P', monospace; font-size: clamp(5px,1.5vw,7px);
          color: #00e5ff; text-shadow: 0 0 8px rgba(0,229,255,0.5);
        }
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
        .tbtn {
          font-family: 'Press Start 2P', monospace; font-size: clamp(5px,1.5vw,6px);
          color: #6a5020; background: none; border: none; cursor: pointer; transition: color 0.15s;
        }
        .tbtn:hover { color: #ffb000; }
        .lbtn {
          font-family: 'Press Start 2P', monospace; font-size: clamp(6px,1.8vw,8px);
          color: #ffb000; background: rgba(255,176,0,0.06);
          border: 1px solid rgba(255,176,0,0.25); padding: 8px 14px;
          border-radius: 4px; cursor: pointer; transition: all 0.15s; touch-action: manipulation;
        }
        .lbtn:hover { background: rgba(255,176,0,0.12); }

        /* ── Machine ── */
        .machine { position: relative; display: flex; flex-shrink: 0; }
        .machine.port { flex-direction: column; align-items: center; }
        .machine.land { flex-direction: row; align-items: flex-start; }

        /* ── Leaderboard toggle button ── */
        .lbbtn {
          position: absolute; right: -10px; top: 50px;
          background: rgba(0,0,0,0.7); border: 1px solid rgba(255,176,0,0.22);
          border-radius: 0 6px 6px 0; padding: 8px 9px; cursor: pointer;
          font-size: 18px; line-height: 1; transition: all 0.15s;
          touch-action: manipulation; -webkit-tap-highlight-color: transparent;
        }
        .lbbtn:hover { background: rgba(255,176,0,0.1); }
      `}</style>
    </main>
  )
}
