const adminService = require('./service');

async function listProducts(req, res, next) {
  try {
    const { page = 1, limit = 20, search, categoryId } = req.query;
    const result = await adminService.listAllProducts({ page, limit, search, categoryId });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function createProduct(req, res, next) {
  try {
    const { name, description, price, category_id, image_url, stock_qty, is_active } = req.body;
    if (!name || price === undefined || price === null) {
      return res.status(400).json({ error: 'name and price are required.' });
    }
    const product = await adminService.createProduct({
      name, description, price, category_id, image_url, stock_qty: stock_qty || 0, is_active,
    });
    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
}

async function updateProduct(req, res, next) {
  try {
    const product = await adminService.updateProduct(parseInt(req.params.id, 10), req.body);
    res.json(product);
  } catch (err) {
    next(err);
  }
}

async function deleteProduct(req, res, next) {
  try {
    const product = await adminService.deactivateProduct(parseInt(req.params.id, 10));
    res.json({ message: 'Product deactivated.', product });
  } catch (err) {
    next(err);
  }
}

module.exports = { listProducts, createProduct, updateProduct, deleteProduct };
