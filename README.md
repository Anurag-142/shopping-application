# ShopApp — Full-Stack Shopping Website

> **Stack:** React + Bootstrap · Node.js + Express · PostgreSQL  
> **Auth:** JWT (jsonwebtoken + bcryptjs)  
> **Folder layout:** `FRONTEND/` (React) · `BACKEND/` (Express + PostgreSQL)

---

## Prerequisites

| Tool | Version | Check |
|---|---|---|
| Node.js | ≥ 18 | `node --version` |
| npm | ≥ 9 | `npm --version` |
| PostgreSQL | ≥ 14 | `psql --version` |

---

## Quick Start

### 1. Clone / open the project

```
cd "Microservice Application"
```

### 2. Create the PostgreSQL database and user

Open `psql` as the PostgreSQL superuser and run:

```sql
CREATE DATABASE shopping_db;
CREATE USER shopping_user WITH PASSWORD 'your_password_here';
GRANT ALL PRIVILEGES ON DATABASE shopping_db TO shopping_user;
\c shopping_db
GRANT ALL ON SCHEMA public TO shopping_user;
```

### 3. Configure the backend environment

```
cd BACKEND
copy .env.example .env
```

Edit `BACKEND/.env` and fill in your actual values:

```
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=shopping_db
DB_USER=shopping_user
DB_PASSWORD=your_password_here
JWT_SECRET=replace_with_a_long_random_string
JWT_EXPIRES_IN=7d
NODE_ENV=development
```

### 4. Configure the frontend environment

```
cd ..\FRONTEND
copy .env.example .env
```

The default `.env` value (`VITE_API_BASE_URL=http://localhost:5000/api`) works as-is for local development.

### 5. Install dependencies

```
cd ..\BACKEND
npm install

cd ..\FRONTEND
npm install
```

### 6. Run database migration (create tables)

```
cd ..\BACKEND
npm run db:migrate
```

Expected output:
```
✅ Migration complete — all tables created.
```

### 7. Seed sample data

```
npm run db:seed
```

Expected output:
```
✅ Seed complete!
   Admin:    admin@shop.com / Admin@123
   Customer: customer@shop.com / Customer@123
```

This creates:
- 5 categories (Electronics, Clothing, Books, Home & Kitchen, Sports & Outdoors)
- 12 sample products across all categories
- 1 admin user: `admin@shop.com` / `Admin@123`
- 1 demo customer: `customer@shop.com` / `Customer@123`

### 8. Start the backend server

```
npm run dev
```

The Express API starts on **http://localhost:5000**

Verify: open http://localhost:5000/api/health — you should see `{"status":"ok",...}`

### 9. Start the frontend (new terminal)

```
cd FRONTEND
npm run dev
```

The React app starts on **http://localhost:5173**

---

## Available Accounts (after seeding)

| Role | Email | Password |
|---|---|---|
| Admin | admin@shop.com | Admin@123 |
| Customer | customer@shop.com | Customer@123 |

---

## Feature Walkthrough

| Feature | How to test |
|---|---|
| Browse products | Visit `/products` — no login required |
| Search & filter | Use the search bar or category buttons on `/products` |
| Product detail | Click "Details" on any product card |
| Register | Visit `/signup` |
| Login | Visit `/login` |
| Add to cart | Click "Add to Cart" on any product (login required) |
| View cart | Click 🛒 in the Navbar |
| Checkout | From cart, click "Proceed to Checkout" — fill shipping + mock card (any 16-digit number) |
| Order confirmation | Shown automatically after checkout |
| Order history | Click "My Orders" in the Navbar |
| Admin panel | Login as admin, click "Admin" in the Navbar |
| Admin — add product | Click "+ Add Product" in the admin panel |
| Admin — edit product | Click "Edit" next to any product |
| Admin — deactivate | Click "Deactivate" — product disappears from customer listing |
| Logout | Click "Logout" in the Navbar |

---

## Running Tests

```
cd BACKEND
npm test
```

Test suite covers:
- **Unit tests:** `calculateCartTotals` and `isStockSufficient` helper functions
- **Integration tests:** Auth flow (signup/login), admin route protection, full checkout flow

---

## Project Structure

