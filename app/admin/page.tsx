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

const POWERUP_ICONS: Record<string, string> = {
  invisibility: '👻', rush: '⚡', ghost: '🌀', magnet: '🧲', freeze: '❄️', shield: '🛡️'
}

export default function AdminPage() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [tab, setTab] = useState<'dashboard' | 'players' | 'scores'>('dashboard')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [grantLoading, setGrantLoading] = useState<string>('')

  async function loadData() {
    try {
      const [statsRes, playersRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/players')
      ])
      if (statsRes.status === 403) { router.push('/'); return }
      const statsData = await statsRes.json()
      const playersData = await playersRes.json()
      setStats(statsData)
      setPlayers(playersData.players || [])
    } catch { setError('Failed to load data') }
    finally { setLoading(false) }
  }

  useEffect(() => { loadData() }, [])

  async function grantPowerup(playerId: string, powerupKey: string, action: 'grant' | 'revoke') {
    setGrantLoading(`${playerId}-${powerupKey}`)
    try {
      await fetch('/api/admin/grant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, powerupKey, action })
      })
      await loadData()
    } catch {}
    setGrantLoading('')
  }

  async function deletePlayer(playerId: string, username: string) {
    if (!confirm(`Delete player "${username}"? This is irreversible.`)) return
    await fetch('/api/admin/players', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId })
    })
    await loadData()
  }

  if (loading) return (
    <div className="admin-loading">
      <div className="loading-text">LOADING ADMIN...</div>
    </div>
  )
  if (error) return <div className="admin-loading"><div style={{ color: '#ff4444' }}>{error}</div></div>
  if (!stats) return null

  return (
    <div className="admin-shell">
      {/* Header */}
      <header className="admin-header">
        <div className="header-left">
          <a href="/" className="back-btn">◄ GAME</a>
          <div>
            <div className="admin-title">⚙ ADMIN DASHBOARD</div>
            <div className="admin-sub">SERPENT SX ARCADE CONTROL</div>
          </div>
        </div>
        <div className="header-stats">
          <div className="stat-chip">👥 {stats.totals.total_players} PLAYERS</div>
          <div className="stat-chip">🎮 {stats.totals.total_games} GAMES</div>
          <div className="stat-chip">🏆 {stats.totals.all_time_high} TOP SCORE</div>
          <div className="stat-chip">⚡ {stats.totals.total_powerup_uses} POWERUPS USED</div>
        </div>
      </header>

      {/* Tabs */}
      <div className="tab-bar">
        {(['dashboard', 'players', 'scores'] as const).map(t => (
          <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t === 'dashboard' ? '📊 DASHBOARD' : t === 'players' ? '👥 PLAYERS' : '🏅 SCORES'}
          </button>
        ))}
      </div>

      <div className="admin-content">
        {tab === 'dashboard' && (
          <div className="dashboard-grid">
            {/* Leaderboard */}
            <div className="panel wide">
              <div className="panel-title">🏆 LEADERBOARD</div>
              <table className="data-table">
                <thead><tr><th>#</th><th>PLAYER</th><th>HIGH SCORE</th><th>GAMES</th><th>POWERUPS</th></tr></thead>
                <tbody>
                  {stats.leaderboard.map((p, i) => (
                    <tr key={p.username}>
                      <td>{i + 1}</td>
                      <td className="username-cell">{p.username}</td>
                      <td className="score-cell">{p.high_score}</td>
                      <td>{p.games_played}</td>
                      <td>{p.powerups.map(k => POWERUP_ICONS[k] || '?').join(' ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Power-up usage */}
            <div className="panel">
              <div className="panel-title">⚡ POWER-UP USAGE</div>
              <div className="powerup-bars">
                {stats.powerupStats.map(ps => {
                  const maxUses = Math.max(...stats.powerupStats.map(x => Number(x.uses)), 1)
                  const pct = (Number(ps.uses) / maxUses) * 100
                  return (
                    <div key={ps.powerup_key} className="bar-row">
                      <div className="bar-label">{POWERUP_ICONS[ps.powerup_key]} {ps.powerup_key}</div>
                      <div className="bar-track">
                        <div className="bar-fill" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="bar-val">{ps.uses}</div>
                    </div>
                  )
                })}
                {stats.powerupStats.length === 0 && <div className="empty">No usage yet</div>}
              </div>
            </div>

            {/* Recent activity */}
            <div className="panel">
              <div className="panel-title">🕐 RECENT GAMES</div>
              <table className="data-table">
                <thead><tr><th>PLAYER</th><th>SCORE</th><th>POWERUP</th><th>WHEN</th></tr></thead>
                <tbody>
                  {stats.recentScores.map((s, i) => (
                    <tr key={i}>
                      <td className="username-cell">{s.username}</td>
                      <td className="score-cell">{s.score}</td>
                      <td>{s.powerup_used ? `${POWERUP_ICONS[s.powerup_used] || ''} ${s.powerup_used}` : '—'}</td>
                      <td className="date-cell">{new Date(s.created_at).toLocaleDateString()}</td>
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
                  <div className="player-card-header">
                    <span className="pc-username">{p.username}</span>
                    <div className="pc-stats">
                      <span>🏆 {p.high_score}</span>
                      <span>🎮 {p.games_played}</span>
                    </div>
                  </div>
                  <div className="powerup-grid-mgmt">
                    {stats.allPowerups.map(pu => {
                      const hasIt = p.powerups.includes(pu.key)
                      const loadingKey = `${p.id}-${pu.key}`
                      return (
                        <button
                          key={pu.key}
                          className={`pu-toggle ${hasIt ? 'granted' : 'not-granted'}`}
                          onClick={() => grantPowerup(p.id, pu.key, hasIt ? 'revoke' : 'grant')}
                          disabled={grantLoading === loadingKey}
                          title={`${hasIt ? 'Revoke' : 'Grant'} ${pu.name}`}
                        >
                          {grantLoading === loadingKey ? '...' : pu.icon}
                          <span className="pu-name">{pu.name.split(' ')[0]}</span>
                        </button>
                      )
                    })}
                  </div>
                  <button className="delete-btn" onClick={() => deletePlayer(p.id, p.username)}>✕ DELETE</button>
                </div>
              ))}
              {players.filter(p => !p.is_admin).length === 0 && (
                <div className="empty" style={{ padding: '40px', color: '#4a7a4a', fontFamily: 'Share Tech Mono', fontSize: '14px' }}>
                  No players yet. Share the game link!
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'scores' && (
          <div className="panel">
            <div className="panel-title">🏅 ALL SCORES</div>
            <table className="data-table full">
              <thead><tr><th>#</th><th>PLAYER</th><th>SCORE</th><th>POWERUP USED</th><th>DATE</th></tr></thead>
              <tbody>
                {stats.recentScores.map((s, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td className="username-cell">{s.username}</td>
                    <td className="score-cell">{s.score}</td>
                    <td>{s.powerup_used ? `${POWERUP_ICONS[s.powerup_used] || ''} ${s.powerup_used}` : '—'}</td>
                    <td className="date-cell">{new Date(s.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style jsx>{`
        .admin-shell {
          min-height: 100vh;
          background: #060c06;
          color: #00cc33;
          font-family: 'Share Tech Mono', monospace;
        }
        .admin-loading {
          display: flex; align-items: center; justify-content: center; min-height: 100vh;
          background: #060c06;
        }
        .loading-text {
          font-family: 'Press Start 2P', monospace; font-size: 12px; color: #00ff41;
          text-shadow: 0 0 20px rgba(0,255,65,0.5);
          animation: pulse 1s ease-in-out infinite;
        }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
        .admin-header {
          display: flex; justify-content: space-between; align-items: center;
          padding: 20px 32px; background: #0a100a;
          border-bottom: 1px solid rgba(0,255,65,0.15);
          flex-wrap: wrap; gap: 16px;
        }
        .header-left { display: flex; align-items: center; gap: 20px; }
        .back-btn {
          font-family: 'Press Start 2P', monospace; font-size: 7px; color: #4a8a4a;
          text-decoration: none; border: 1px solid rgba(0,255,65,0.2); padding: 8px 12px;
          border-radius: 4px; transition: all 0.15s;
        }
        .back-btn:hover { color: #00ff41; border-color: rgba(0,255,65,0.4); }
        .admin-title {
          font-family: 'Press Start 2P', monospace; font-size: 12px; color: #00ff41;
          text-shadow: 0 0 15px rgba(0,255,65,0.4);
        }
        .admin-sub { font-size: 10px; color: #3a6a3a; margin-top: 4px; letter-spacing: 2px; }
        .header-stats { display: flex; gap: 8px; flex-wrap: wrap; }
        .stat-chip {
          font-family: 'Press Start 2P', monospace; font-size: 6px; color: #00cc33;
          background: rgba(0,255,65,0.06); border: 1px solid rgba(0,255,65,0.15);
          padding: 8px 12px; border-radius: 4px; white-space: nowrap;
        }
        .tab-bar {
          display: flex; gap: 0; border-bottom: 1px solid rgba(0,255,65,0.15);
          background: #080e08;
        }
        .tab-btn {
          font-family: 'Press Start 2P', monospace; font-size: 7px; color: #3a6a3a;
          background: none; border: none; border-bottom: 2px solid transparent;
          padding: 14px 24px; cursor: pointer; transition: all 0.15s;
        }
        .tab-btn.active { color: #00ff41; border-bottom-color: #00ff41; background: rgba(0,255,65,0.04); }
        .tab-btn:hover:not(.active) { color: #00aa22; }
        .admin-content { padding: 24px 32px; }
        .dashboard-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .panel {
          background: #0a100a; border: 1px solid rgba(0,255,65,0.15);
          border-radius: 8px; padding: 20px; overflow: hidden;
        }
        .panel.wide { grid-column: span 2; }
        .panel-title {
          font-family: 'Press Start 2P', monospace; font-size: 8px; color: #00ff41;
          margin-bottom: 16px; text-shadow: 0 0 10px rgba(0,255,65,0.3);
        }
        .data-table { width: 100%; border-collapse: collapse; font-size: 12px; }
        .data-table.full { font-size: 11px; }
        .data-table th {
          font-family: 'Press Start 2P', monospace; font-size: 5px; color: #3a6a3a;
          padding: 8px; border-bottom: 1px solid rgba(0,255,65,0.1); text-align: left;
        }
        .data-table td {
          padding: 8px; border-bottom: 1px solid rgba(0,255,65,0.05); color: #008822;
        }
        .data-table tr:hover td { background: rgba(0,255,65,0.03); }
        .username-cell { color: #00cc33 !important; font-weight: bold; }
        .score-cell { color: #00ff41 !important; font-family: 'Press Start 2P', monospace; font-size: 9px !important; }
        .date-cell { color: #2a5a2a !important; font-size: 10px !important; }
        .powerup-bars { display: flex; flex-direction: column; gap: 10px; }
        .bar-row { display: flex; align-items: center; gap: 8px; }
        .bar-label { font-size: 10px; width: 120px; color: #00aa22; text-transform: capitalize; }
        .bar-track { flex: 1; height: 8px; background: rgba(0,255,65,0.08); border-radius: 4px; overflow: hidden; }
        .bar-fill { height: 100%; background: linear-gradient(90deg, #00aa22, #00ff41); border-radius: 4px; transition: width 0.5s; }
        .bar-val { width: 30px; text-align: right; font-size: 10px; color: #00cc33; }
        .empty { color: #3a5a3a; font-size: 12px; padding: 20px; text-align: center; }
        .players-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
        .player-card {
          background: rgba(0,0,0,0.3); border: 1px solid rgba(0,255,65,0.12);
          border-radius: 8px; padding: 16px; display: flex; flex-direction: column; gap: 12px;
        }
        .player-card-header { display: flex; justify-content: space-between; align-items: center; }
        .pc-username {
          font-family: 'Press Start 2P', monospace; font-size: 9px; color: #00ff41;
        }
        .pc-stats { display: flex; gap: 12px; font-size: 11px; color: #4a8a4a; }
        .powerup-grid-mgmt { display: flex; flex-wrap: wrap; gap: 6px; }
        .pu-toggle {
          display: flex; flex-direction: column; align-items: center; gap: 2px;
          padding: 8px 10px; border-radius: 6px; border: 1px solid; cursor: pointer;
          font-size: 16px; transition: all 0.15s;
        }
        .pu-toggle.granted {
          background: rgba(0,255,65,0.12); border-color: rgba(0,255,65,0.4);
          box-shadow: 0 0 8px rgba(0,255,65,0.15);
        }
        .pu-toggle.not-granted {
          background: rgba(0,0,0,0.2); border-color: rgba(0,255,65,0.1);
          opacity: 0.6;
        }
        .pu-toggle:hover:not(:disabled) { opacity: 1; }
        .pu-toggle:disabled { cursor: wait; }
        .pu-name {
          font-family: 'Press Start 2P', monospace; font-size: 4px;
          color: #4a8a4a; text-transform: uppercase;
        }
        .pu-toggle.granted .pu-name { color: #00cc33; }
        .delete-btn {
          background: rgba(255,0,0,0.05); border: 1px solid rgba(255,0,0,0.2);
          color: #cc2222; font-family: 'Press Start 2P', monospace; font-size: 5px;
          padding: 6px; border-radius: 4px; cursor: pointer; transition: all 0.15s;
          align-self: flex-start;
        }
        .delete-btn:hover { background: rgba(255,0,0,0.1); border-color: rgba(255,0,0,0.4); color: #ff4444; }
      `}</style>
    </div>
  )
}
