'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Stats {
  totals: { total_players: number; total_games: number; all_time_high: number; total_powerup_uses: number }
  leaderboard: Array<{ username: string; high_score: number; games_played: number; powerups: string[] }>
  powerupStats: Array<{ powerup_key: string; uses: number }>
  recentScores: Array<{ username: string; score: number; powerup_used: string; created_at: string }>
  allPowerups: Array<{ id: number; name: string; key: string; icon: string; description: string }>
}
interface Player {
  id: string; username: string; high_score: number; games_played: number; is_admin: boolean; powerups: string[]
}

const PU_ICONS: Record<string, string> = { invisibility:'👻', rush:'⚡', ghost:'🌀', magnet:'🧲', freeze:'❄️', shield:'🛡️' }

export default function AdminPage() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [tab, setTab] = useState<'dashboard' | 'players' | 'scores'>('dashboard')
  const [loading, setLoading] = useState(true)
  const [grantLoading, setGrantLoading] = useState('')

  async function loadData() {
    try {
      const [sr, pr] = await Promise.all([fetch('/api/admin/stats'), fetch('/api/admin/players')])
      if (sr.status === 403) { router.push('/'); return }
      setStats(await sr.json())
      const pd = await pr.json()
      setPlayers(pd.players || [])
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { loadData() }, [])

  async function grantPowerup(playerId: string, powerupKey: string, action: 'grant' | 'revoke') {
    setGrantLoading(`${playerId}-${powerupKey}`)
    await fetch('/api/admin/grant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId, powerupKey, action })
    })
    await loadData()
    setGrantLoading('')
  }

  async function deletePlayer(id: string, username: string) {
    if (!confirm(`Delete "${username}"?`)) return
    await fetch('/api/admin/players', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId: id })
    })
    await loadData()
  }

  if (loading) return (
    <div className="admin-loading">
      <div className="loading-txt">LOADING...</div>
      <style jsx>{`.admin-loading{display:flex;align-items:center;justify-content:center;min-height:100vh;background:#0a0806}.loading-txt{font-family:'Press Start 2P',monospace;font-size:12px;color:#ffb000;text-shadow:0 0 20px rgba(255,176,0,0.5);animation:p 1s ease-in-out infinite}@keyframes p{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
    </div>
  )
  if (!stats) return null

  return (
    <div className="admin">
      <header className="admin-head">
        <div className="head-l">
          <a href="/" className="back">◄ GAME</a>
          <div>
            <div className="admin-title">⚙ CONTROL ROOM</div>
            <div className="admin-sub">SERPENT SX ARCADE ADMIN</div>
          </div>
        </div>
        <div className="head-stats">
          <div className="stat-chip">👥 {stats.totals.total_players}</div>
          <div className="stat-chip">🎮 {stats.totals.total_games}</div>
          <div className="stat-chip">🏆 {stats.totals.all_time_high}</div>
          <div className="stat-chip">⚡ {stats.totals.total_powerup_uses}</div>
        </div>
      </header>

      <div className="tab-bar">
        {(['dashboard','players','scores'] as const).map(t => (
          <button key={t} className={`tab ${tab===t?'active':''}`} onClick={() => setTab(t)}>
            {t==='dashboard'?'📊 DASHBOARD':t==='players'?'👥 PLAYERS':'🏅 SCORES'}
          </button>
        ))}
      </div>

      <div className="content">
        {tab === 'dashboard' && (
          <div className="dash-grid">
            <div className="panel wide">
              <div className="panel-title">🏆 LEADERBOARD</div>
              <table className="tbl">
                <thead><tr><th>#</th><th>PLAYER</th><th>HIGH SCORE</th><th>GAMES</th><th>POWERUPS</th></tr></thead>
                <tbody>
                  {stats.leaderboard.map((p,i) => (
                    <tr key={p.username}>
                      <td>{i+1}</td>
                      <td className="un">{p.username}</td>
                      <td className="sc">{p.high_score}</td>
                      <td>{p.games_played}</td>
                      <td>{p.powerups.map(k => PU_ICONS[k]||'?').join(' ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="panel">
              <div className="panel-title">⚡ POWER-UP USAGE</div>
              <div className="bars">
                {stats.powerupStats.map(ps => {
                  const max = Math.max(...stats.powerupStats.map(x => Number(x.uses)), 1)
                  const pct = (Number(ps.uses) / max) * 100
                  return (
                    <div key={ps.powerup_key} className="bar-row">
                      <div className="bar-lbl">{PU_ICONS[ps.powerup_key]} {ps.powerup_key}</div>
                      <div className="bar-track"><div className="bar-fill" style={{width:`${pct}%`}}/></div>
                      <div className="bar-n">{ps.uses}</div>
                    </div>
                  )
                })}
                {stats.powerupStats.length === 0 && <div className="empty">No usage yet</div>}
              </div>
            </div>

            <div className="panel">
              <div className="panel-title">🕐 RECENT GAMES</div>
              <table className="tbl">
                <thead><tr><th>PLAYER</th><th>SCORE</th><th>POWERUP</th><th>DATE</th></tr></thead>
                <tbody>
                  {stats.recentScores.map((s,i) => (
                    <tr key={i}>
                      <td className="un">{s.username}</td>
                      <td className="sc">{s.score}</td>
                      <td>{s.powerup_used?`${PU_ICONS[s.powerup_used]||''} ${s.powerup_used}`:'—'}</td>
                      <td className="dt">{new Date(s.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'players' && (
          <div className="panel">
            <div className="panel-title">👥 PLAYER MANAGEMENT</div>
            <div className="players-grid">
              {players.filter(p => !p.is_admin).map(p => (
                <div key={p.id} className="player-card">
                  <div className="pc-top">
                    <span className="pc-name">{p.username}</span>
                    <div className="pc-info">
                      <span>🏆 {p.high_score}</span>
                      <span>🎮 {p.games_played}</span>
                    </div>
                  </div>
                  <div className="pu-grid">
                    {stats.allPowerups.map(pu => {
                      const has = p.powerups.includes(pu.key)
                      const lk = `${p.id}-${pu.key}`
                      return (
                        <button
                          key={pu.key}
                          className={`pu-btn ${has?'on':'off'}`}
                          onClick={() => grantPowerup(p.id, pu.key, has?'revoke':'grant')}
                          disabled={grantLoading === lk}
                          title={`${has?'Revoke':'Grant'} ${pu.name}`}
                        >
                          {grantLoading===lk?'…':pu.icon}
                          <span className="pu-lbl">{pu.name.split(' ')[0]}</span>
                        </button>
                      )
                    })}
                  </div>
                  <button className="del-btn" onClick={() => deletePlayer(p.id, p.username)}>✕ DELETE</button>
                </div>
              ))}
              {players.filter(p=>!p.is_admin).length===0 && (
                <div className="empty" style={{padding:'40px'}}>No players yet.</div>
              )}
            </div>
          </div>
        )}

        {tab === 'scores' && (
          <div className="panel">
            <div className="panel-title">🏅 ALL SCORES</div>
            <table className="tbl">
              <thead><tr><th>#</th><th>PLAYER</th><th>SCORE</th><th>POWERUP</th><th>DATE</th></tr></thead>
              <tbody>
                {stats.recentScores.map((s,i) => (
                  <tr key={i}>
                    <td>{i+1}</td>
                    <td className="un">{s.username}</td>
                    <td className="sc">{s.score}</td>
                    <td>{s.powerup_used?`${PU_ICONS[s.powerup_used]||''} ${s.powerup_used}`:'—'}</td>
                    <td className="dt">{new Date(s.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style jsx>{`
        .admin { min-height:100vh; background:#0a0806; color:#aa8040; font-family:'Share Tech Mono',monospace; }
        .admin-head {
          display:flex; justify-content:space-between; align-items:center;
          padding:18px 28px; background:#0e0a04;
          border-bottom:1px solid rgba(255,176,0,0.12); flex-wrap:wrap; gap:14px;
        }
        .head-l { display:flex; align-items:center; gap:18px; }
        .back {
          font-family:'Press Start 2P',monospace; font-size:7px; color:#7a6030;
          text-decoration:none; border:1px solid rgba(255,176,0,0.18);
          padding:8px 12px; border-radius:4px; transition:all 0.15s;
        }
        .back:hover { color:var(--amber); border-color:rgba(255,176,0,0.4); }
        .admin-title {
          font-family:'Press Start 2P',monospace; font-size:11px; color:var(--amber);
          text-shadow:0 0 14px rgba(255,176,0,0.35);
        }
        .admin-sub { font-size:10px; color:#5a4020; margin-top:4px; letter-spacing:2px; }
        .head-stats { display:flex; gap:8px; flex-wrap:wrap; }
        .stat-chip {
          font-family:'Press Start 2P',monospace; font-size:6px; color:#aa8040;
          background:rgba(255,176,0,0.05); border:1px solid rgba(255,176,0,0.12);
          padding:7px 10px; border-radius:4px; white-space:nowrap;
        }
        .tab-bar {
          display:flex; border-bottom:1px solid rgba(255,176,0,0.12); background:#0c0904;
        }
        .tab {
          font-family:'Press Start 2P',monospace; font-size:6px; color:#5a4020;
          background:none; border:none; border-bottom:2px solid transparent;
          padding:14px 22px; cursor:pointer; transition:all 0.15s;
        }
        .tab.active { color:var(--amber); border-bottom-color:var(--amber); background:rgba(255,176,0,0.04); }
        .tab:hover:not(.active) { color:#8a6030; }
        .content { padding:22px 28px; }
        .dash-grid { display:grid; grid-template-columns:1fr 1fr; gap:18px; }
        .panel {
          background:#0e0a04; border:1px solid rgba(255,176,0,0.12);
          border-radius:8px; padding:18px; overflow:hidden;
        }
        .panel.wide { grid-column:span 2; }
        .panel-title {
          font-family:'Press Start 2P',monospace; font-size:7px; color:var(--amber);
          margin-bottom:14px; text-shadow:0 0 10px rgba(255,176,0,0.25);
        }
        .tbl { width:100%; border-collapse:collapse; font-size:12px; }
        .tbl th {
          font-family:'Press Start 2P',monospace; font-size:5px; color:#6a5020;
          padding:7px; border-bottom:1px solid rgba(255,176,0,0.08); text-align:left;
        }
        .tbl td { padding:7px; border-bottom:1px solid rgba(255,176,0,0.04); color:#7a6030; }
        .tbl tr:hover td { background:rgba(255,176,0,0.02); }
        .un { color:#aa8040 !important; font-weight:bold; }
        .sc { color:var(--amber) !important; font-family:'Press Start 2P',monospace; font-size:8px !important; }
        .dt { color:#4a3820 !important; font-size:10px !important; }
        .bars { display:flex; flex-direction:column; gap:10px; }
        .bar-row { display:flex; align-items:center; gap:8px; }
        .bar-lbl { font-size:10px; width:110px; color:#8a6030; text-transform:capitalize; }
        .bar-track { flex:1; height:8px; background:rgba(255,176,0,0.07); border-radius:4px; overflow:hidden; }
        .bar-fill { height:100%; background:linear-gradient(90deg,#8a5a00,#ffb000); border-radius:4px; transition:width 0.5s; }
        .bar-n { width:28px; text-align:right; font-size:10px; color:#aa8040; }
        .empty { color:#4a3820; font-size:12px; padding:20px; text-align:center; }
        .players-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:14px; }
        .player-card {
          background:rgba(0,0,0,0.3); border:1px solid rgba(255,176,0,0.1);
          border-radius:8px; padding:14px; display:flex; flex-direction:column; gap:10px;
        }
        .pc-top { display:flex; justify-content:space-between; align-items:center; }
        .pc-name { font-family:'Press Start 2P',monospace; font-size:8px; color:var(--amber); }
        .pc-info { display:flex; gap:10px; font-size:11px; color:#6a5020; }
        .pu-grid { display:flex; flex-wrap:wrap; gap:5px; }
        .pu-btn {
          display:flex; flex-direction:column; align-items:center; gap:2px;
          padding:7px 9px; border-radius:5px; border:1px solid; cursor:pointer;
          font-size:15px; transition:all 0.15s;
        }
        .pu-btn.on {
          background:rgba(255,176,0,0.1); border-color:rgba(255,176,0,0.4);
          box-shadow:0 0 8px rgba(255,176,0,0.12);
        }
        .pu-btn.off { background:rgba(0,0,0,0.2); border-color:rgba(255,176,0,0.08); opacity:0.55; }
        .pu-btn:hover:not(:disabled) { opacity:1; }
        .pu-btn:disabled { cursor:wait; }
        .pu-lbl { font-family:'Press Start 2P',monospace; font-size:4px; color:#6a5020; text-transform:uppercase; }
        .pu-btn.on .pu-lbl { color:#aa8040; }
        .del-btn {
          background:rgba(200,50,0,0.05); border:1px solid rgba(200,50,0,0.18);
          color:#aa3300; font-family:'Press Start 2P',monospace; font-size:5px;
          padding:6px; border-radius:4px; cursor:pointer; transition:all 0.15s; align-self:flex-start;
        }
        .del-btn:hover { background:rgba(200,50,0,0.1); color:#ff4400; border-color:rgba(200,50,0,0.4); }
        @media(max-width:640px) {
          .dash-grid { grid-template-columns:1fr; }
          .panel.wide { grid-column:span 1; }
          .content { padding:16px; }
          .admin-head { padding:14px 16px; }
        }
      `}</style>
    </div>
  )
}
