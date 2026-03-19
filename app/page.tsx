'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import CRTMonitor       from '@/components/CRTMonitor'
import SnakeGame, { PowerupKey, PowerupData, GameAPI } from '@/components/SnakeGame'
import ArcadeController from '@/components/ArcadeController'
import PowerupMenu      from '@/components/PowerupMenu'
import AuthModal        from '@/components/AuthModal'

const INNER_W   = 500
const MONITOR_H = 638
const CTRL_H    = 178

// Power-up display metadata
const PU_ICONS: Record<string,string>  = { invisibility:'👻', rush:'⚡', ghost:'🌀', magnet:'🧲', freeze:'❄️', shield:'🛡️' }
const PU_COLORS: Record<string,string> = { invisibility:'#00e5ff', rush:'#ffb000', ghost:'#cc88ff', magnet:'#ff6644', freeze:'#88ccff', shield:'#88ff99' }
const PU_NAMES: Record<string,string>  = { invisibility:'INVISIBILITY', rush:'SPEED RUSH', ghost:'GHOST MODE', magnet:'MAGNET', freeze:'FREEZE', shield:'SHIELD' }
const PU_DURATIONS: Record<string, number | null> = { invisibility:5000, rush:8000, ghost:5000, magnet:6000, freeze:3000, shield:null }

interface Player { id:string; username:string; highScore:number; isAdmin:boolean; powerups:PowerupData[] }
interface LeaderEntry { username:string; high_score:number }

