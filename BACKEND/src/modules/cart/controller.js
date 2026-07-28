const cartService = require('./service');

async function getCart(req, res, next) {
  try {
    const cart = await cartService.getCart(req.user.userId);
    res.json(cart);
  } catch (err) {
    next(err);
  }
}

async function addItem(req, res, next) {
  try {
    const { productId, quantity = 1 } = req.body;
    if (!productId) {
      return res.status(400).json({ error: 'productId is required.' });
    }
    if (parseInt(quantity, 10) < 1) {
      return res.status(400).json({ error: 'Quantity must be at least 1.' });
    }
    const cart = await cartService.addItem(req.user.userId, productId, quantity);
    res.status(201).json(cart);
  } catch (err) {
    next(err);
  }
}

async function updateItem(req, res, next) {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;
    if (quantity === undefined) {
      return res.status(400).json({ error: 'quantity is required.' });
    }
    const cart = await cartService.updateItem(req.user.userId, productId, quantity);
    res.json(cart);
  } catch (err) {
    next(err);
  }
}

async function removeItem(req, res, next) {
  try {
    const cart = await cartService.removeItem(req.user.userId, req.params.productId);
    res.json(cart);
  } catch (err) {
    next(err);
  }
}

async function clearCart(req, res, next) {
  try {
    await cartService.clearCart(req.user.userId);
    res.json({ message: 'Cart cleared.' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getCart, addItem, updateItem, removeItem, clearCart };
