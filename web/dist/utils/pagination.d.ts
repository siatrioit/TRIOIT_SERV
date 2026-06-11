export interface PaginationParams {
    page: number;
    limit: number;
    offset: number;
}
export declare function parsePagination(query: {
    page?: string;
    limit?: string;
}): PaginationParams;
export declare function buildPaginationMeta(total: number, page: number, limit: number): {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
};
//# sourceMappingURL=pagination.d.ts.map