/** Universal query helper — atbalsta gan MySQL (cPanel), gan PostgreSQL */
export declare function query<T = unknown>(sql: string, params?: unknown[]): Promise<T[]>;
export declare function queryOne<T = unknown>(sql: string, params?: unknown[]): Promise<T | null>;
//# sourceMappingURL=pool.d.ts.map