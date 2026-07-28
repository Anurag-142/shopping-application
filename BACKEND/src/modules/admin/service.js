const pool = require('../../config/db');

async function listAllProducts({ page = 1, limit = 20, search, categoryId } = {}) {
  const offset = (page - 1) * limit;
  const params = [];
  const conditions = [];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(p.name ILIKE $${params.length} OR p.description ILIKE $${params.length})`);
  }
  if (categoryId) {
    params.push(parseInt(categoryId, 10));
    conditions.push(`p.category_id = $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM products p ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count, 10);

  params.push(limit);
  params.push(offset);
  const dataResult = await pool.query(
    `SELECT p.id, p.name, p.description, p.price, p.image_url, p.stock_qty, p.is_active,
            c.id AS category_id, c.name AS category_name
     FROM products p
     LEFT JOIN categories c ON p.category_id = c.id
     ${whereClause}
     ORDER BY p.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return {
    products: dataResult.rows,
    pagination: { total, page: parseInt(page, 10), limit: parseInt(limit, 10), totalPages: Math.ceil(total / limit) },
  };
}

async function createProduct({ name, description, price, category_id, image_url, stock_qty, is_active = true }) {
  const result = await pool.query(
    `INSERT INTO products (name, description, price, category_id, image_url, stock_qty, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [name, description || '', price, category_id, image_url || '', parseInt(stock_qty, 10), is_active]
  );
  return result.rows[0];
}

async function updateProduct(id, fields) {
  // Build dynamic SET clause from provided fields
  const allowed = ['name', 'description', 'price', 'category_id', 'image_url', 'stock_qty', 'is_active'];
  const updates = [];
  const values = [];

  for (const key of allowed) {
    if (fields[key] !== undefined) {
      values.push(fields[key]);
      updates.push(`${key} = $${values.length}`);
    }
  }

  if (updates.length === 0) {
    throw Object.assign(new Error('No valid fields provided for update.'), { status: 400 });
  }

  values.push(id);
  values.push(new Date()); // updated_at

  const result = await pool.query(
    `UPDATE products
     SET ${updates.join(', ')}, updated_at = $${values.length}
     WHERE id = $${values.length - 1}
     RETURNING *`,
    values
  );

  if (result.rows.length === 0) {
    throw Object.assign(new Error('Product not found.'), { status: 404 });
  }
  return result.rows[0];
}

async function deactivateProduct(id) {
  const result = await pool.query(
    `UPDATE products SET is_active = FALSE, updated_at = NOW()
     WHERE id = $1 RETURNING id, name, is_active`,
    [id]
  );
  if (result.rows.length === 0) {
    throw Object.assign(new Error('Product not found.'), { status: 404 });
  }
  return result.rows[0];
}

module.exports = { listAllProducts, createProduct, updateProduct, deactivateProduct };