// ── Leaderboard overlay inside the monitor screen ─────────────────────────────
function LeaderboardOverlay({ entries, currentUser, isLoggedIn, onClose, onLogin }: {
  entries:LeaderEntry[]; currentUser?:string; isLoggedIn:boolean; onClose:()=>void; onLogin:()=>void
}) {
  return (
    <div className="lb-ov">
      <div className="lb-in">
        <div className="lb-ttl">🏆 LEADERBOARD</div>
        <div className="lb-wrap">
          <table className="lb-tbl">
            <thead><tr><th>RANK</th><th>PLAYER</th><th>SCORE</th></tr></thead>
            <tbody>
              {entries.length === 0 && <tr><td colSpan={3} className="lb-nil">NO SCORES YET</td></tr>}
              {entries.map((e,i) => (
                <tr key={i} className={[i===0?'r1':i===1?'r2':i===2?'r3':'', e.username===currentUser?'me':''].filter(Boolean).join(' ')}>
                  <td className="rc">{i===0?'🥇':i===1?'🥈':i===2?'🥉':`#${i+1}`}</td>
                  <td className="nc">{e.username}{e.username===currentUser?' ◀':''}</td>
                  <td className="sc">{String(e.high_score).padStart(6,'0')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!isLoggedIn && <button className="lb-cta" onClick={onLogin}>▶ LOGIN TO SAVE YOUR SCORE</button>}
        <button className="lb-cls" onClick={onClose}>✕ CLOSE</button>
      </div>

      <style jsx>{`
        .lb-ov { position:absolute; inset:0; z-index:70; background:rgba(8,5,2,0.96); border-radius:8px; display:flex; align-items:flex-start; justify-content:center; padding:16px 12px; animation:lf 0.18s ease; }
        @keyframes lf{from{opacity:0;transform:scale(0.97)}to{opacity:1;transform:scale(1)}}
        .lb-in { width:100%; max-width:340px; display:flex; flex-direction:column; gap:11px; }
        .lb-ttl { font-family:'Press Start 2P',monospace; font-size:11px; color:#ffb000; text-align:center; text-shadow:0 0 20px rgba(255,176,0,0.6),0 0 40px rgba(255,176,0,0.3); letter-spacing:2px; }
        .lb-wrap { overflow-y:auto; max-height:270px; border:1px solid rgba(255,176,0,0.15); border-radius:6px; }
        .lb-tbl { width:100%; border-collapse:collapse; }
        .lb-tbl thead { position:sticky; top:0; background:#0e0a04; z-index:1; }
        .lb-tbl th { font-family:'Press Start 2P',monospace; font-size:5px; color:#6a5020; padding:8px 6px; border-bottom:1px solid rgba(255,176,0,0.15); text-align:left; letter-spacing:1px; }
        .lb-tbl td { font-family:'Share Tech Mono',monospace; font-size:12px; color:#7a6030; padding:7px 6px; border-bottom:1px solid rgba(255,176,0,0.05); }
        .lb-tbl tr:last-child td { border-bottom:none; }
        .r1 td{background:rgba(255,176,0,0.08)} .r1 .nc,.r1 .sc{color:#ffb000}
        .r2 td{background:rgba(180,180,180,0.05)} .r2 .nc,.r2 .sc{color:#c0c0c0}
        .r3 td{background:rgba(180,100,40,0.06)} .r3 .nc,.r3 .sc{color:#cd7f32}
        .me .nc{color:#ffd060; font-style:italic}
        .rc{font-size:15px; width:36px; text-align:center}
        .nc{font-weight:bold; max-width:130px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap}
        .sc{font-family:'Press Start 2P',monospace; font-size:7px; text-align:right; color:#aa8040}
        .r1 .sc,.r2 .sc,.r3 .sc{color:inherit}
        .lb-nil{text-align:center;color:#4a3820;font-size:10px;padding:20px;font-family:'Press Start 2P',monospace}
        .lb-cta{font-family:'Press Start 2P',monospace;font-size:6px;color:#ffb000;background:rgba(255,176,0,0.07);border:1px solid rgba(255,176,0,0.25);border-radius:5px;padding:11px;cursor:pointer;width:100%;letter-spacing:0.5px;transition:all 0.15s;touch-action:manipulation}
        .lb-cta:hover{background:rgba(255,176,0,0.14)}
        .lb-cls{font-family:'Press Start 2P',monospace;font-size:5px;color:#5a4020;background:none;border:1px solid rgba(255,176,0,0.12);border-radius:5px;padding:10px;cursor:pointer;width:100%;transition:all 0.15s;touch-action:manipulation}
        .lb-cls:hover{color:#ffb000;border-color:rgba(255,176,0,0.3)}
      `}</style>
    </div>
  )
}

// ── Active power-up indicator (DOM overlay, always on top of canvas) ──────────
function PowerupIndicator({ puKey, endTime, totalDuration }: {
  puKey: PowerupKey; endTime: number | null; totalDuration: number | null
}) {
  const [timeLeft, setTimeLeft] = useState<number>(totalDuration ?? 0)

  useEffect(() => {
    if (!endTime || !totalDuration) { setTimeLeft(0); return }
    const update = () => setTimeLeft(Math.max(0, endTime - Date.now()))
    update()
    const id = setInterval(update, 80)
    return () => clearInterval(id)
  }, [endTime, totalDuration])

  const color    = PU_COLORS[puKey] ?? '#ffb000'
  const icon     = PU_ICONS[puKey]  ?? '⚡'
  const name     = PU_NAMES[puKey]  ?? puKey.toUpperCase()
  const progress = (totalDuration && totalDuration > 0) ? timeLeft / totalDuration : 1
  const isShield = !endTime || !totalDuration

  return (
    <div className="pu-ind">
      <span className="pu-ico">{icon}</span>
      <div className="pu-body">
        <div className="pu-name" style={{ color }}>{name}</div>
        {isShield ? (
          <div className="pu-shield">ABSORBS ONE HIT</div>
        ) : (
          <div className="pu-bar-outer">
            <div className="pu-bar-fill" style={{
              width: `${progress * 100}%`,
              background: color,
              boxShadow: `0 0 8px ${color}`,
            }}/>
            <span className="pu-timer">{(timeLeft / 1000).toFixed(1)}s</span>
          </div>
        )}
      </div>

      <style jsx>{`
        .pu-ind {
          position: absolute; top: 8px; right: 8px;
          display: flex; align-items: center; gap: 8px;
          background: rgba(6,4,2,0.92);
          border: 1px solid rgba(255,255,255,0.1);
          border-left: 3px solid ${color};
          border-radius: 6px; padding: 7px 10px;
          z-index: 40; pointer-events: none; min-width: 145px;
          animation: piIn 0.22s ease;
          box-shadow: 0 0 18px rgba(0,0,0,0.7), 0 0 22px ${color}30;
        }
        @keyframes piIn { from{opacity:0;transform:translateX(10px)} to{opacity:1;transform:translateX(0)} }
        .pu-ico  { font-size:20px; line-height:1; flex-shrink:0; }
        .pu-body { flex:1; display:flex; flex-direction:column; gap:4px; min-width:0; }
        .pu-name { font-family:'Press Start 2P',monospace; font-size:5px; letter-spacing:0.5px; white-space:nowrap; overflow:hidden; text-shadow:0 0 8px ${color}88; }
        .pu-shield { font-family:'Share Tech Mono',monospace; font-size:9px; color:#88ff99; animation:shb 1.2s ease-in-out infinite; }
        @keyframes shb { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .pu-bar-outer { position:relative; height:7px; background:rgba(255,255,255,0.08); border-radius:4px; overflow:hidden; }
        .pu-bar-fill  { position:absolute; left:0; top:0; bottom:0; border-radius:4px; transition:width 0.08s linear; }
        .pu-timer { position:absolute; inset:0; display:flex; align-items:center; justify-content:flex-end; padding-right:3px; font-family:'Press Start 2P',monospace; font-size:4px; color:rgba(255,255,255,0.9); text-shadow:0 0 4px rgba(0,0,0,0.9); }
      `}</style>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
export default function Home() {
  const [player,           setPlayer]           = useState<Player|null>(null)
  const [score,            setScore]            = useState(0)
  const [highScore,        setHighScore]        = useState(0)
  const [showAuth,         setShowAuth]         = useState(false)
  const [powerOn,          setPowerOn]          = useState(false)
  const [showPowerupMenu,  setShowPowerupMenu]  = useState(false)
  const [showLeaderboard,  setShowLeaderboard]  = useState(false)
  const [leaderboard,      setLeaderboard]      = useState<LeaderEntry[]>([])
  const [saveMsg,          setSaveMsg]          = useState('')
  const [scale,            setScale]            = useState(1)
  const [isLandscape,      setIsLandscape]      = useState(false)
  const [availablePowerups,setAvailablePowerups]= useState<PowerupData[]>([])

  // Active power-up — single source of truth, set atomically
  const [activePuKey,  setActivePuKey]  = useState<PowerupKey|null>(null)
  const [puEndTime,    setPuEndTime]    = useState<number|null>(null)
  const [puTotalDur,   setPuTotalDur]   = useState<number|null>(null)

  const gameRef      = useRef<GameAPI|null>(null)
  const highScoreRef = useRef(highScore)
  const activePuRef  = useRef<PowerupKey|null>(null)

  useEffect(() => { highScoreRef.current = highScore  }, [highScore])
  useEffect(() => { activePuRef.current  = activePuKey }, [activePuKey])

  // ── Viewport scale ────────────────────────────────────────────────────────
  useEffect(() => {
    function calc() {
      const vw = window.innerWidth, vh = window.innerHeight
      const land = vw > vh + 50
      setIsLandscape(land)
      setScale(land
        ? Math.min(1, (vh-32)/MONITOR_H, (vw-24)/(INNER_W*2+24))
        : Math.min(1, (vw-16)/INNER_W))
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
      if (d.player) { setPlayer(d.player); setHighScore(d.player.highScore) }
    })
    fetch('/api/scores').then(r => r.json()).then(d => { if (d.scores) setLeaderboard(d.scores) })
  }, [])

  useEffect(() => { setAvailablePowerups(player?.powerups ?? []) }, [player])

  // Auto-clear indicator when powerup expires (belt-and-suspenders; engine also expires)
  useEffect(() => {
    if (!puEndTime || !activePuKey) return
    const rem = puEndTime - Date.now()
    if (rem <= 0) { setActivePuKey(null); setPuEndTime(null); setPuTotalDur(null); return }
    const id = setTimeout(() => {
      setActivePuKey(null); setPuEndTime(null); setPuTotalDur(null)
    }, rem)
    return () => clearTimeout(id)
  }, [puEndTime, activePuKey])

  // ── Score / game over ─────────────────────────────────────────────────────
  const handleScore = useCallback((newScore: number) => {
    setScore(newScore)
    if (newScore > highScoreRef.current) setHighScore(newScore)
  }, [])

  const handleGameOver = useCallback(async (finalScore: number) => {
    // Clear powerup state on game over
    setActivePuKey(null); setPuEndTime(null); setPuTotalDur(null)
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
    setActivePuKey(null); setPuEndTime(null); setPuTotalDur(null)
    setShowPowerupMenu(false); setShowLeaderboard(false)
    gameRef.current?.restart()
  }, [])

  const openPowerupMenu = useCallback(() => {
    // ── FIXED: removed `!isPlaying` guard — it's React state and can be stale
    // immediately after restart(). `isRunning()` reads engine state directly
    // and is always accurate.
    if (activePuKey)                    return  // powerup already active
    if (availablePowerups.length === 0) return  // none left
    if (!gameRef.current?.isRunning())  return  // engine not running
    gameRef.current.pause()
    setShowPowerupMenu(true)
  }, [activePuKey, availablePowerups])

  const closePowerupMenu = useCallback(() => {
    setShowPowerupMenu(false)
    gameRef.current?.resume()
  }, [])

  const handleSelectPowerup = useCallback((key: PowerupKey) => {
    // 1. Close menu immediately
    setShowPowerupMenu(false)

    // 2. Consume one powerup from the finite list
    setAvailablePowerups(prev => {
      const i = prev.findIndex(p => p.key === key)
      return i === -1 ? prev : [...prev.slice(0, i), ...prev.slice(i + 1)]
    })

    // 3. Calculate end time (null = no timer, e.g. shield)
    const dur = PU_DURATIONS[key] ?? null
    const end = dur ? Date.now() + dur : null

    // 4. Set all indicator state at once
    setActivePuKey(key)
    setPuEndTime(end)
    setPuTotalDur(dur)

    // 5. Resume game then activate effect in engine
    //    resume() FIRST so g.paused=false, then activatePowerup sets g.powerup
    gameRef.current?.resume()
    gameRef.current?.activatePowerup(key, end ?? 0)
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

  const handleLbToggle = useCallback(() => {
    setShowLeaderboard(v => {
      if (!v) fetch('/api/scores').then(r => r.json()).then(d => { if (d.scores) setLeaderboard(d.scores) })
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

        {/* Monitor */}
        <div style={{ position:'relative', width:monBox.width, height:monBox.height, flexShrink:0 }}>
          <div style={innerStyle(MONITOR_H)}>
            <CRTMonitor score={score} highScore={highScore} username={player?.username ?? null} powerOn={powerOn}>
              <div className={powerOn ? 'power-on-anim' : ''} style={{ width:'100%', height:'100%', position:'relative' }}>

                {/* Game canvas — always mounted */}
                <SnakeGame
                  onScore={handleScore}
                  onGameOver={handleGameOver}
                  gameRef={gameRef}
                  onStart={() => {}}          /* isPlaying state no longer needed */
                  highScore={highScore}
                />

                {/* Power-up selection menu */}
                {showPowerupMenu && availablePowerups.length > 0 && (
                  <PowerupMenu
                    powerups={availablePowerups}
                    onSelect={handleSelectPowerup}
                    onCancel={closePowerupMenu}
                  />
                )}

                {/* Leaderboard overlay */}
                {showLeaderboard && !showPowerupMenu && (
                  <LeaderboardOverlay
                    entries={leaderboard}
                    currentUser={player?.username}
                    isLoggedIn={!!player}
                    onClose={() => setShowLeaderboard(false)}
                    onLogin={() => { setShowLeaderboard(false); setShowAuth(true) }}
                  />
                )}

                {/* Active power-up indicator — always on top */}
                {activePuKey && !showPowerupMenu && !showLeaderboard && (
                  <PowerupIndicator
                    key={`${activePuKey}-${puEndTime}`}
                    puKey={activePuKey}
                    endTime={puEndTime}
                    totalDuration={puTotalDur}
                  />
                )}

              </div>
            </CRTMonitor>
          </div>
        </div>

        {/* Controller */}
        <div style={{ position:'relative', width:ctlBox.width, height:ctlBox.height, flexShrink:0 }}>
          <div style={innerStyle(CTRL_H)}>
            <ArcadeController
              onDirection={handleDirection}
              onRestart={handleRestart}
              onPowerupBtn={showPowerupMenu ? closePowerupMenu : openPowerupMenu}
              isPowerupMenuOpen={showPowerupMenu}
              availablePowerups={availablePowerups}
              activePowerupKey={activePuKey}
              isLoggedIn={!!player}
            />
          </div>
        </div>

        <button className="lbbtn" onClick={handleLbToggle} title="Leaderboard">
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
            max(16px, env(safe-area-inset-top,16px))
            max(8px,  env(safe-area-inset-right,8px))
            max(24px, env(safe-area-inset-bottom,24px))
            max(8px,  env(safe-area-inset-left,8px));
          box-sizing: border-box; overflow-x: hidden; overflow-y: auto;
        }
        .topbar { display:flex; justify-content:space-between; align-items:center; width:100%; max-width:540px; margin-bottom:12px; flex-shrink:0; }
        .tl { display:flex; align-items:baseline; gap:8px; }
        .gtitle { font-family:'Press Start 2P',monospace; font-size:clamp(9px,2.8vw,15px); color:#ffb000; text-shadow:0 0 18px rgba(255,176,0,0.5),0 0 36px rgba(255,176,0,0.25); animation:tp 3s ease-in-out infinite; }
        @keyframes tp { 0%,100%{text-shadow:0 0 16px rgba(255,176,0,0.5),0 0 32px rgba(255,176,0,0.2)} 50%{text-shadow:0 0 24px rgba(255,176,0,0.85),0 0 48px rgba(255,176,0,0.4)} }
        .ver  { font-family:'Share Tech Mono',monospace; font-size:10px; color:#5a4820; }
        .tr   { display:flex; align-items:center; gap:8px; }
        .smsg { font-family:'Press Start 2P',monospace; font-size:clamp(5px,1.5vw,7px); color:#00e5ff; text-shadow:0 0 8px rgba(0,229,255,0.5); }
        .pbar { display:flex; align-items:center; gap:7px; }
        .pchip { font-family:'Press Start 2P',monospace; font-size:clamp(5px,1.5vw,7px); color:#ffb000; background:rgba(255,176,0,0.07); border:1px solid rgba(255,176,0,0.18); padding:5px 8px; border-radius:4px; max-width:120px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .alink { font-family:'Press Start 2P',monospace; font-size:10px; color:#00e5ff; text-decoration:none; border:1px solid rgba(0,229,255,0.25); padding:5px 8px; border-radius:4px; transition:all 0.15s; }
        .alink:hover { background:rgba(0,229,255,0.08); }
        .tbtn { font-family:'Press Start 2P',monospace; font-size:clamp(5px,1.5vw,6px); color:#6a5020; background:none; border:none; cursor:pointer; transition:color 0.15s; }
        .tbtn:hover { color:#ffb000; }
        .lbtn { font-family:'Press Start 2P',monospace; font-size:clamp(6px,1.8vw,8px); color:#ffb000; background:rgba(255,176,0,0.06); border:1px solid rgba(255,176,0,0.25); padding:8px 14px; border-radius:4px; cursor:pointer; transition:all 0.15s; touch-action:manipulation; }
        .lbtn:hover { background:rgba(255,176,0,0.12); }
        .machine { position:relative; display:flex; flex-shrink:0; }
        .machine.port { flex-direction:column; align-items:center; }
        .machine.land { flex-direction:row; align-items:flex-start; }
        .lbbtn { position:absolute; right:-10px; top:50px; background:rgba(0,0,0,0.7); border:1px solid rgba(255,176,0,0.22); border-radius:0 6px 6px 0; padding:8px 9px; cursor:pointer; font-size:18px; line-height:1; transition:all 0.15s; touch-action:manipulation; -webkit-tap-highlight-color:transparent; }
        .lbbtn:hover { background:rgba(255,176,0,0.1); }
      `}</style>
    </main>
  )
}
