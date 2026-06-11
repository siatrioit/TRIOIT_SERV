import mysql from 'mysql2/promise';
/** Universal query helper — atbalsta gan MySQL (cPanel), gan PostgreSQL */
export declare function query<T = unknown>(sql: string, params?: unknown[]): Promise<T[]>;
export declare function queryOne<T = unknown>(sql: string, params?: unknown[]): Promise<T | null>;
/** MySQL transakcija (noliktavas kustības u.c.) */
export declare function withMysqlTransaction<T>(fn: (conn: mysql.PoolConnection) => Promise<T>): Promise<T>;
export declare function queryConn<T = unknown>(conn: mysql.PoolConnection, sql: string, params?: unknown[]): Promise<T[]>;
export declare function queryOneConn<T = unknown>(conn: mysql.PoolConnection, sql: string, params?: unknown[]): Promise<T | null>;
//# sourceMappingURL=pool.d.ts.map