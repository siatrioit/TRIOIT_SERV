import { describe, it, expect } from 'vitest';
import { parsePagination, buildPaginationMeta } from './pagination';

describe('parsePagination', () => {
  it('defaults to page 1, limit 20', () => {
    const result = parsePagination({});
    expect(result).toEqual({ page: 1, limit: 20, offset: 0 });
  });

  it('calculates offset correctly', () => {
    const result = parsePagination({ page: '3', limit: '10' });
    expect(result).toEqual({ page: 3, limit: 10, offset: 20 });
  });

  it('caps limit at 100', () => {
    const result = parsePagination({ limit: '500' });
    expect(result.limit).toBe(100);
  });
});

describe('buildPaginationMeta', () => {
  it('calculates total pages', () => {
    expect(buildPaginationMeta(45, 1, 20)).toEqual({
      page: 1,
      limit: 20,
      total: 45,
      totalPages: 3,
    });
  });
});
