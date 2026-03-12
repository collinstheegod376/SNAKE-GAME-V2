import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const powerups = await query(
    'SELECT pp.powerup_key as key, p.name, p.description, p.duration_ms, p.icon FROM player_powerups pp JOIN powerups p ON p.key = pp.powerup_key WHERE pp.player_id = $1',
    [session.sub]
  )
  return NextResponse.json({ powerups })
}
