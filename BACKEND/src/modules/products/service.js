const pool = require('../../config/db');

/**
 * List products with optional search, category filter, and pagination.
 */
async function listProducts({ search, categoryId, page = 1, limit = 12, includeInactive = false }) {
  const offset = (page - 1) * limit;
  const params = [];
  const conditions = [];

  if (!includeInactive) {
    conditions.push('p.is_active = TRUE');
  }

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(p.name ILIKE $${params.length} OR p.description ILIKE $${params.length})`);
  }

  if (categoryId) {
    params.push(parseInt(categoryId, 10));
    conditions.push(`p.category_id = $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Count total matching rows for pagination metadata
  const countResult = await pool.query(
    `SELECT COUNT(*) FROM products p ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count, 10);

  // Fetch paginated rows
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
    pagination: {
      total,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get a single product by ID.
 */
async function getProductById(id, includeInactive = false) {
  const activeFilter = includeInactive ? '' : 'AND p.is_active = TRUE';
  const result = await pool.query(
    `SELECT p.id, p.name, p.description, p.price, p.image_url, p.stock_qty, p.is_active,
            p.created_at, p.updated_at,
            c.id AS category_id, c.name AS category_name
     FROM products p
     LEFT JOIN categories c ON p.category_id = c.id
     WHERE p.id = $1 ${activeFilter}`,
    [id]
  );
  return result.rows[0] || null;
}

module.exports = { listProducts, getProductById };
