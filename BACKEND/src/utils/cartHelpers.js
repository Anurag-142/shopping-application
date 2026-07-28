/**
 * Calculates the subtotal and total for an array of cart items.
 *
 * @param {Array<{ unit_price: string|number, quantity: number }>} items
 * @returns {{ subtotal: number, total: number, itemCount: number }}
 */
function calculateCartTotals(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return { subtotal: 0, total: 0, itemCount: 0 };
  }

  const subtotal = items.reduce((acc, item) => {
    const price = parseFloat(item.unit_price || item.price || 0);
    const qty = parseInt(item.quantity, 10) || 0;
    return acc + price * qty;
  }, 0);

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    total: Math.round(subtotal * 100) / 100,
    itemCount: items.reduce((acc, item) => acc + (parseInt(item.quantity, 10) || 0), 0),
  };
}

/**
 * Checks whether a requested quantity is within available stock.
 *
 * @param {number} requested
 * @param {number} available
 * @returns {boolean}
 */
function isStockSufficient(requested, available) {
  const req = parseInt(requested, 10);
  const avail = parseInt(available, 10);
  if (isNaN(req) || isNaN(avail)) return false;
  if (req <= 0) return false;
  return req <= avail;
}

module.exports = { calculateCartTotals, isStockSufficient };
