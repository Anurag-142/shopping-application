require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const pool = require('../config/db');

const schema = `
-- ── Drop tables in reverse dependency order ───────────────────────────────────
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS cart_items CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ── users ─────────────────────────────────────────────────────────────────────
CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(100)        NOT NULL,
  email         VARCHAR(255)        NOT NULL UNIQUE,
  password_hash VARCHAR(255)        NOT NULL,
  role          VARCHAR(20)         NOT NULL DEFAULT 'customer'
                  CHECK (role IN ('customer', 'admin')),
  created_at    TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

-- ── categories ────────────────────────────────────────────────────────────────
CREATE TABLE categories (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── products ──────────────────────────────────────────────────────────────────
CREATE TABLE products (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(255)    NOT NULL,
  description   TEXT,
  price         NUMERIC(10, 2)  NOT NULL CHECK (price >= 0),
  category_id   INT             REFERENCES categories(id) ON DELETE SET NULL,
  image_url     VARCHAR(500),
  stock_qty     INT             NOT NULL DEFAULT 0 CHECK (stock_qty >= 0),
  is_active     BOOLEAN         NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ── cart_items ────────────────────────────────────────────────────────────────
CREATE TABLE cart_items (
  id         SERIAL PRIMARY KEY,
  user_id    INT            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id INT            NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity   INT            NOT NULL DEFAULT 1 CHECK (quantity > 0),
  added_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, product_id)
);

-- ── orders ────────────────────────────────────────────────────────────────────
CREATE TABLE orders (
  id               SERIAL PRIMARY KEY,
  user_id          INT             NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status           VARCHAR(30)     NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
  total_amount     NUMERIC(10, 2)  NOT NULL,
  shipping_name    VARCHAR(200),
  shipping_street  VARCHAR(300),
  shipping_city    VARCHAR(100),
  shipping_state   VARCHAR(100),
  shipping_postcode VARCHAR(20),
  shipping_country VARCHAR(100),
  transaction_id   VARCHAR(100),
  created_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ── order_items ───────────────────────────────────────────────────────────────
CREATE TABLE order_items (
  id         SERIAL PRIMARY KEY,
  order_id   INT            NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INT            REFERENCES products(id) ON DELETE SET NULL,
  name       VARCHAR(255)   NOT NULL,   -- snapshot at purchase time
  unit_price NUMERIC(10, 2) NOT NULL,   -- snapshot at purchase time
  quantity   INT            NOT NULL CHECK (quantity > 0)
);

-- ── Unique constraint on product name ────────────────────────────────────────
-- Required for ON CONFLICT (name) in seeds and test helpers.
ALTER TABLE products ADD CONSTRAINT products_name_unique UNIQUE (name);

-- ── Index for faster product search ──────────────────────────────────────────
CREATE INDEX idx_products_active ON products(is_active);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_cart_items_user ON cart_items(user_id);
CREATE INDEX idx_orders_user ON orders(user_id);
`;

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Running database migration...');
    await client.query(schema);
    console.log('✅ Migration complete — all tables created.');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
