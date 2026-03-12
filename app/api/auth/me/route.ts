import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ player: null })
  const [player] = await query(
    'SELECT id, username, high_score, games_played, is_admin FROM players WHERE id = $1',
    [session.sub]
  )
  if (!player) return NextResponse.json({ player: null })
  const powerups = await query(
    'SELECT pp.powerup_key, p.name, p.description, p.duration_ms, p.icon FROM player_powerups pp JOIN powerups p ON p.key = pp.powerup_key WHERE pp.player_id = $1',
    [session.sub]
  )
  return NextResponse.json({ player: { id: player.id, username: player.username, highScore: player.high_score, gamesPlayed: player.games_played, isAdmin: player.is_admin, powerups } })
}
