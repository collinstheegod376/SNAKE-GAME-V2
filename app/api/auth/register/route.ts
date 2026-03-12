import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { query } from '@/lib/db'
import { signToken } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json()
    if (!username || !password) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    if (username.length < 3 || username.length > 20) return NextResponse.json({ error: 'Username must be 3-20 chars' }, { status: 400 })
    if (password.length < 6) return NextResponse.json({ error: 'Password min 6 chars' }, { status: 400 })
    if (!/^[a-zA-Z0-9_]+$/.test(username)) return NextResponse.json({ error: 'Username: letters, numbers, _ only' }, { status: 400 })

    const existing = await query('SELECT id FROM players WHERE username = $1', [username])
    if (existing.length > 0) return NextResponse.json({ error: 'Username taken' }, { status: 409 })

    const hash = await bcrypt.hash(password, 10)
    const [player] = await query(
      'INSERT INTO players (username, password_hash) VALUES ($1, $2) RETURNING id, username, is_admin, high_score',
      [username, hash]
    )

    // Grant default invisibility power-up
    await query(
      'INSERT INTO player_powerups (player_id, powerup_key) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [player.id, 'invisibility']
    )

    const token = await signToken({ sub: player.id, username: player.username, isAdmin: player.is_admin })
    const res = NextResponse.json({ player: { id: player.id, username: player.username, highScore: player.high_score, isAdmin: player.is_admin } })
    res.cookies.set('auth_token', token, { httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 7, path: '/' })
    return res
  } catch (e: any) {
    console.error(e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
