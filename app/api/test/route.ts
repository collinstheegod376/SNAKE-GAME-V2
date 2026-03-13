import { NextResponse } from 'next/server'
import { getPool } from '@/lib/db'

export async function GET() {
  try {
    const pool = getPool()
    await pool.query('SELECT 1')
    const tables = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public'
    `)
    return NextResponse.json({
      success: true,
      database: 'connected',
      tables: tables.rows.map((r: any) => r.table_name),
      env: {
        DATABASE_URL_set: !!process.env.DATABASE_URL,
        JWT_SECRET_set: !!process.env.JWT_SECRET,
      }
    })
  } catch (e: any) {
    return NextResponse.json({
      success: false,
      error: e.message,
      env: {
        DATABASE_URL_set: !!process.env.DATABASE_URL,
        JWT_SECRET_set: !!process.env.JWT_SECRET,
      }
    }, { status: 500 })
  }
}