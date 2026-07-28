require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const bcrypt = require('bcryptjs');
const pool = require('../config/db');

async function seed() {
  const client = await pool.connect();
  try {
    console.log('Seeding database...');
    await client.query('BEGIN');

    // ── Categories ────────────────────────────────────────────────────────────
    const catResult = await client.query(`
      INSERT INTO categories (name) VALUES
        ('Electronics'),
        ('Clothing'),
        ('Books'),
        ('Home & Kitchen'),
        ('Sports & Outdoors')
      ON CONFLICT (name) DO NOTHING
      RETURNING id, name
    `);

    // Fetch all categories to get their IDs
    const cats = await client.query('SELECT id, name FROM categories ORDER BY id');
    const categoryMap = {};
    cats.rows.forEach((c) => { categoryMap[c.name] = c.id; });

    // ── Products ──────────────────────────────────────────────────────────────
    const products = [
      {
        name: 'Wireless Noise-Cancelling Headphones',
        description: 'Premium over-ear headphones with 30-hour battery life, active noise cancellation, and Bluetooth 5.0 connectivity.',
        price: 149.99,
        category: 'Electronics',
        image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
        stock_qty: 45,
      },
      {
        name: 'Smartphone Stand & Wireless Charger',
        description: 'Adjustable aluminium stand with integrated 15W Qi wireless charging. Compatible with all Qi-enabled devices.',
        price: 39.99,
        category: 'Electronics',
        image_url: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400',
        stock_qty: 80,
      },
      {
        name: '4K Ultra HD Smart TV — 55"',
        description: 'Crystal-clear 4K display with built-in streaming apps, voice control, and HDR10+ support.',
        price: 599.00,
        category: 'Electronics',
        image_url: 'https://images.unsplash.com/photo-1593359677879-a4bb92f4834a?w=400',
        stock_qty: 12,
      },
      {
        name: 'Men\'s Classic Slim-Fit Chinos',
        description: 'Versatile stretch chinos in a modern slim fit. Available in multiple colours. Machine washable.',
        price: 49.95,
        category: 'Clothing',
        image_url: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=400',
        stock_qty: 150,
      },
      {
        name: 'Women\'s Lightweight Running Jacket',
        description: 'Wind-resistant, packable running jacket with reflective details and thumb-hole cuffs.',
        price: 79.00,
        category: 'Clothing',
        image_url: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400',
        stock_qty: 60,
      },
      {
        name: 'Unisex Graphic Hoodie',
        description: 'Soft 80% cotton, 20% polyester blend hoodie. Ribbed cuffs and hem. True-to-size fit.',
        price: 55.00,
        category: 'Clothing',
        image_url: 'https://images.unsplash.com/photo-1556821840-3a63f15732ce?w=400',
        stock_qty: 200,
      },
      {
        name: 'Clean Code — Robert C. Martin',
        description: 'A handbook of agile software craftsmanship. Essential reading for every professional developer.',
        price: 34.99,
        category: 'Books',
        image_url: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=400',
        stock_qty: 30,
      },
      {
        name: 'The Pragmatic Programmer — 20th Anniversary Edition',
        description: 'David Thomas and Andrew Hunt\'s classic guide to software craftsmanship, fully revised and updated.',
        price: 39.95,
        category: 'Books',
        image_url: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400',
        stock_qty: 25,
      },
      {
        name: 'Stainless Steel French Press — 1 Litre',
        description: 'Double-wall insulated French press keeps coffee hot for hours. Dishwasher safe. 1000 ml capacity.',
        price: 29.99,
        category: 'Home & Kitchen',
        image_url: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=400',
        stock_qty: 70,
      },
      {
        name: 'Non-Stick Ceramic Frying Pan — 28 cm',
        description: 'PFOA-free ceramic coating. Compatible with all hob types including induction. Oven safe to 220°C.',
        price: 44.99,
        category: 'Home & Kitchen',
        image_url: 'https://images.unsplash.com/photo-1585237672814-8f85a8118bf6?w=400',
        stock_qty: 55,
      },
      {
        name: 'Adjustable Dumbbell Set — 2×20 kg',
        description: 'Space-saving adjustable dumbbells with quick-lock dial. Replaces 15 pairs of traditional dumbbells.',
        price: 229.00,
        category: 'Sports & Outdoors',
        image_url: 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=400',
        stock_qty: 20,
      },
      {
        name: 'Yoga Mat — 6 mm Non-Slip',
        description: 'Eco-friendly TPE yoga mat with alignment lines. Extra-wide, non-slip surface. Carry strap included.',
        price: 28.00,
        category: 'Sports & Outdoors',
        image_url: 'https://images.unsplash.com/photo-1601925228120-2507e63f4f1c?w=400',
        stock_qty: 100,
      },
    ];

    for (const p of products) {
      await client.query(
        `INSERT INTO products (name, description, price, category_id, image_url, stock_qty)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT DO NOTHING`,
        [p.name, p.description, p.price, categoryMap[p.category], p.image_url, p.stock_qty]
      );
    }

    // ── Admin user ────────────────────────────────────────────────────────────
    const adminPassword = await bcrypt.hash('Admin@123', 12);
    await client.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, 'admin')
       ON CONFLICT (email) DO NOTHING`,
      ['Admin User', 'admin@shop.com', adminPassword]
    );

    // ── Demo customer ─────────────────────────────────────────────────────────
    const customerPassword = await bcrypt.hash('Customer@123', 12);
    await client.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, 'customer')
       ON CONFLICT (email) DO NOTHING`,
      ['Demo Customer', 'customer@shop.com', customerPassword]
    );

    await client.query('COMMIT');
    console.log('✅ Seed complete!');
    console.log('   Admin:    admin@shop.com / Admin@123');
    console.log('   Customer: customer@shop.com / Customer@123');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
