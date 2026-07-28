const { calculateCartTotals, isStockSufficient } = require('../../src/utils/cartHelpers');

describe('calculateCartTotals', () => {
  test('returns zeros for an empty array', () => {
    expect(calculateCartTotals([])).toEqual({ subtotal: 0, total: 0, itemCount: 0 });
  });

  test('returns zeros for null/undefined input', () => {
    expect(calculateCartTotals(null)).toEqual({ subtotal: 0, total: 0, itemCount: 0 });
    expect(calculateCartTotals(undefined)).toEqual({ subtotal: 0, total: 0, itemCount: 0 });
  });

  test('calculates totals for a single item', () => {
    const items = [{ unit_price: '19.99', quantity: 2 }];
    const result = calculateCartTotals(items);
    expect(result.subtotal).toBe(39.98);
    expect(result.total).toBe(39.98);
    expect(result.itemCount).toBe(2);
  });

  test('calculates totals for multiple items', () => {
    const items = [
      { unit_price: '10.00', quantity: 3 },
      { unit_price: '5.50', quantity: 2 },
      { unit_price: '99.99', quantity: 1 },
    ];
    const result = calculateCartTotals(items);
    // 10*3 + 5.5*2 + 99.99*1 = 30 + 11 + 99.99 = 140.99
    expect(result.subtotal).toBe(140.99);
    expect(result.total).toBe(140.99);
    expect(result.itemCount).toBe(6);
  });

  test('rounds to 2 decimal places', () => {
    const items = [{ unit_price: '0.1', quantity: 3 }];
    const result = calculateCartTotals(items);
    expect(result.subtotal).toBe(0.30);
  });

  test('handles numeric (non-string) prices', () => {
    const items = [{ unit_price: 25.5, quantity: 4 }];
    const result = calculateCartTotals(items);
    expect(result.subtotal).toBe(102.0);
  });

  test('handles items with price field (alternative key)', () => {
    const items = [{ price: '50.00', quantity: 2 }];
    const result = calculateCartTotals(items);
    expect(result.subtotal).toBe(100.0);
  });
});

describe('isStockSufficient', () => {
  test('returns true when requested equals available', () => {
    expect(isStockSufficient(5, 5)).toBe(true);
  });

  test('returns true when requested is less than available', () => {
    expect(isStockSufficient(3, 10)).toBe(true);
  });

  test('returns false when requested exceeds available', () => {
    expect(isStockSufficient(10, 5)).toBe(false);
  });

  test('returns false for zero quantity', () => {
    expect(isStockSufficient(0, 10)).toBe(false);
  });

  test('returns false for negative quantity', () => {
    expect(isStockSufficient(-1, 10)).toBe(false);
  });

  test('returns false for zero available stock', () => {
    expect(isStockSufficient(1, 0)).toBe(false);
  });

  test('returns false for NaN inputs', () => {
    expect(isStockSufficient('abc', 10)).toBe(false);
    expect(isStockSufficient(5, 'xyz')).toBe(false);
  });
});