```
Microservice Application/
├── BACKEND/
│   ├── server.js                  Entry point — binds port, checks DB
│   ├── .env.example               Environment variable template
│   ├── src/
│   │   ├── app.js                 Express app (middleware + routes)
│   │   ├── config/db.js           PostgreSQL connection pool
│   │   ├── db/
│   │   │   ├── migrate.js         Creates all database tables
│   │   │   └── seed.js            Inserts sample products + users
│   │   ├── middleware/
│   │   │   ├── jwtVerify.js       Verifies Bearer token
│   │   │   ├── roleGuard.js       Checks user role
│   │   │   └── errorHandler.js    Global error handler
│   │   ├── modules/
│   │   │   ├── auth/              signup · login · logout · /me
│   │   │   ├── products/          list · detail (public)
│   │   │   ├── categories/        list (public)
│   │   │   ├── cart/              get · add · update · remove
│   │   │   ├── orders/            create · list · detail
│   │   │   └── admin/             product CRUD (admin only)
│   │   └── utils/
│   │       ├── jwtHelper.js       signToken / verifyToken
│   │       ├── passwordHelper.js  hashPassword / comparePassword
│   │       └── cartHelpers.js     calculateCartTotals / isStockSufficient
│   └── tests/
│       ├── unit/cartHelpers.test.js
│       └── integration/auth.checkout.test.js
│
├── FRONTEND/
│   ├── index.html
│   ├── vite.config.js
│   ├── .env.example
│   └── src/
│       ├── main.jsx               React entry point
│       ├── App.jsx                Router + layout
│       ├── assets/global.css      Custom styles
│       ├── context/
│       │   ├── AuthContext.jsx    User auth state + JWT
│       │   └── CartContext.jsx    Cart state
│       ├── components/
│       │   ├── Navbar.jsx
│       │   ├── ProductCard.jsx
│       │   ├── PrivateRoute.jsx
│       │   ├── AdminRoute.jsx
│       │   ├── LoadingSpinner.jsx
│       │   └── ErrorAlert.jsx
│       ├── pages/
│       │   ├── HomePage.jsx
│       │   ├── ProductsPage.jsx   Search + filter + pagination
│       │   ├── ProductDetailPage.jsx
│       │   ├── LoginPage.jsx
│       │   ├── SignupPage.jsx
│       │   ├── CartPage.jsx
│       │   ├── CheckoutPage.jsx   Mock payment form
│       │   ├── OrderConfirmationPage.jsx
│       │   ├── OrderHistoryPage.jsx
│       │   └── AdminPage.jsx      Product CRUD (admin only)
│       └── services/
│           ├── api.js             Axios instance + interceptors
│           ├── authService.js
│           ├── productService.js
│           ├── cartService.js
│           ├── orderService.js
│           └── adminService.js
│
├── IMPLEMENTATION_PLAN.md
└── STEP_BY_STEP_IMPLEMENTATION_GUIDE.md
```

---

## API Endpoints Summary

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/signup` | — | Register new customer |
| POST | `/api/auth/login` | — | Login, get JWT |
| POST | `/api/auth/logout` | JWT | Logout (client-side) |
| GET | `/api/auth/me` | JWT | Get current user |
| GET | `/api/products` | — | List products (search, filter, paginate) |
| GET | `/api/products/:id` | — | Product detail |
| GET | `/api/categories` | — | List all categories |
| GET | `/api/cart` | JWT | Get user's cart |
| POST | `/api/cart` | JWT | Add item to cart |
| PUT | `/api/cart/:productId` | JWT | Update cart item quantity |
| DELETE | `/api/cart/:productId` | JWT | Remove item from cart |
| POST | `/api/orders` | JWT | Checkout — create order |
| GET | `/api/orders` | JWT | List user's orders |
| GET | `/api/orders/:orderId` | JWT | Order detail |
| GET | `/api/admin/products` | JWT + Admin | List all products |
| POST | `/api/admin/products` | JWT + Admin | Create product |
| PUT | `/api/admin/products/:id` | JWT + Admin | Update product |
| DELETE | `/api/admin/products/:id` | JWT + Admin | Deactivate product |

---

## Security Notes

- Passwords hashed with `bcryptjs` (cost factor 12) — never stored in plain text
- JWT signed with `JWT_SECRET` from environment — never hardcoded
- Admin routes protected by both JWT verification and role guard middleware
- Parameterised SQL queries throughout — no SQL injection risk
- CORS restricted to the frontend origin
- `helmet` sets secure HTTP headers on all responses
- `.env` is listed in `.gitignore` — never committed to source control

---

## Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use a strong, random `JWT_SECRET` (at least 64 random characters)
- [ ] Switch to a managed PostgreSQL instance (Supabase, Railway, Neon, or RDS)
- [ ] Build the frontend: `cd FRONTEND && npm run build` → serve `dist/` via Nginx or CDN
- [ ] Configure Nginx SPA redirect: `try_files $uri /index.html`
- [ ] Add HTTPS via Let's Encrypt
- [ ] Set `ALLOWED_ORIGINS` to your production frontend domain
- [ ] Use PM2 to manage the Node.js process: `pm2 start server.js --name shopapp`
- [ ] Add rate limiting to auth routes (`express-rate-limit`)
