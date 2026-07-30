/**
 * Format a number as Indian Rupees (₹) using the en-IN locale.
 * e.g. formatINR(149.99) → "₹149.99"
 */
export function formatINR(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(parseFloat(value));
}
