import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'

async function checkAdmin() {
  const session = await getSession()
  if (!session?.isAdmin) throw new Error('Forbidden')
  return session
}

export async function GET() {
  try {
    await checkAdmin()
    const players = await query(`
      SELECT p.id, p.username, p.high_score, p.games_played, p.is_admin, p.created_at,
        COALESCE(json_agg(DISTINCT pp.powerup_key) FILTER (WHERE pp.powerup_key IS NOT NULL), '[]') as powerups
      FROM players p
      LEFT JOIN player_powerups pp ON pp.player_id = p.id
      GROUP BY p.id ORDER BY p.created_at DESC
    `)
    return NextResponse.json({ players })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === 'Forbidden' ? 403 : 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await checkAdmin()
    const { playerId } = await req.json()
    await query('DELETE FROM players WHERE id = $1 AND is_admin = FALSE', [playerId])
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 403 })
  }
}
