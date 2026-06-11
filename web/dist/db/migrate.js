"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runMigrations = runMigrations;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const promise_1 = __importDefault(require("mysql2/promise"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
function migrationsDir() {
    const candidates = [
        path_1.default.resolve(__dirname, '../../database/migrations'),
        path_1.default.resolve(process.cwd(), 'database/migrations'),
        path_1.default.resolve(process.cwd(), '../database/migrations'),
    ];
    for (const dir of candidates) {
        if (fs_1.default.existsSync(dir))
            return dir;
    }
    return candidates[0];
}
async function runMigrations() {
    const applied = [];
    if (!process.env.DB_NAME || !process.env.DB_USER) {
        throw new Error('DB_NAME and DB_USER must be set for migrations');
    }
    const dir = migrationsDir();
    if (!fs_1.default.existsSync(dir)) {
        console.warn(`[migrate] Nav migrāciju mapes: ${dir}`);
        return applied;
    }
    const connection = await promise_1.default.createConnection({
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
        const files = fs_1.default
            .readdirSync(dir)
            .filter((f) => /^\d+_.+\.sql$/i.test(f))
            .sort();
        for (const file of files) {
            const [existing] = await connection.query('SELECT name FROM schema_migrations WHERE name = ?', [file]);
            if (existing.length > 0)
                continue;
            const sql = fs_1.default.readFileSync(path_1.default.join(dir, file), 'utf8');
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
    }
    finally {
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
//# sourceMappingURL=migrate.js.map