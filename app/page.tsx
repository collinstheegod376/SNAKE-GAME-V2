'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import CRTMonitor  from '@/components/CRTMonitor'
import SnakeGame, { PowerupKey, PowerupData, GameAPI } from '@/components/SnakeGame'
import ArcadeController from '@/components/ArcadeController'
import PowerupMenu  from '@/components/PowerupMenu'
import AuthModal    from '@/components/AuthModal'

// ── Approximate natural heights for scaling math ─────────────────────────────
// CRTMonitor  : top-bar(32) + bezel(566) + neck(26) + base(14) = 638 px
// ArcadeCtrl  : 155 px
const INNER_W       = 500
const MONITOR_H     = 638
const CTRL_H        = 155
const PORTRAIT_FULL = MONITOR_H + CTRL_H   // 793 px stacked
// ─────────────────────────────────────────────────────────────────────────────

interface Player { id:string; username:string; highScore:number; isAdmin:boolean; powerups:PowerupData[] }
interface LeaderEntry { username:string; high_score:number }

export default function Home() {
  const [player,          setPlayer]          = useState<Player | null>(null)
  const [score,           setScore]           = useState(0)
  const [highScore,       setHighScore]       = useState(0)
  const [showAuth,        setShowAuth]        = useState(false)
  const [isPlaying,       setIsPlaying]       = useState(false)
  const [powerOn,         setPowerOn]         = useState(false)
  const [activePowerup,   setActivePowerup]   = useState<PowerupKey | null>(null)
  const [showPowerupMenu, setShowPowerupMenu] = useState(false)
  const [leaderboard,     setLeaderboard]     = useState<LeaderEntry[]>([])
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [saveMsg,         setSaveMsg]         = useState('')

  // ── Scale state — single source of truth, computed from viewport ─────────
  const [scale,       setScale]       = useState(1)
  const [isLandscape, setIsLandscape] = useState(false)

  useEffect(() => {
    function calc() {
      const vw   = window.innerWidth
      const vh   = window.innerHeight
      const land = vw > vh + 50  // clear landscape (not near-square)

      setIsLandscape(land)

      if (land) {
        // In landscape: monitor and controller sit side by side.
        // Scale so the monitor fits the viewport height (with some padding).
        const scaleByH = Math.min(1, (vh - 32) / MONITOR_H)
        // Also make sure both columns together fit the viewport width
        const scaleByW = Math.min(1, (vw - 24) / (INNER_W * 2 + 24))
        setScale(Math.min(scaleByH, scaleByW))
      } else {
        // Portrait: scale so the machine width fits the viewport width.
        setScale(Math.min(1, (vw - 16) / INNER_W))
      }
    }
    calc()
    window.addEventListener('resize', calc)
    window.addEventListener('orientationchange', () => setTimeout(calc, 150))
    return () => window.removeEventListener('resize', calc)
  }, [])

  // ── Session + leaderboard ────────────────────────────────────────────────
  useEffect(() => {
    setTimeout(() => setPowerOn(true), 500)
    fetch('/api/auth/me').then(r=>r.json()).then(d=>{
      if (d.player) { setPlayer(d.player); setHighScore(d.player.highScore) }
    })
    fetch('/api/scores').then(r=>r.json()).then(d=>{ if (d.scores) setLeaderboard(d.scores) })
  }, [])

  // ── Stable callback refs so handleScore never needs highScore as a dep.
  // If handleScore had [highScore] as dep it would change identity after every
  // food-eaten event, which cascades into re-creating tick() and breaking the loop.
  const activePowerupRef = useRef<PowerupKey | null>(null)
  const highScoreRef     = useRef(highScore)
  useEffect(() => { activePowerupRef.current = activePowerup }, [activePowerup])
  useEffect(() => { highScoreRef.current = highScore }, [highScore])

  const handleScore = useCallback((newScore: number) => {
    setScore(newScore)
    if (newScore > highScoreRef.current) setHighScore(newScore)
  }, []) // stable — reads highScoreRef, never changes identity

  const handleGameOver = useCallback(async (finalScore: number) => {
    setIsPlaying(false); setActivePowerup(null); setShowPowerupMenu(false)
    if (!player) return
    try {
      const res  = await fetch('/api/scores', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ score: finalScore, powerupUsed: activePowerupRef.current })
      })
      const data = await res.json()
      if (data.highScore > highScoreRef.current) {
        setHighScore(data.highScore); setSaveMsg('🏆 NEW HIGH SCORE!')
      } else { setSaveMsg('✓ SCORE SAVED') }
      setTimeout(() => setSaveMsg(''), 3000)
      fetch('/api/scores').then(r=>r.json()).then(d=>{ if (d.scores) setLeaderboard(d.scores) })
    } catch {}
  }, [player])

  const gameRef = useRef<GameAPI | null>(null)

  const handleRestart = useCallback(() => {
    setScore(0); setActivePowerup(null); setShowPowerupMenu(false)
    gameRef.current?.restart()
  }, [])

  const openPowerupMenu = useCallback(() => {
    if (!isPlaying || activePowerup) return
    if (!gameRef.current?.isRunning()) return
    gameRef.current.pause()
    setShowPowerupMenu(true)
  }, [isPlaying, activePowerup])

  const closePowerupMenu = useCallback(() => {
    setShowPowerupMenu(false)
    gameRef.current?.resume()
  }, [])

  const handleSelectPowerup = useCallback((key: PowerupKey) => {
    setShowPowerupMenu(false); setActivePowerup(key)
    gameRef.current?.resume()
    gameRef.current?.activatePowerup(key)
  }, [])

  const handleDirection = useCallback((dir: 'UP'|'DOWN'|'LEFT'|'RIGHT') => {
    gameRef.current?.moveDir(dir)
  }, [])

  const handleLogout = async () => {
    await fetch('/api/auth/login', { method: 'DELETE' })
    setPlayer(null); setHighScore(0)
  }

  // ── Scaling helpers ──────────────────────────────────────────────────────
  // The trick: CSS transform: scale() doesn't affect document layout,
  // so we wrap the scaled div inside a container sized to the *visual* footprint.
  // scaledBox(naturalW, naturalH) → { width, height } for the outer container.
  const monitorBox = {
    width:  INNER_W   * scale,
    height: MONITOR_H * scale,
  }
  const ctrlBox = {
    width:  INNER_W * scale,
    height: CTRL_H  * scale,
  }

  const monitorInner: React.CSSProperties = {
    width: INNER_W, position: 'absolute', top: 0, left: 0,
    transform: `scale(${scale})`, transformOrigin: 'top left',
  }
  const ctrlInner: React.CSSProperties = {
    width: INNER_W, position: 'absolute', top: 0, left: 0,
    transform: `scale(${scale})`, transformOrigin: 'top left',
  }

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
            <button className="lbtn" onClick={()=>setShowAuth(true)}>▶ PLAY</button>
          )}
        </div>
      </div>

      {/* ── Arcade machine ─────────────────────────────────────────────────
           Portrait  → monitor on top, controller below (flex column)
           Landscape → monitor on left, controller on right (flex row)
      ─────────────────────────────────────────────────────────────────── */}
      <div className={`machine ${isLandscape ? 'land' : 'port'}`}>

        {/* Monitor column */}
        <div style={{ position:'relative', width: monitorBox.width, height: monitorBox.height, flexShrink: 0 }}>
          <div style={monitorInner}>
            <CRTMonitor score={score} highScore={highScore} username={player?.username||null} powerOn={powerOn}>
              <div className={powerOn?'power-on-anim':''} style={{width:'100%',height:'100%',position:'relative'}}>
                <SnakeGame
                  onScore={handleScore}
                  onGameOver={handleGameOver}
                  grantedPowerups={player?.powerups || []}
                  gameRef={gameRef}
                  onStart={()=>setIsPlaying(true)}
                  highScore={highScore}
                />
                {showPowerupMenu && player && player.powerups.length > 0 && (
                  <PowerupMenu
                    powerups={player.powerups}
                    onSelect={handleSelectPowerup}
                    onCancel={closePowerupMenu}
                  />
                )}
              </div>
            </CRTMonitor>
          </div>
        </div>

        {/* Controller column */}
        <div style={{ position:'relative', width: ctrlBox.width, height: ctrlBox.height, flexShrink: 0 }}>
          <div style={ctrlInner}>
            <ArcadeController
              onDirection={handleDirection}
              onRestart={handleRestart}
              onPowerupBtn={showPowerupMenu ? closePowerupMenu : openPowerupMenu}
              isPowerupMenuOpen={showPowerupMenu}
              grantedPowerups={player?.powerups || []}
              activePowerupKey={activePowerup}
              isLoggedIn={!!player}
            />
          </div>
        </div>

        {/* Leaderboard toggle button */}
        <button className="lbbtn" onClick={()=>setShowLeaderboard(v=>!v)} title="Leaderboard">🏆</button>
      </div>

      {/* ── Leaderboard ── */}
      {showLeaderboard && (
        <div className="lb">
          <div className="lbt">◆ LEADERBOARD ◆</div>
          <table className="lbtbl">
            <thead><tr><th>#</th><th>PLAYER</th><th>SCORE</th></tr></thead>
            <tbody>
              {leaderboard.map((e,i)=>(
                <tr key={i} className={e.username===player?.username?'me':''}>
                  <td>{i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}</td>
                  <td>{e.username}</td><td>{e.high_score}</td>
                </tr>
              ))}
              {leaderboard.length===0 && <tr><td colSpan={3} className="empty">NO SCORES YET</td></tr>}
            </tbody>
          </table>
          {!player && <button className="lb-cta" onClick={()=>{setShowLeaderboard(false);setShowAuth(true)}}>LOGIN TO SAVE SCORE</button>}
          <button className="lb-close" onClick={()=>setShowLeaderboard(false)}>✕ CLOSE</button>
        </div>
      )}

      {showAuth && <AuthModal onClose={()=>setShowAuth(false)} onAuth={(p:Player)=>{setPlayer(p);setHighScore(p.highScore)}} />}

      <style jsx>{`
        /* ────────────── BASE ────────────── */
        .desk {
          min-height: 100vh;
          background:
            radial-gradient(ellipse 70% 40% at 50% 100%,rgba(255,176,0,0.04) 0%,transparent 70%),
            linear-gradient(180deg,#0a0806,#0d0a06);
          display: flex;
          flex-direction: column;
          align-items: center;
          /* Safe-area padding for notched phones */
          padding:
            max(16px, env(safe-area-inset-top,16px))
            max(8px,  env(safe-area-inset-right,8px))
            max(24px, env(safe-area-inset-bottom,24px))
            max(8px,  env(safe-area-inset-left,8px));
          box-sizing: border-box;
          overflow-x: hidden;
          overflow-y: auto;
        }

        /* ────────────── TOP BAR ────────────── */
        .topbar {
          display:flex; justify-content:space-between; align-items:center;
          width:100%; max-width:540px;
          margin-bottom:12px; flex-shrink:0;
        }
        .tl { display:flex; align-items:baseline; gap:8px; }
        .gtitle {
          font-family:'Press Start 2P',monospace;
          font-size:clamp(9px,2.8vw,15px); color:#ffb000;
          text-shadow:0 0 18px rgba(255,176,0,0.5),0 0 36px rgba(255,176,0,0.25);
          animation:tp 3s ease-in-out infinite;
        }
        @keyframes tp{0%,100%{text-shadow:0 0 16px rgba(255,176,0,0.5),0 0 32px rgba(255,176,0,0.2)}50%{text-shadow:0 0 24px rgba(255,176,0,0.85),0 0 48px rgba(255,176,0,0.4)}}
        .ver { font-family:'Share Tech Mono',monospace; font-size:10px; color:#5a4820; }
        .tr  { display:flex; align-items:center; gap:8px; }
        .smsg { font-family:'Press Start 2P',monospace; font-size:clamp(5px,1.5vw,7px); color:#00e5ff; text-shadow:0 0 8px rgba(0,229,255,0.5); }
        .pbar { display:flex; align-items:center; gap:7px; }
        .pchip { font-family:'Press Start 2P',monospace; font-size:clamp(5px,1.5vw,7px); color:#ffb000; background:rgba(255,176,0,0.07); border:1px solid rgba(255,176,0,0.18); padding:5px 8px; border-radius:4px; max-width:120px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .alink { font-family:'Press Start 2P',monospace; font-size:10px; color:#00e5ff; text-decoration:none; border:1px solid rgba(0,229,255,0.25); padding:5px 8px; border-radius:4px; transition:all 0.15s; }
        .alink:hover { background:rgba(0,229,255,0.08); }
        .tbtn { font-family:'Press Start 2P',monospace; font-size:clamp(5px,1.5vw,6px); color:#6a5020; background:none; border:none; cursor:pointer; transition:color 0.15s; }
        .tbtn:hover { color:#ffb000; }
        .lbtn { font-family:'Press Start 2P',monospace; font-size:clamp(6px,1.8vw,8px); color:#ffb000; background:rgba(255,176,0,0.06); border:1px solid rgba(255,176,0,0.25); padding:8px 14px; border-radius:4px; cursor:pointer; transition:all 0.15s; touch-action:manipulation; }
        .lbtn:hover { background:rgba(255,176,0,0.12); }

        /* ────────────── MACHINE WRAPPER ────────────────
           The machine wrapper contains two absolutely-positioned-inside-container
           divs (monitor + controller). In portrait they stack vertically, in
           landscape they sit side by side.
        ─────────────────────────────────────────────── */
        .machine {
          position: relative;
          display: flex;
          flex-shrink: 0;
        }
        /* Portrait: flex-column, centered */
        .machine.port {
          flex-direction: column;
          align-items: center;
        }
        /* Landscape: flex-row, align tops */
        .machine.land {
          flex-direction: row;
          align-items: flex-start;
          gap: 0;
        }

        /* ────────────── LEADERBOARD TOGGLE ────────────── */
        .lbbtn {
          position:absolute; right:-10px; top:50px;
          background:rgba(0,0,0,0.6); border:1px solid rgba(255,176,0,0.2);
          border-radius:0 6px 6px 0; padding:8px; cursor:pointer;
          font-size:18px; transition:all 0.15s; touch-action:manipulation;
          -webkit-tap-highlight-color:transparent;
        }
        .lbbtn:hover { background:rgba(255,176,0,0.08); }

        /* ────────────── LEADERBOARD ────────────── */
        .lb {
          width:calc(100% - 24px); max-width:300px;
          background:linear-gradient(160deg,#1e1608,#120e04);
          border:1px solid rgba(255,176,0,0.2); border-radius:8px;
          padding:14px; margin-top:14px; flex-shrink:0;
          box-shadow:0 0 40px rgba(255,176,0,0.08);
          animation:fi 0.2s ease;
        }
        @keyframes fi{from{opacity:0;transform:translateY(-8px)}to{opacity:1}}
        .lbt { font-family:'Press Start 2P',monospace; font-size:7px; color:#ffb000; text-align:center; margin-bottom:10px; text-shadow:0 0 10px rgba(255,176,0,0.3); }
        .lbtbl { width:100%; border-collapse:collapse; }
        .lbtbl th { font-family:'Press Start 2P',monospace; font-size:5px; color:#6a5020; padding:4px; border-bottom:1px solid rgba(255,176,0,0.1); text-align:left; }
        .lbtbl td { font-family:'Share Tech Mono',monospace; font-size:12px; color:#aa8040; padding:5px 4px; border-bottom:1px solid rgba(255,176,0,0.05); }
        .lbtbl tr.me td { color:#ffb000; background:rgba(255,176,0,0.04); }
        .empty { text-align:center; color:#5a4020; font-size:10px; padding:10px; }
        .lb-cta  { width:100%; margin-top:10px; font-family:'Press Start 2P',monospace; font-size:5px; color:#ffb000; background:rgba(255,176,0,0.07); border:1px solid rgba(255,176,0,0.2); padding:9px; border-radius:4px; cursor:pointer; }
        .lb-close{ width:100%; margin-top:7px; font-family:'Press Start 2P',monospace; font-size:5px; color:#6a5020; background:none; border:1px solid rgba(255,176,0,0.1); padding:8px; border-radius:4px; cursor:pointer; transition:all 0.15s; }
        .lb-close:hover { color:#ffb000; border-color:rgba(255,176,0,0.3); }
      `}</style>
    </main>
  )
}
