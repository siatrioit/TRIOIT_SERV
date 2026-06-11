import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import type { RowDataPacket } from 'mysql2';
import dotenv from 'dotenv';

dotenv.config();

function migrationsDir(): string {
  const candidates = [
    path.resolve(__dirname, '../../database/migrations'),
    path.resolve(process.cwd(), 'database/migrations'),
    path.resolve(process.cwd(), '../database/migrations'),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(dir)) return dir;
  }
  return candidates[0];
}

export async function runMigrations(): Promise<string[]> {
  const applied: string[] = [];

  if (!process.env.DB_NAME || !process.env.DB_USER) {
    throw new Error('DB_NAME and DB_USER must be set for migrations');
  }

  const dir = migrationsDir();
  if (!fs.existsSync(dir)) {
    console.warn(`[migrate] Nav migrāciju mapes: ${dir}`);
    return applied;
  }

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true,
  });

  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    const files = fs
      .readdirSync(dir)
      .filter((f) => /^\d+_.+\.sql$/i.test(f))
      .sort();

    for (const file of files) {
      const [existing] = await connection.query<RowDataPacket[]>(
        'SELECT name FROM schema_migrations WHERE name = ?',
        [file]
      );
      if (existing.length > 0) continue;

      const sql = fs.readFileSync(path.join(dir, file), 'utf8');
      console.log(`[migrate] Applying ${file}...`);
      await connection.query(sql);
      await connection.query('INSERT INTO schema_migrations (name) VALUES (?)', [file]);
      applied.push(file);
      console.log(`[migrate] OK ${file}`);
    }

    if (applied.length === 0) {
      console.log('[migrate] Nav jaunu migrāciju');
    }

    return applied;
  } finally {
    await connection.end();
  }
}

if (require.main === module) {
  runMigrations()
    .then((names) => {
      console.log(names.length ? `Applied: ${names.join(', ')}` : 'Up to date');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[migrate] FAILED:', err.message || err);
      process.exit(1);
    });
}
