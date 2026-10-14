import { paginate } from './pagination.dto';

describe('paginate', () => {
  it('computes meta for the first page', () => {
    const result = paginate([1, 2, 3], 45, 1, 20);
    expect(result.data).toHaveLength(3);
    expect(result.meta).toEqual({
      page: 1,
      pageSize: 20,
      total: 45,
      totalPages: 3,
      hasNext: true,
      hasPrevious: false,
    });
  });

  it('flags the last page correctly', () => {
    const result = paginate([1], 41, 3, 20);
    expect(result.meta.hasNext).toBe(false);
    expect(result.meta.hasPrevious).toBe(true);
  });

  it('handles an empty result set', () => {
    const result = paginate([], 0, 1, 20);
    expect(result.meta.totalPages).toBe(0);
    expect(result.meta.hasNext).toBe(false);
    expect(result.meta.hasPrevious).toBe(false);
  });
});
