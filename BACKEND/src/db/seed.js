require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const bcrypt = require('bcryptjs');
const pool = require('../config/db');

async function seed() {
  const client = await pool.connect();
  try {
    console.log('Seeding database...');
    await client.query('BEGIN');

    // ── Categories ────────────────────────────────────────────────────────────
    await client.query(`
      INSERT INTO categories (name) VALUES
        ('Electronics'),
        ('Clothing'),
        ('Books'),
        ('Home & Kitchen'),
        ('Sports & Outdoors')
      ON CONFLICT (name) DO NOTHING
    `);

    const cats = await client.query('SELECT id, name FROM categories ORDER BY id');
    const cm = {};
    cats.rows.forEach((c) => { cm[c.name] = c.id; });

    // ── Products (50 items) ───────────────────────────────────────────────────
    const products = [
      // ── Electronics (12) ──────────────────────────────────────────────────
      { name: 'Wireless Noise-Cancelling Headphones', category: 'Electronics', price: 14999, stock_qty: 45,
        image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
        description: 'Premium over-ear headphones with 30-hour battery, ANC & Bluetooth 5.0.' },
      { name: 'Smartphone Stand & Wireless Charger', category: 'Electronics', price: 3999, stock_qty: 80,
        image_url: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400',
        description: 'Adjustable aluminium stand with 15W Qi wireless charging.' },
      { name: '4K Ultra HD Smart TV — 55"', category: 'Electronics', price: 59900, stock_qty: 12,
        image_url: 'https://images.unsplash.com/photo-1593359677879-a4bb92f4834a?w=400',
        description: 'Crystal-clear 4K with built-in streaming apps and HDR10+ support.' },
      { name: 'Mechanical Gaming Keyboard', category: 'Electronics', price: 6499, stock_qty: 60,
        image_url: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400',
        description: 'RGB backlit mechanical keyboard with blue switches, N-key rollover.' },
      { name: 'Wireless Gaming Mouse', category: 'Electronics', price: 4299, stock_qty: 75,
        image_url: 'https://images.unsplash.com/photo-1527814050087-3793815479db?w=400',
        description: '16000 DPI optical sensor, 70-hour battery, ergonomic design.' },
      { name: 'USB-C 100W Laptop Charger', category: 'Electronics', price: 2199, stock_qty: 120,
        image_url: 'https://images.unsplash.com/photo-1600267175161-cfaa711b4a81?w=400',
        description: 'GaN technology, foldable plug, compatible with laptops & phones.' },
      { name: 'Portable Bluetooth Speaker', category: 'Electronics', price: 3499, stock_qty: 55,
        image_url: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400',
        description: '360° sound, IPX7 waterproof, 20-hour playback, USB-C charging.' },
      { name: 'Smart Watch Series 8', category: 'Electronics', price: 24999, stock_qty: 30,
        image_url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400',
        description: 'AMOLED display, health monitoring, GPS, 18-day battery life.' },
      { name: '27" 4K IPS Monitor', category: 'Electronics', price: 34999, stock_qty: 20,
        image_url: 'https://images.unsplash.com/photo-1547082299-de196ea013d6?w=400',
        description: '3840×2160, 99% sRGB, 144Hz refresh rate, USB-C & HDMI inputs.' },
      { name: 'Noise-Cancelling Earbuds', category: 'Electronics', price: 9999, stock_qty: 90,
        image_url: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400',
        description: 'True wireless earbuds with ANC, 36-hour total battery, IPX4.' },
      { name: 'External SSD 1TB', category: 'Electronics', price: 8999, stock_qty: 65,
        image_url: 'https://images.unsplash.com/photo-1597848212624-a19eb35e2651?w=400',
        description: 'USB 3.2 Gen2, 1050MB/s read speed, compact metal body.' },
      { name: 'Wi-Fi 6 Router', category: 'Electronics', price: 7499, stock_qty: 40,
        image_url: 'https://images.unsplash.com/photo-1606904825846-647eb07f5be2?w=400',
        description: 'AX3000, dual-band, MU-MIMO, covers up to 250 sq. m.' },

      // ── Clothing (10) ─────────────────────────────────────────────────────
      { name: "Men's Classic Slim-Fit Chinos", category: 'Clothing', price: 4995, stock_qty: 150,
        image_url: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=400',
        description: 'Versatile stretch chinos in a modern slim fit. Machine washable.' },
      { name: "Women's Lightweight Running Jacket", category: 'Clothing', price: 7900, stock_qty: 60,
        image_url: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400',
        description: 'Wind-resistant, packable with reflective details and thumb-hole cuffs.' },
      { name: 'Unisex Graphic Hoodie', category: 'Clothing', price: 5500, stock_qty: 200,
        image_url: 'https://images.unsplash.com/photo-1556821840-3a63f15732ce?w=400',
        description: 'Soft 80% cotton, 20% polyester blend. Ribbed cuffs and hem.' },
      { name: "Men's Formal Oxford Shirt", category: 'Clothing', price: 2499, stock_qty: 180,
        image_url: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=400',
        description: 'Classic fit, wrinkle-resistant cotton blend, button-down collar.' },
      { name: "Women's Floral Wrap Dress", category: 'Clothing', price: 3299, stock_qty: 90,
        image_url: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=400',
        description: 'Lightweight viscose, adjustable waist tie, midi length.' },
      { name: 'Unisex Canvas Sneakers', category: 'Clothing', price: 2799, stock_qty: 110,
        image_url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400',
        description: 'Classic canvas upper, vulcanised rubber sole, 10 colour options.' },
      { name: "Men's Slim Denim Jacket", category: 'Clothing', price: 5999, stock_qty: 70,
        image_url: 'https://images.unsplash.com/photo-1601063458289-77247ba485ec?w=400',
        description: 'Classic indigo wash, button front, chest pockets, slim fit.' },
      { name: "Women's High-Waist Yoga Pants", category: 'Clothing', price: 2399, stock_qty: 130,
        image_url: 'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=400',
        description: 'Four-way stretch, moisture-wicking, squat-proof fabric.' },
      { name: 'Unisex Puffer Jacket', category: 'Clothing', price: 8999, stock_qty: 55,
        image_url: 'https://images.unsplash.com/photo-1539533113208-f6df8cc8b543?w=400',
        description: 'Lightweight 600-fill down, packable, water-resistant shell.' },
      { name: "Men's Running Shorts", category: 'Clothing', price: 1599, stock_qty: 160,
        image_url: 'https://images.unsplash.com/photo-1539185441755-769473a23570?w=400',
        description: 'Quick-dry fabric, built-in liner, deep pockets, 7" inseam.' },

      // ── Books (8) ─────────────────────────────────────────────────────────
      { name: 'Clean Code — Robert C. Martin', category: 'Books', price: 3499, stock_qty: 30,
        image_url: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=400',
        description: 'A handbook of agile software craftsmanship for professional developers.' },
      { name: 'The Pragmatic Programmer — 20th Anniversary Edition', category: 'Books', price: 3995, stock_qty: 25,
        image_url: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400',
        description: 'Classic guide to software craftsmanship, fully revised and updated.' },
      { name: 'Designing Data-Intensive Applications', category: 'Books', price: 4199, stock_qty: 22,
        image_url: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400',
        description: 'The big ideas behind reliable, scalable and maintainable systems.' },
      { name: 'Atomic Habits — James Clear', category: 'Books', price: 2999, stock_qty: 50,
        image_url: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=400',
        description: 'Proven framework for building good habits and breaking bad ones.' },
      { name: 'Deep Work — Cal Newport', category: 'Books', price: 2599, stock_qty: 40,
        image_url: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=400',
        description: 'Rules for focused success in a distracted world.' },
      { name: 'System Design Interview — Vol 2', category: 'Books', price: 3799, stock_qty: 18,
        image_url: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400',
        description: 'An insider\'s guide to large-scale distributed system design.' },
      { name: 'The Psychology of Money', category: 'Books', price: 2299, stock_qty: 60,
        image_url: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=400',
        description: 'Timeless lessons on wealth, greed and happiness by Morgan Housel.' },
      { name: 'Cracking the Coding Interview', category: 'Books', price: 4499, stock_qty: 35,
        image_url: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=400',
        description: '189 programming questions and solutions for tech interviews.' },

      // ── Home & Kitchen (10) ───────────────────────────────────────────────
      { name: 'Stainless Steel French Press — 1 Litre', category: 'Home & Kitchen', price: 2999, stock_qty: 70,
        image_url: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=400',
        description: 'Double-wall insulated, keeps coffee hot for hours. Dishwasher safe.' },
      { name: 'Non-Stick Ceramic Frying Pan — 28 cm', category: 'Home & Kitchen', price: 4499, stock_qty: 55,
        image_url: 'https://images.unsplash.com/photo-1585237672814-8f85a8118bf6?w=400',
        description: 'PFOA-free ceramic coating, induction-compatible, oven-safe to 220°C.' },
      { name: 'Air Purifier with HEPA Filter', category: 'Home & Kitchen', price: 9999, stock_qty: 25,
        image_url: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400',
        description: 'Covers 400 sq. ft., removes 99.97% of pollutants, whisper-quiet.' },
      { name: 'Instant Pot Duo 7-in-1', category: 'Home & Kitchen', price: 8499, stock_qty: 35,
        image_url: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400',
        description: 'Pressure cooker, slow cooker, rice cooker, steamer, sauté & warmer.' },
      { name: 'Bamboo Cutting Board Set (3-piece)', category: 'Home & Kitchen', price: 1899, stock_qty: 85,
        image_url: 'https://images.unsplash.com/photo-1599974579688-8dbdd335c77f?w=400',
        description: 'Eco-friendly bamboo, knife-friendly surface, juice groove.' },
      { name: 'Stainless Steel Water Bottle — 1L', category: 'Home & Kitchen', price: 1299, stock_qty: 150,
        image_url: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400',
        description: 'Double-walled vacuum insulation, keeps cold 24h / hot 12h.' },
      { name: 'Smart LED Desk Lamp', category: 'Home & Kitchen', price: 2799, stock_qty: 60,
        image_url: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400',
        description: '10 brightness levels, USB charging port, touch-dimmer, eye-care.' },
      { name: 'Cordless Handheld Vacuum', category: 'Home & Kitchen', price: 5999, stock_qty: 40,
        image_url: 'https://images.unsplash.com/photo-1558317374-067fb5f30001?w=400',
        description: '20000 Pa suction, 40-minute runtime, HEPA filtration.' },
      { name: 'Cast Iron Skillet — 30 cm', category: 'Home & Kitchen', price: 3499, stock_qty: 45,
        image_url: 'https://images.unsplash.com/photo-1576866231285-f555e5d06cb8?w=400',
        description: 'Pre-seasoned, works on all hobs including campfire. Lifetime durability.' },
      { name: 'Digital Kitchen Scale', category: 'Home & Kitchen', price: 999, stock_qty: 120,
        image_url: 'https://images.unsplash.com/photo-1609167830220-7164aa360951?w=400',
        description: 'Accurate to 1g, 5kg capacity, tare function, slim stainless top.' },

      // ── Sports & Outdoors (10) ────────────────────────────────────────────
      { name: 'Adjustable Dumbbell Set — 2×20 kg', category: 'Sports & Outdoors', price: 22900, stock_qty: 20,
        image_url: 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=400',
        description: 'Quick-lock dial replaces 15 pairs of traditional dumbbells.' },
      { name: 'Yoga Mat — 6mm Non-Slip', category: 'Sports & Outdoors', price: 2800, stock_qty: 100,
        image_url: 'https://images.unsplash.com/photo-1601925228120-2507e63f4f1c?w=400',
        description: 'Eco-friendly TPE, alignment lines, extra-wide. Carry strap included.' },
      { name: 'Resistance Bands Set (5 levels)', category: 'Sports & Outdoors', price: 1299, stock_qty: 180,
        image_url: 'https://images.unsplash.com/photo-1598289431512-b97b0917affc?w=400',
        description: 'Natural latex, from 5 to 50 lbs, with door anchor & ankle straps.' },
      { name: 'Cycling Helmet — MIPS Safety', category: 'Sports & Outdoors', price: 5499, stock_qty: 35,
        image_url: 'https://images.unsplash.com/photo-1574435900484-d59fc5f0faca?w=400',
        description: 'MIPS brain protection, 18-vents for airflow, size-adjustable.' },
      { name: 'Trekking Poles — Foldable Pair', category: 'Sports & Outdoors', price: 3999, stock_qty: 45,
        image_url: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=400',
        description: 'Aircraft-grade aluminium, cork grips, quick-lock sections.' },
      { name: 'Jump Rope — Speed Cable', category: 'Sports & Outdoors', price: 799, stock_qty: 200,
        image_url: 'https://images.unsplash.com/photo-1434682881908-b43d0467b798?w=400',
        description: '3m steel cable, ball-bearing handles, adjustable length.' },
      { name: 'Pull-Up & Dip Bar', category: 'Sports & Outdoors', price: 4499, stock_qty: 30,
        image_url: 'https://images.unsplash.com/photo-1517963628607-235ccdd5476c?w=400',
        description: 'Doorframe-mounted, supports up to 150 kg, foam grips.' },
      { name: 'Camping Sleeping Bag — 0°C Rated', category: 'Sports & Outdoors', price: 6999, stock_qty: 25,
        image_url: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=400',
        description: 'Mummy-style, 650-fill down, compressible to size of a water bottle.' },
      { name: 'Smart Running Watch with GPS', category: 'Sports & Outdoors', price: 12999, stock_qty: 28,
        image_url: 'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=400',
        description: 'Built-in GPS, heart rate, 14-day battery, swim-proof 5ATM.' },
      { name: 'Foam Roller — Deep Tissue', category: 'Sports & Outdoors', price: 1499, stock_qty: 90,
        image_url: 'https://images.unsplash.com/photo-1599058917765-a780eda07a3e?w=400',
        description: 'High-density EVA foam, grid texture for targeted myofascial release.' },
    ];

    for (const p of products) {
      await client.query(
        `INSERT INTO products (name, description, price, category_id, image_url, stock_qty)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT DO NOTHING`,
        [p.name, p.description, p.price, cm[p.category], p.image_url, p.stock_qty]
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
    console.log(`✅ Seed complete! ${products.length} products inserted.`);
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
