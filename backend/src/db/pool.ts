import mysql from 'mysql2/promise';
import { Pool as PgPool } from 'pg';

type DbType = 'mysql' | 'postgres';

const dbType = (process.env.DB_TYPE || 'mysql') as DbType;

/** Universal query helper — atbalsta gan MySQL (cPanel), gan PostgreSQL */
export async function query<T = unknown>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  if (dbType === 'postgres') {
    const pool = getPgPool();
    const result = await pool.query(sql, params);
    return result.rows as T[];
  }

  const pool = getMysqlPool();
  const [rows] = await pool.execute(sql, params);
  return rows as T[];
}

export async function queryOne<T = unknown>(
  sql: string,
  params: unknown[] = []
): Promise<T | null> {
  const rows = await query<T>(sql, params);
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
