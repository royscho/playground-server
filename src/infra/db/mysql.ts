import mysql, { Pool, PoolConnection } from 'mysql2/promise';
import { getConfig } from '../config';

let pool: Pool;

export function getPool(): Pool {
  if (!pool) {
    const cfg = getConfig();
    pool = mysql.createPool({
      host: cfg.mysql.host,
      port: cfg.mysql.port,
      user: cfg.mysql.user,
      password: cfg.mysql.password,
      database: cfg.mysql.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }
  return pool;
}

export async function query<T>(sql: string, params?: unknown[]): Promise<T[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [rows] = await (getPool() as any).execute(sql, params);
  return rows as T[];
}

export async function withTransaction<T>(
  fn: (conn: PoolConnection) => Promise<T>,
): Promise<T> {
  const conn = await getPool().getConnection();
  await conn.beginTransaction();
  try {
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function connectMySQL(): Promise<void> {
  const conn = await getPool().getConnection();
  conn.release();
}

export async function closeMySQL(): Promise<void> {
  if (pool) {
    await pool.end();
    (pool as unknown) = undefined;
  }
}
