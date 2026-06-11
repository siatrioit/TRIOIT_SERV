"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.query = query;
exports.queryOne = queryOne;
const promise_1 = __importDefault(require("mysql2/promise"));
const pg_1 = require("pg");
const dbType = (process.env.DB_TYPE || 'mysql');
/** Universal query helper — atbalsta gan MySQL (cPanel), gan PostgreSQL */
async function query(sql, params = []) {
    if (dbType === 'postgres') {
        const pool = getPgPool();
        const result = await pool.query(sql, params);
        return result.rows;
    }
    const pool = getMysqlPool();
    const [rows] = await pool.execute(sql, params);
    return rows;
}
async function queryOne(sql, params = []) {
    const rows = await query(sql, params);
    return rows[0] ?? null;
}
let mysqlPool = null;
let pgPool = null;
function getMysqlPool() {
    if (!mysqlPool) {
        mysqlPool = promise_1.default.createPool({
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
function getPgPool() {
    if (!pgPool) {
        pgPool = new pg_1.Pool({
            host: process.env.DB_HOST,
            port: Number(process.env.DB_PORT) || 5432,
            database: process.env.DB_NAME,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
        });
    }
    return pgPool;
}
//# sourceMappingURL=pool.js.map