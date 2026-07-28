const orderService = require('./service');

async function createOrder(req, res, next) {
  try {
    const { shippingAddress, paymentDetails } = req.body;

    // Basic shipping address validation
    if (!shippingAddress) {
      return res.status(400).json({ error: 'Shipping address is required.' });
    }
    const required = ['name', 'street', 'city', 'postcode', 'country'];
    const missing = required.filter((f) => !shippingAddress[f]);
    if (missing.length > 0) {
      return res.status(400).json({
        error: `Missing shipping fields: ${missing.join(', ')}.`,
      });
    }

    const result = await orderService.createOrder(
      req.user.userId,
      shippingAddress,
      paymentDetails
    );
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

async function listOrders(req, res, next) {
  try {
    const orders = await orderService.listOrders(req.user.userId);
    res.json(orders);
  } catch (err) {
    next(err);
  }
}

async function getOrderDetail(req, res, next) {
  try {
    const order = await orderService.getOrderDetail(
      parseInt(req.params.orderId, 10),
      req.user.userId
    );
    res.json(order);
  } catch (err) {
    next(err);
  }
}

module.exports = { createOrder, listOrders, getOrderDetail };
