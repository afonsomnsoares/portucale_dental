import pg from 'pg';

const { Pool } = pg;

// Singleton pool — reused across hot reloads in dev
const g = globalThis;
if (!g.__pgPool) {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is required');
  g.__pgPool = new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000,
  });
  g.__pgPool.on('error', (err) => {
    console.error('PostgreSQL pool error:', err.message);
  });
}

export const pool = g.__pgPool;

// Helper — run a query and return rows
export async function query(sql: string, params: unknown[] = []) {
  const client = await pool.connect();
  try {
    const res = await client.query(sql, params);
    return res.rows;
  } finally {
    client.release();
  }
}

// Helper — return first row only
export async function queryOne(sql: string, params: unknown[] = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

// Helper — run inside a transaction
export async function withTransaction(fn: (client: any) => Promise<any>) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
