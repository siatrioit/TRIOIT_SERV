"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.query = query;
exports.queryOne = queryOne;
exports.withMysqlTransaction = withMysqlTransaction;
exports.queryConn = queryConn;
exports.queryOneConn = queryOneConn;
const promise_1 = __importDefault(require("mysql2/promise"));
const pg_1 = require("pg");
const dbType = (process.env.DB_TYPE || 'mysql');
/** mysql2 noraida undefined — konvertējam uz NULL */
function normalizeParams(params) {
    return params.map((p) => (p === undefined ? null : p));
}
/** Universal query helper — atbalsta gan MySQL (cPanel), gan PostgreSQL */
async function query(sql, params = []) {
    const bound = normalizeParams(params);
    if (dbType === 'postgres') {
        const pool = getPgPool();
        const result = await pool.query(sql, bound);
        return result.rows;
    }
    const pool = getMysqlPool();
    const [rows] = await pool.execute(sql, bound);
    return rows;
}
async function queryOne(sql, params = []) {
    const rows = await query(sql, params);
    return rows[0] ?? null;
}
/** MySQL transakcija (noliktavas kustības u.c.) */
async function withMysqlTransaction(fn) {
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
    }
    catch (err) {
        await conn.rollback();
        throw err;
    }
    finally {
        conn.release();
    }
}
async function queryConn(conn, sql, params = []) {
    const [rows] = await conn.execute(sql, normalizeParams(params));
    return rows;
}
async function queryOneConn(conn, sql, params = []) {
    const rows = await queryConn(conn, sql, params);
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