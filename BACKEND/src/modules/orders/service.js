const { v4: uuidv4 } = require('uuid');
const pool = require('../../config/db');
const { isStockSufficient, calculateCartTotals } = require('../../utils/cartHelpers');

/**
 * Simulated payment processor — always succeeds.
 * In production, replace this with a real gateway call.
 */
function processPayment(paymentDetails) {
  // Validate minimal structure only
  if (!paymentDetails || !paymentDetails.cardNumber) {
    throw Object.assign(new Error('Payment details are required.'), { status: 400 });
  }
  return {
    success: true,
    transactionId: uuidv4(),
    message: 'Payment simulation successful.',
  };
}

/**
 * Create an order from the user's current cart.
 * Uses a DB transaction — all inserts succeed or none do.
 */
async function createOrder(userId, shippingAddress, paymentDetails) {
  // 1. Process mock payment first (fail fast before touching DB)
  const paymentResult = processPayment(paymentDetails);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 2. Fetch current cart
    const cartResult = await client.query(
      `SELECT ci.product_id, ci.quantity,
              p.name, p.price AS unit_price, p.stock_qty
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ci.user_id = $1`,
      [userId]
    );

    if (cartResult.rows.length === 0) {
      const err = new Error('Cannot place an order with an empty cart.');
      err.status = 400;
      throw err;
    }

    const items = cartResult.rows;

    // 3. Re-validate stock for every item
    const stockErrors = items
      .filter((item) => !isStockSufficient(item.quantity, item.stock_qty))
      .map((item) => `"${item.name}" — requested ${item.quantity}, only ${item.stock_qty} in stock`);

    if (stockErrors.length > 0) {
      const err = new Error(`Insufficient stock for: ${stockErrors.join('; ')}`);
      err.status = 400;
      throw err;
    }

    // 4. Compute total
    const { total } = calculateCartTotals(items);

    // 5. Insert order
    const orderResult = await client.query(
      `INSERT INTO orders
         (user_id, total_amount, shipping_name, shipping_street, shipping_city,
          shipping_state, shipping_postcode, shipping_country, transaction_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [
        userId,
        total,
        shippingAddress.name,
        shippingAddress.street,
        shippingAddress.city,
        shippingAddress.state || '',
        shippingAddress.postcode,
        shippingAddress.country,
        paymentResult.transactionId,
      ]
    );
    const orderId = orderResult.rows[0].id;

    // 6. Insert order_items (price snapshot)
    for (const item of items) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, name, unit_price, quantity)
         VALUES ($1, $2, $3, $4, $5)`,
        [orderId, item.product_id, item.name, item.unit_price, item.quantity]
      );

      // 7. Decrement stock
      await client.query(
        'UPDATE products SET stock_qty = stock_qty - $1 WHERE id = $2',
        [item.quantity, item.product_id]
      );
    }

    // 8. Clear cart
    await client.query('DELETE FROM cart_items WHERE user_id = $1', [userId]);

    await client.query('COMMIT');

    return { orderId, total, transactionId: paymentResult.transactionId };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * List all orders for a user (summary only).
 */
async function listOrders(userId) {
  const result = await pool.query(
    `SELECT id, status, total_amount, created_at,
            shipping_city, shipping_country
     FROM orders
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows;
}

/**
 * Get full detail of a single order (including line items).
 * Throws 404 if not found or 403 if it belongs to a different user.
 */
async function getOrderDetail(orderId, userId) {
  const orderResult = await pool.query(
    `SELECT id, user_id, status, total_amount, created_at, transaction_id,
            shipping_name, shipping_street, shipping_city,
            shipping_state, shipping_postcode, shipping_country
     FROM orders WHERE id = $1`,
    [orderId]
  );

  if (orderResult.rows.length === 0) {
    throw Object.assign(new Error('Order not found.'), { status: 404 });
  }

  const order = orderResult.rows[0];
  if (order.user_id !== userId) {
    throw Object.assign(new Error('Access denied.'), { status: 403 });
  }

  const itemsResult = await pool.query(
    `SELECT oi.id, oi.product_id, oi.name, oi.unit_price, oi.quantity,
            p.image_url
     FROM order_items oi
     LEFT JOIN products p ON oi.product_id = p.id
     WHERE oi.order_id = $1`,
    [orderId]
  );

  return { ...order, items: itemsResult.rows };
}

module.exports = { createOrder, listOrders, getOrderDetail };
