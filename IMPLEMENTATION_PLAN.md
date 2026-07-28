# IMPLEMENTATION PLAN — Shopping Website

> **Status:** Planning  
> **Stack:** React + Bootstrap · Node.js + Express · PostgreSQL  
> **Last Updated:** 2025

---

## Table of Contents

1. [Solution Overview](#1-solution-overview)
2. [High-Level Architecture](#2-high-level-architecture)
3. [Component Design](#3-component-design)
4. [Folder Structure](#4-folder-structure)
5. [Module Breakdown](#5-module-breakdown)
6. [Implementation Roadmap](#6-implementation-roadmap)

---

## 1. Solution Overview

### 1.1 Objective

Build a full-stack e-commerce shopping website that allows customers to browse products, manage a cart, and place orders, while giving administrators the ability to manage the product catalogue — all backed by a secure, JWT-authenticated REST API.

### 1.2 Scope

| In Scope | Out of Scope |
|---|---|
| Customer registration & login | Third-party OAuth (Google, Facebook) |
| Product catalogue with search & category filter | Real payment gateway integration |
| Product detail page | Multi-vendor / marketplace model |
| Shopping cart (add / remove / update qty) | Email notifications |
| Checkout with mock payment | Mobile native application |
| Order history for logged-in customers | Advanced analytics / reporting |
| Admin screen (add / edit / remove products) | Inventory management / stock alerts |
| Logout | Subscription or recurring billing |

### 1.3 Users

| Role | Description |
|---|---|
| **Customer** | Browses products, manages their own cart, places orders, views order history, and manages their account. |
| **Admin** | Manages the product catalogue (create, update, delete products and categories). Has no access to customer personal data beyond what is operationally necessary. |

### 1.4 Functional Requirements

**Authentication**
- Customers can register with email and password.
- Registered customers and admins can log in and receive a JWT.
- Protected routes require a valid, non-expired token.
- Users can log out (token invalidated client-side; optional server-side blocklist).

**Product Catalogue**
- Display all active products with name, image, price, and category.
- Full-text search across product name and description.
- Filter products by one or more categories.
- Paginate results.

**Product Detail**
- Show full product information: name, description, images, price, category, and availability.

**Shopping Cart**
- Add a product to the cart (with quantity).
- Update the quantity of an item in the cart.
- Remove an item from the cart.
- Cart is persisted per logged-in customer (server-side) and optionally in `localStorage` for guest users.

**Checkout & Mock Payment**
- Customer reviews cart summary and enters a shipping address.
- Mock payment step simulates card entry (no real gateway).
- On "confirm", an order is created and the cart is cleared.

**Order History**
- Logged-in customers can view a list of their past orders.
- Each order shows items purchased, quantities, totals, and status.

**Admin — Product Management**
- Admin can add a new product (name, description, price, category, image URL).
- Admin can edit an existing product.
- Admin can delete (or deactivate) a product.

### 1.5 Non-Functional Requirements

| Category | Requirement |
|---|---|
| **Security** | Passwords hashed with bcrypt. JWT signed with a secret. HTTPS assumed in production. Role-based access control (customer vs admin). |
| **Performance** | API responses under 500 ms for typical catalogue queries. |
| **Scalability** | Stateless backend allows horizontal scaling behind a load balancer. |
| **Usability** | Responsive UI via Bootstrap; accessible on desktop and mobile browsers. |
| **Maintainability** | Clear separation of concerns across frontend, backend, and database layers. |
| **Reliability** | Graceful error handling; meaningful error messages returned to the client. |

### 1.6 Assumptions

- PostgreSQL is hosted locally for development; a managed instance (e.g., Supabase, Railway, or RDS) is assumed for production.
- Image assets are referenced by URL; no file-upload infrastructure is required in this phase.
- A single admin account is seeded manually; no admin self-registration flow is built.
- Mock payment is a UI-only simulation — no third-party API call is made.
- The project runs as two separate processes: a React dev server (FRONTEND) and an Express API server (BACKEND).
- CORS is configured to allow the frontend origin during development.

---

## 2. High-Level Architecture

### 2.1 Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│                    BROWSER                          │
│                                                     │
│   ┌─────────────────────────────────────────────┐  │
│   │          FRONTEND  (React + Bootstrap)       │  │
│   │                                              │  │
│   │  Pages / Components  ◄──► React Context /   │  │
│   │                            Local State       │  │
│   │         │  Axios / Fetch (REST calls)        │  │
│   └─────────┼────────────────────────────────────┘  │
└─────────────┼───────────────────────────────────────┘
              │  HTTP/HTTPS  (JSON)
              ▼
┌─────────────────────────────────────────────────────┐
│                BACKEND  (Node.js + Express)         │
│                                                     │
│   ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │
│   │  Auth    │  │ Catalog  │  │  Cart / Orders   │ │
│   │  Router  │  │  Router  │  │     Router       │ │
│   └────┬─────┘  └────┬─────┘  └────────┬─────────┘ │
│        │              │                  │           │
│   ┌────▼──────────────▼──────────────────▼────────┐ │
│   │              Middleware Layer                  │ │
│   │  (JWT Verify · Role Guard · Error Handler)     │ │
│   └────────────────────┬───────────────────────────┘ │
│                        │  pg / node-postgres          │
└────────────────────────┼────────────────────────────┘
                         │
              ┌──────────▼──────────┐
              │   DATABASE          │
              │   PostgreSQL        │
              │                     │
              │  users · products   │
              │  categories · carts │
              │  orders · order_    │
              │  items              │
              └─────────────────────┘
```

### 2.2 Frontend → Backend → Database Interaction

```
React Component
    │
    ├── dispatches action (e.g., addToCart)
    │
    ▼
Axios service layer  ──►  Express Router  ──►  Controller / Service
                                                      │
                                               SQL query via pg
                                                      │
                                               PostgreSQL returns rows
                                                      │
                                          JSON response  ◄──────────────
    │
React updates state / re-renders UI
```

### 2.3 Request Lifecycle

#### Browsing (Unauthenticated)

```
1. User opens /products
2. React calls GET /api/products?search=&category=
3. Express queries products table (with optional WHERE clauses)
4. Returns paginated product list as JSON
5. React renders ProductCard components
```

#### Add to Cart (Authenticated)

```
1. User clicks "Add to Cart" on a product
2. React checks for valid JWT in localStorage
3. If not logged in → redirect to /login
4. POST /api/cart  { productId, quantity }
5. JWT middleware verifies token, extracts userId
6. Service upserts cart item in DB for that user
7. Returns updated cart; React updates cart context
```

#### Checkout (Authenticated)

```
1. User navigates to /checkout
2. React displays cart summary + shipping address form + mock payment fields
3. User submits → POST /api/orders  { shippingAddress, paymentDetails (mock) }
4. Backend validates cart is non-empty
5. Creates order + order_items records in a DB transaction
6. Clears the user's cart
7. Returns orderId; React navigates to /order-confirmation/:id
```

---

## 3. Component Design

### 3.1 Frontend Responsibilities

| Concern | Details |
|---|---|
| **Routing** | React Router manages page navigation (`/`, `/products`, `/products/:id`, `/cart`, `/checkout`, `/orders`, `/login`, `/signup`, `/admin`). |
| **State Management** | React Context (or lightweight store) for auth state and cart state; local component state for forms and UI. |
| **Auth Flow** | JWT stored in `localStorage`. Axios interceptor attaches `Authorization: Bearer <token>` to every request. Expired/missing token redirects to `/login`. |
| **UI Components** | Reusable Bootstrap-styled components: Navbar, ProductCard, CartItem, OrderRow, AdminProductForm. |
| **Forms** | Controlled forms for signup, login, checkout, and admin product management; basic client-side validation. |
| **Error Handling** | API error responses surfaced as inline alerts or toast notifications. |

### 3.2 Backend Responsibilities

| Module | Responsibility |
|---|---|
| **Auth** | Register (hash password, insert user), Login (verify password, issue JWT), optional token blocklist for logout. |
| **Catalogue** | List products with search + filter + pagination; fetch single product by ID. |
| **Cart** | Add item, update quantity, remove item, fetch current cart — all scoped to `userId` from JWT. |
| **Orders** | Create order from cart (transactional), list orders for user, fetch order detail. |
| **Mock Payment** | Receives payment payload; performs no real charge; always returns success to simulate a gateway. |
| **Admin** | CRUD operations on products and categories; protected by admin role guard middleware. |
| **Middleware** | JWT verification, role-based guard (customer vs admin), global error handler, request logging. |

### 3.3 Database Responsibilities

| Concern | Details |
|---|---|
| **Persistence** | Stores all application data: users, products, categories, carts, orders, and order line items. |
| **Integrity** | Foreign key relationships enforce referential integrity (e.g., order_items → orders, products). |
| **Queries** | Supports filtering (category, search), pagination (LIMIT / OFFSET), and transactional order creation. |
| **Security** | Passwords are never stored in plain text (hashing is done in the application layer). Credentials stored in environment variables, never in source code. |

---

## 4. Folder Structure

```
/ (project root)
├── FRONTEND/
│   ├── public/                  # Static assets (index.html, favicon)
│   ├── src/
│   │   ├── assets/              # Images and global CSS
│   │   ├── components/          # Reusable UI components (Navbar, ProductCard, CartItem…)
│   │   ├── context/             # React Contexts (AuthContext, CartContext)
│   │   ├── pages/               # One file per route/page (Home, Products, ProductDetail,
│   │   │                        #   Cart, Checkout, OrderHistory, Login, Signup, Admin)
│   │   ├── services/            # Axios instances and API call functions (authService,
│   │   │                        #   productService, cartService, orderService)
│   │   ├── utils/               # Helper functions (token helpers, formatters)
│   │   ├── App.jsx              # Root component with React Router setup
│   │   └── main.jsx             # Entry point (ReactDOM.createRoot)
│   ├── .env                     # VITE_API_BASE_URL etc.
│   └── package.json
│
├── BACKEND/
│   ├── src/
│   │   ├── config/              # DB connection (pg Pool), environment config
│   │   ├── middleware/          # jwtVerify, roleGuard, errorHandler, requestLogger
│   │   ├── modules/
│   │   │   ├── auth/            # routes, controller, service (register, login)
│   │   │   ├── products/        # routes, controller, service (list, detail)
│   │   │   ├── cart/            # routes, controller, service (add, update, remove, get)
│   │   │   ├── orders/          # routes, controller, service (create, list, detail)
│   │   │   └── admin/           # routes, controller, service (product CRUD)
│   │   ├── utils/               # JWT helpers, password helpers, response formatter
│   │   └── app.js               # Express app setup (middleware, routers)
│   ├── server.js                # HTTP server entry point (port binding)
│   ├── .env                     # DB_URL, JWT_SECRET, PORT etc.
│   └── package.json
│
└── IMPLEMENTATION_PLAN.md       # This document
```

### Folder Responsibility Summary

| Folder | Responsibility |
|---|---|
| `FRONTEND/src/components` | Reusable, stateless (or lightly stateful) UI building blocks |
| `FRONTEND/src/context` | Global shared state (auth token, cart contents) |
| `FRONTEND/src/pages` | Page-level components, one per route; orchestrate data fetching and layout |
| `FRONTEND/src/services` | All HTTP communication; abstracts Axios calls behind named functions |
| `BACKEND/src/config` | Environment-aware configuration; single DB pool instance |
| `BACKEND/src/middleware` | Cross-cutting concerns applied via Express `app.use()` |
| `BACKEND/src/modules/*` | Feature-scoped vertical slices: route → controller → service |
| `BACKEND/src/utils` | Stateless helpers shared across modules |

---

## 5. Module Breakdown

### 5.1 Authentication

**Goal:** Secure identity management for customers and admins.

- **Signup:** Accept name, email, password. Validate uniqueness. Hash password. Return JWT.
- **Login:** Verify credentials. Issue signed JWT with `userId` and `role` claims.
- **Token Validation:** Middleware decodes and verifies JWT on every protected request.
- **Logout:** Clear token from `localStorage` on the client; optionally store token in a server-side denylist.
- **Role Guard:** Middleware checks `role === 'admin'` for admin-only routes.

### 5.2 Product Catalogue

**Goal:** Allow all users to discover products.

- **List Products:** Paginated list; supports `?search=` (name/description) and `?category=` query params.
- **Product Detail:** Single product fetch by ID; includes all metadata.
- **Category List:** Endpoint to retrieve all categories (used to populate filter UI).
- **Visibility:** Only active/published products are exposed to customers; admin can see all.

### 5.3 Cart

**Goal:** Persistent, user-scoped cart management.

- **Add Item:** Insert or increment quantity for a product in the user's cart.
- **Update Quantity:** Set a specific quantity for a cart line item.
- **Remove Item:** Delete a single line item from the cart.
- **Get Cart:** Return all cart items with current product prices and a computed subtotal.
- **Guest Cart:** Optional — persist cart in `localStorage`; merge into DB cart on login.

### 5.4 Checkout & Orders

**Goal:** Convert a cart into a confirmed order with a mock payment step.

- **Checkout Flow:** Customer provides shipping address + mock payment details (card number, expiry, CVV — no real processing).
- **Order Creation:** Transactionally copies cart items into `order_items`; records total; clears cart.
- **Mock Payment Service:** Accepts payment payload and always returns a "payment_success" result.
- **Order Confirmation:** Returns order ID and summary to frontend; displayed on confirmation page.
- **Order History:** Paginated list of past orders for the authenticated customer.
- **Order Detail:** Full breakdown of a single order (items, quantities, prices, shipping, status).

### 5.5 Admin

**Goal:** Allow administrators to manage the product catalogue.

- **Add Product:** Create a new product with name, description, price, category, image URL, and active flag.
- **Edit Product:** Update any field of an existing product.
- **Delete / Deactivate Product:** Soft-delete (deactivate) preferred to preserve order history integrity.
- **Category Management:** Add or rename product categories.
- **Access Control:** All admin routes protected by both JWT verification and admin role guard.

---

## 6. Implementation Roadmap

### 6.1 Development Phases

#### Phase 1 — Foundation (Week 1–2)

| Task | Effort |
|---|---|
| Project scaffolding (create-react-app / Vite + Express boilerplate) | 0.5 day |
| PostgreSQL setup, environment configuration, DB connection pool | 0.5 day |
| Auth module: signup, login, JWT middleware | 2 days |
| Basic React app shell: routing, Navbar, AuthContext | 1 day |
| Login & Signup pages with form validation | 1 day |
| **Phase total** | **~5 days** |

#### Phase 2 — Core Catalogue (Week 2–3)

| Task | Effort |
|---|---|
| Products module: list with search & category filter, pagination | 2 days |
| Product detail endpoint + page | 1 day |
| Category endpoint + filter UI in React | 1 day |
| ProductCard component + product listing page | 1 day |
| **Phase total** | **~5 days** |

#### Phase 3 — Cart (Week 3–4)

| Task | Effort |
|---|---|
| Cart module: add, update, remove, get endpoints | 2 days |
| CartContext in React + cart page | 1.5 days |
| Cart item component (qty stepper, remove button) | 1 day |
| **Phase total** | **~4.5 days** |

#### Phase 4 — Checkout & Orders (Week 4–5)

| Task | Effort |
|---|---|
| Orders module: transactional order creation, mock payment service | 2 days |
| Checkout page: address form + mock payment form | 1.5 days |
| Order confirmation page | 0.5 day |
| Order history & order detail pages | 1.5 days |
| **Phase total** | **~5.5 days** |

#### Phase 5 — Admin (Week 5–6)

| Task | Effort |
|---|---|
| Admin module: product CRUD endpoints with role guard | 2 days |
| Admin product management page (table + add/edit modal) | 2 days |
| Admin route protection on frontend | 0.5 day |
| **Phase total** | **~4.5 days** |

#### Phase 6 — Polish & Stabilisation (Week 6–7)

| Task | Effort |
|---|---|
| Responsive UI review and Bootstrap refinements | 1 day |
| Error handling improvements (client & server) | 1 day |
| Manual end-to-end testing of all flows | 1.5 days |
| Bug fixes | 1 day |
| README and environment setup documentation | 0.5 day |
| **Phase total** | **~5 days** |

### 6.2 Estimated Total Effort

| Phase | Estimated Effort |
|---|---|
| Phase 1 — Foundation | 5 days |
| Phase 2 — Core Catalogue | 5 days |
| Phase 3 — Cart | 4.5 days |
| Phase 4 — Checkout & Orders | 5.5 days |
| Phase 5 — Admin | 4.5 days |
| Phase 6 — Polish & Stabilisation | 5 days |
| **Total** | **~29.5 working days (~6 weeks for 1 developer)** |

### 6.3 Dependencies

```
Phase 1 (Auth + DB)
    └── Phase 2 (Catalogue) — requires DB connection and user model
            └── Phase 3 (Cart) — requires Auth middleware and Product IDs
                    └── Phase 4 (Orders) — requires Cart module
                            └── Phase 6 (Polish) — requires all features complete

Phase 1 (Auth)
    └── Phase 5 (Admin) — requires JWT + role guard from Phase 1
                └── Phase 2 (Catalogue) — Admin manages products shown in catalogue
```

**Critical path:** Foundation → Catalogue → Cart → Checkout & Orders → Polish  
**Parallel track possible:** Admin module can be developed in parallel with Phase 3 (Cart) once Phase 1 is complete.

---

*This document is a planning artefact only. No database schema, SQL scripts, API contracts, or implementation code are included. Detailed technical specifications will be produced in subsequent planning steps.*
