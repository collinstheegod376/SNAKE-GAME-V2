import { Pool } from 'pg'

let pool: Pool | null = null

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false,
        checkServerIdentity: () => undefined,
      },
      max: 10,
      idleTimeoutMillis: 30000,
    })
  }
  return pool
}

export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  const client = getPool()
  const result = await client.query(text, params)
  return result.rows
}
```

---

### Also check your DATABASE_URL

Make sure it ends with `?sslmode=no-verify` instead of `?sslmode=require`:
```
postgresql://postgres.xdmbvyittqfcotgejzac:yourpassword@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=no-verify