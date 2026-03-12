import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { score, powerupUsed } = await req.json()
  if (typeof score !== 'number' || score < 0) return NextResponse.json({ error: 'Invalid score' }, { status: 400 })

  await query('INSERT INTO scores (player_id, score, powerup_used) VALUES ($1, $2, $3)', [session.sub, score, powerupUsed || null])
  await query('UPDATE players SET games_played = games_played + 1 WHERE id = $1', [session.sub])
  await query('UPDATE players SET high_score = $1 WHERE id = $2 AND high_score < $1', [score, session.sub])

  if (powerupUsed) {
    await query('INSERT INTO powerup_usage_log (player_id, powerup_key) VALUES ($1, $2)', [session.sub, powerupUsed])
  }

  const [updated] = await query('SELECT high_score FROM players WHERE id = $1', [session.sub])
  return NextResponse.json({ ok: true, highScore: updated.high_score })
}

export async function GET() {
  const scores = await query(`
    SELECT p.username, MAX(s.score) as high_score, COUNT(s.id) as games
    FROM scores s JOIN players p ON p.id = s.player_id
    GROUP BY p.username ORDER BY high_score DESC LIMIT 10
  `)
  return NextResponse.json({ scores })
}
