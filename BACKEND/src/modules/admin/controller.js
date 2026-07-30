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

// POST /api/admin/products/bulk
// Body: { products: [ { name, price, ... }, ... ] }
async function bulkCreateProducts(req, res, next) {
  try {
    const { products } = req.body;
    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: 'products must be a non-empty array.' });
    }
    if (products.length > 200) {
      return res.status(400).json({ error: 'Maximum 200 products per bulk import.' });
    }
    // Validate each row has at minimum name + price
    const invalid = products.filter((p, i) => !p.name || p.price === undefined || p.price === null);
    if (invalid.length > 0) {
      return res.status(400).json({ error: `${invalid.length} product(s) missing name or price.` });
    }
    const created = await adminService.bulkCreateProducts(products);
    res.status(201).json({ created: created.length, products: created });
  } catch (err) {
    next(err);
  }
}

module.exports = { listProducts, createProduct, updateProduct, deleteProduct, bulkCreateProducts };
