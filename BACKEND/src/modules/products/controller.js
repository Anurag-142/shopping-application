const productService = require('./service');

async function list(req, res, next) {
  try {
    const { search, categoryId, page = 1, limit = 12 } = req.query;
    const result = await productService.listProducts({ search, categoryId, page, limit });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function detail(req, res, next) {
  try {
    const product = await productService.getProductById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }
    res.json(product);
  } catch (err) {
    next(err);
  }
}

module.exports = { list, detail };
