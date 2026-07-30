process.env.JWT_SECRET = 'test-jwt-secret-1234567890';
process.env.JWT_EXPIRES_IN = '1h';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../../src/app');
const pool = require('../../src/config/db');

// ── Helpers ───────────────────────────────────────────────────────────────────
async function cleanDb() {
  // TRUNCATE in dependency order with CASCADE to avoid FK ordering issues
  await pool.query(
    'TRUNCATE TABLE order_items, orders, cart_items, products, users RESTART IDENTITY CASCADE'
  );
  // Keep categories — they are not test-specific; just remove the test one
  await pool.query("DELETE FROM categories WHERE name = 'Test Category'");
}

async function seedTestData() {
  // Insert a category (upsert — always returns a row)
  const catResult = await pool.query(
    `INSERT INTO categories (name) VALUES ('Test Category')
     ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`
  );
  const categoryId = catResult.rows[0].id;

  // Insert a product — upsert on name so RETURNING always yields a row.
  // products.name has a UNIQUE constraint (see migration).
  const prodResult = await pool.query(
    `INSERT INTO products (name, description, price, category_id, stock_qty)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (name) DO UPDATE
       SET description  = EXCLUDED.description,
           price        = EXCLUDED.price,
           category_id  = EXCLUDED.category_id,
           stock_qty    = EXCLUDED.stock_qty
     RETURNING id`,
    ['Test Product Alpha', 'A test product', 29.99, categoryId, 50]
  );
  const productId = prodResult.rows[0].id;

  if (!productId) {
    throw new Error('seedTestData: failed to create or find product "Test Product Alpha"');
  }

  return { categoryId, productId };
}

// ── Setup / Teardown ─────────────────────────────────────────────────────────
beforeAll(async () => {
  await cleanDb();
});

afterAll(async () => {
  await cleanDb();
  await pool.end();
});

// ── Auth tests ────────────────────────────────────────────────────────────────
describe('POST /api/auth/signup', () => {
  test('creates a new customer account and returns a JWT', async () => {
    const res = await request(app).post('/api/auth/signup').send({
      name: 'Test User',
      email: 'newuser@testshop.com',
      password: 'Password1',
    });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('newuser@testshop.com');
    expect(res.body.user.role).toBe('customer');
    expect(res.body.user.password_hash).toBeUndefined();
  });

  test('rejects duplicate email with 409', async () => {
    await request(app).post('/api/auth/signup').send({
      name: 'Dup User',
      email: 'dup@testshop.com',
      password: 'Password1',
    });
    const res = await request(app).post('/api/auth/signup').send({
      name: 'Dup User 2',
      email: 'dup@testshop.com',
      password: 'Password1',
    });
    expect(res.status).toBe(409);
  });

  test('returns 422 for invalid email', async () => {
    const res = await request(app).post('/api/auth/signup').send({
      name: 'Bad User',
      email: 'not-an-email',
      password: 'Password1',
    });
    expect(res.status).toBe(422);
    expect(res.body.errors).toBeDefined();
  });

  test('returns 422 for weak password', async () => {
    const res = await request(app).post('/api/auth/signup').send({
      name: 'Weak User',
      email: 'weak@testshop.com',
      password: 'short',
    });
    expect(res.status).toBe(422);
  });
});

describe('POST /api/auth/login', () => {
  beforeAll(async () => {
    await request(app).post('/api/auth/signup').send({
      name: 'Login Test',
      email: 'login@testshop.com',
      password: 'Password1',
    });
  });

  test('logs in with correct credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'login@testshop.com',
      password: 'Password1',
    });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  test('rejects wrong password with 401', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'login@testshop.com',
      password: 'WrongPassword1',
    });
    expect(res.status).toBe(401);
  });

  test('rejects unknown email with 401', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'nobody@testshop.com',
      password: 'Password1',
    });
    expect(res.status).toBe(401);
  });
});

// ── Admin route protection tests ──────────────────────────────────────────────
describe('Admin route protection', () => {
  let customerToken;

  beforeAll(async () => {
    const res = await request(app).post('/api/auth/signup').send({
      name: 'Customer Guard',
      email: 'custguard@testshop.com',
      password: 'Password1',
    });
    customerToken = res.body.token;
  });

  test('returns 401 without token', async () => {
    const res = await request(app).get('/api/admin/products');
    expect(res.status).toBe(401);
  });

  test('returns 403 for customer token', async () => {
    const res = await request(app)
      .get('/api/admin/products')
      .set('Authorization', `Bearer ${customerToken}`);
    expect(res.status).toBe(403);
  });
});

// ── Checkout flow integration test ────────────────────────────────────────────
describe('Checkout flow', () => {
  let token;
  let productId;

  beforeAll(async () => {
    const { productId: pid } = await seedTestData();
    productId = pid;

    const signupRes = await request(app).post('/api/auth/signup').send({
      name: 'Checkout User',
      email: 'checkout@testshop.com',
      password: 'Password1',
    });
    token = signupRes.body.token;
  });

  test('adds item to cart', async () => {
    expect(productId).toBeDefined(); // hard-fail rather than silently skip
    const res = await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId, quantity: 2 });
    expect(res.status).toBe(201);
    expect(res.body.items.length).toBeGreaterThan(0);
    expect(res.body.itemCount).toBe(2);
  });

  test('places an order and clears the cart', async () => {
    expect(productId).toBeDefined();
    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        shippingAddress: {
          name: 'Jane Doe',
          street: '123 Test St',
          city: 'Testville',
          state: 'Testshire',
          postcode: 'TE1 1ST',
          country: 'UK',
        },
        paymentDetails: { cardNumber: '4111111111111111', expiry: '12/26', cvv: '123' },
      });
    expect(orderRes.status).toBe(201);
    expect(orderRes.body.orderId).toBeDefined();
    expect(orderRes.body.transactionId).toBeDefined();

    // Cart should now be empty
    const cartRes = await request(app)
      .get('/api/cart')
      .set('Authorization', `Bearer ${token}`);
    expect(cartRes.status).toBe(200);
    expect(cartRes.body.items).toHaveLength(0);
  });

  test('cannot place order with empty cart', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        shippingAddress: {
          name: 'Jane Doe',
          street: '123 Test St',
          city: 'Testville',
          state: '',
          postcode: 'TE1 1ST',
          country: 'UK',
        },
        paymentDetails: { cardNumber: '4111111111111111', expiry: '12/26', cvv: '123' },
      });
    expect(res.status).toBe(400);
  });
});
