import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  
  const [totals] = await query(`
    SELECT 
      (SELECT COUNT(*) FROM players WHERE is_admin = FALSE) as total_players,
      (SELECT COUNT(*) FROM scores) as total_games,
      (SELECT COALESCE(MAX(score),0) FROM scores) as all_time_high,
      (SELECT COUNT(*) FROM powerup_usage_log) as total_powerup_uses
  `)
  
  const leaderboard = await query(`
    SELECT p.username, p.high_score, p.games_played,
      COALESCE(json_agg(DISTINCT pp.powerup_key) FILTER (WHERE pp.powerup_key IS NOT NULL), '[]') as powerups
    FROM players p
    LEFT JOIN player_powerups pp ON pp.player_id = p.id
    WHERE p.is_admin = FALSE
    GROUP BY p.id ORDER BY p.high_score DESC LIMIT 20
  `)

  const powerupStats = await query(`
    SELECT powerup_key, COUNT(*) as uses
    FROM powerup_usage_log
    GROUP BY powerup_key ORDER BY uses DESC
  `)

  const recentScores = await query(`
    SELECT p.username, s.score, s.powerup_used, s.created_at
    FROM scores s JOIN players p ON p.id = s.player_id
    ORDER BY s.created_at DESC LIMIT 20
  `)

  const allPowerups = await query('SELECT * FROM powerups ORDER BY id')

  return NextResponse.json({ totals, leaderboard, powerupStats, recentScores, allPowerups })
}
