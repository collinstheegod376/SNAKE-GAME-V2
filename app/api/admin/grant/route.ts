import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'

async function checkAdmin() {
  const session = await getSession()
  if (!session?.isAdmin) throw new Error('Forbidden')
  return session
}

export async function POST(req: NextRequest) {
  try {
    const admin = await checkAdmin()
    const { playerId, powerupKey, action } = await req.json()
    if (action === 'grant') {
      await query(
        'INSERT INTO player_powerups (player_id, powerup_key, granted_by) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
        [playerId, powerupKey, admin.sub]
      )
    } else if (action === 'revoke') {
      await query('DELETE FROM player_powerups WHERE player_id = $1 AND powerup_key = $2', [playerId, powerupKey])
    }
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 403 })
  }
}
