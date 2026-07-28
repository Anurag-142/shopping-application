const pool = require('../../config/db');
const { isStockSufficient, calculateCartTotals } = require('../../utils/cartHelpers');

/**
 * Fetch the full cart for a user (joined with product data).
 */
async function getCart(userId) {
  const result = await pool.query(
    `SELECT ci.id, ci.product_id, ci.quantity,
            p.name, p.price AS unit_price, p.image_url, p.stock_qty
     FROM cart_items ci
     JOIN products p ON ci.product_id = p.id
     WHERE ci.user_id = $1
     ORDER BY ci.added_at DESC`,
    [userId]
  );
  const items = result.rows;
  const totals = calculateCartTotals(items);
  return { items, ...totals };
}

/**
 * Add an item to the cart or increment quantity if it already exists.
 */
async function addItem(userId, productId, quantity) {
  // Verify product exists and is active
  const prodResult = await pool.query(
    'SELECT id, stock_qty FROM products WHERE id = $1 AND is_active = TRUE',
    [productId]
  );
  if (prodResult.rows.length === 0) {
    const err = new Error('Product not found or unavailable.');
    err.status = 404;
    throw err;
  }
  const product = prodResult.rows[0];

  // Check for existing cart item to compute combined quantity
  const existing = await pool.query(
    'SELECT quantity FROM cart_items WHERE user_id = $1 AND product_id = $2',
    [userId, productId]
  );
  const currentQty = existing.rows.length > 0 ? existing.rows[0].quantity : 0;
  const newQty = currentQty + parseInt(quantity, 10);

  if (!isStockSufficient(newQty, product.stock_qty)) {
    const err = new Error(`Only ${product.stock_qty} item(s) available in stock.`);
    err.status = 400;
    throw err;
  }

  // Upsert: insert or increment
  await pool.query(
    `INSERT INTO cart_items (user_id, product_id, quantity)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, product_id)
     DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity`,
    [userId, productId, parseInt(quantity, 10)]
  );

  return getCart(userId);
}

/**
 * Update the quantity of a specific cart item.
 * If quantity <= 0, removes the item.
 */
async function updateItem(userId, productId, quantity) {
  const qty = parseInt(quantity, 10);

  if (qty <= 0) {
    return removeItem(userId, productId);
  }

  // Check stock
  const prodResult = await pool.query(
    'SELECT stock_qty FROM products WHERE id = $1',
    [productId]
  );
  if (prodResult.rows.length > 0 && !isStockSufficient(qty, prodResult.rows[0].stock_qty)) {
    const err = new Error(`Only ${prodResult.rows[0].stock_qty} item(s) available in stock.`);
    err.status = 400;
    throw err;
  }

  await pool.query(
    'UPDATE cart_items SET quantity = $1 WHERE user_id = $2 AND product_id = $3',
    [qty, userId, productId]
  );
  return getCart(userId);
}

/**
 * Remove a specific item from the cart.
 */
async function removeItem(userId, productId) {
  await pool.query(
    'DELETE FROM cart_items WHERE user_id = $1 AND product_id = $2',
    [userId, productId]
  );
  return getCart(userId);
}

/**
 * Clear all items in the user's cart (used post-checkout).
 */
async function clearCart(userId, client = pool) {
  await client.query('DELETE FROM cart_items WHERE user_id = $1', [userId]);
}

module.exports = { getCart, addItem, updateItem, removeItem, clearCart };
