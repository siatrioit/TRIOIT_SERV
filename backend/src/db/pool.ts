import mysql from 'mysql2/promise';
import { Pool as PgPool } from 'pg';

type DbType = 'mysql' | 'postgres';

const dbType = (process.env.DB_TYPE || 'mysql') as DbType;

type SqlParam = string | number | boolean | null | Date;

/** mysql2 noraida undefined — konvertējam uz NULL */
function normalizeParams(params: unknown[]): SqlParam[] {
  return params.map((p) => (p === undefined ? null : p)) as SqlParam[];
}

/** Universal query helper — atbalsta gan MySQL (cPanel), gan PostgreSQL */
export async function query<T = unknown>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  const bound = normalizeParams(params);

  if (dbType === 'postgres') {
    const pool = getPgPool();
    const result = await pool.query(sql, bound);
    return result.rows as T[];
  }

  const pool = getMysqlPool();
  const [rows] = await pool.execute(sql, bound);
  return rows as T[];
}

export async function queryOne<T = unknown>(
  sql: string,
  params: unknown[] = []
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

/** MySQL transakcija (noliktavas kustības u.c.) */
export async function withMysqlTransaction<T>(
  fn: (conn: mysql.PoolConnection) => Promise<T>
): Promise<T> {
  if (dbType !== 'mysql') {
    throw new Error('Transactions require MySQL');
  }
  const pool = getMysqlPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
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

export async function queryConn<T = unknown>(
  conn: mysql.PoolConnection,
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  const [rows] = await conn.execute(sql, normalizeParams(params));
  return rows as T[];
}

export async function queryOneConn<T = unknown>(
  conn: mysql.PoolConnection,
  sql: string,
  params: unknown[] = []
): Promise<T | null> {
  const rows = await queryConn<T>(conn, sql, params);
  return rows[0] ?? null;
}

let mysqlPool: mysql.Pool | null = null;
let pgPool: PgPool | null = null;

function getMysqlPool(): mysql.Pool {
  if (!mysqlPool) {
    mysqlPool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 3306,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      waitForConnections: true,
      connectionLimit: 10,
    });
  }
  return mysqlPool;
}

function getPgPool(): PgPool {
  if (!pgPool) {
    pgPool = new PgPool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });
  }
  return pgPool;
}
