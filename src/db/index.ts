import { Pool, QueryResult } from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:c$a$jnneJ,A5gxE@db.moolnigpzrcdgbuzrcrg.supabase.co:6543/postgres';

let pool: Pool;

if (process.env.NODE_ENV === 'production') {
  pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
} else {
  const globalWithPool = global as typeof globalThis & {
    _postgresPool?: Pool;
  };
  if (!globalWithPool._postgresPool) {
    globalWithPool._postgresPool = new Pool({
      connectionString,
      ssl: connectionString.includes('supabase') ? { rejectUnauthorized: false } : undefined
    });
  }
  pool = globalWithPool._postgresPool;
}

export async function query(text: string, params?: any[]): Promise<QueryResult<any>> {
  const res = await pool.query(text, params);
  return res;
}
