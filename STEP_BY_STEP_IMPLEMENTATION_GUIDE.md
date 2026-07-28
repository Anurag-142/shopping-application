# Step-by-Step Implementation Guide — Shopping Website

> **Reference:** `IMPLEMENTATION_PLAN.md`  
> **Stack:** React + Bootstrap · Node.js + Express · PostgreSQL  
> **Audience:** Developer implementing the system from scratch  
> **Format:** Plain-English instructions and logic — no code dumps, no SQL scripts

---

## Table of Contents

1. [Environment Setup](#1-environment-setup)
2. [Backend Implementation](#2-backend-implementation)
3. [Frontend Implementation](#3-frontend-implementation)
4. [Integration Steps](#4-integration-steps)
5. [Validation Rules](#5-validation-rules)
6. [Testing](#6-testing)
7. [Deployment](#7-deployment)

---

## 1. Environment Setup

### 1.1 Install Required Tools

Before writing a single line of code, make sure the following tools are installed on your machine:

- **Node.js (v18 or later):** The runtime for the backend and the toolchain for the frontend. Download from nodejs.org. Verify installation by running `node --version` and `npm --version` in a terminal.
- **npm or yarn:** Comes bundled with Node.js. Either package manager works; pick one and use it consistently throughout the project.
- **PostgreSQL (v14 or later):** The relational database. Install it locally using the official installer for your OS (Windows, macOS, or Linux). During installation, note the superuser password you set — you will need it to create the project database.
- **Git:** For version control. Initialize a repository at the project root so both FRONTEND and BACKEND folders live in the same repo.
- **A code editor:** VS Code is recommended. Install the ESLint and Prettier extensions for code quality.
- **Postman or Insomnia (optional but recommended):** A REST client for manually testing backend API endpoints before the frontend is ready.

### 1.2 PostgreSQL Setup

Once PostgreSQL is installed and the server is running:

1. Open the PostgreSQL command-line tool (`psql`) or a GUI like pgAdmin.
2. Create a dedicated database for this project (e.g., `shopping_db`). Using a dedicated database keeps the project isolated from any other PostgreSQL databases on your machine.
3. Create a dedicated database user (e.g., `shopping_user`) with a strong password. Grant that user full privileges on `shopping_db`. Using a dedicated user rather than the superuser is a security best practice.
4. Note the host, port (default 5432), database name, username, and password. These five values form the connection string you will store in the backend's `.env` file. Never commit that file to source control.
5. Confirm the connection works by running a simple query (e.g., `SELECT 1;`) in `psql` using the new user's credentials.

### 1.3 Backend Project Scaffolding

The BACKEND folder lives at the project root. Set it up as follows:

1. Inside the `BACKEND` folder, run `npm init` to create a `package.json`. Give the project a meaningful name (e.g., `shopping-backend`).
2. Install the core production dependencies one group at a time so you understand what each does:
   - **Express:** The web framework that handles routing and middleware.
   - **pg (node-postgres):** The driver for communicating with PostgreSQL.
   - **bcryptjs:** For hashing and comparing passwords. Never store plain-text passwords.
   - **jsonwebtoken:** For creating and verifying JWTs (access tokens).
   - **dotenv:** For loading environment variables from the `.env` file into `process.env`.
   - **cors:** Middleware that tells Express to accept requests from the React dev server's origin.
   - **express-validator (or joi):** For validating and sanitising incoming request bodies.
3. Install development dependencies:
   - **nodemon:** Automatically restarts the server whenever you save a file — saves constant manual restarts during development.
   - **jest and supertest:** For unit and integration testing (configured later).
4. Create the folder structure described in `IMPLEMENTATION_PLAN.md` Section 4:
   - `src/config/` — database pool and environment config
   - `src/middleware/` — JWT verify, role guard, error handler, request logger
   - `src/modules/auth/`, `products/`, `cart/`, `orders/`, `admin/` — one subfolder per feature; each subfolder gets a `routes.js`, `controller.js`, and `service.js`
   - `src/utils/` — shared helpers
   - `src/app.js` — Express app setup
   - `server.js` — entry point
5. Create a `.env` file at the root of BACKEND. Add variables for `PORT`, `DATABASE_URL` (or individual `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`), `JWT_SECRET`, and `JWT_EXPIRES_IN`. Add `.env` to `.gitignore` immediately.
6. Add a `start` script in `package.json` that runs `node server.js`, and a `dev` script that runs `nodemon server.js`.

### 1.4 Frontend Project Scaffolding

The FRONTEND folder lives at the project root. Set it up as follows:

1. Use Vite to scaffold a new React project inside the `FRONTEND` folder. Vite is faster than Create React App and produces a leaner starting structure. Choose the React + JavaScript template.
2. Install the additional frontend dependencies:
   - **react-router-dom (v6):** Client-side routing between pages.
   - **axios:** HTTP client for communicating with the Express backend.
   - **bootstrap:** The CSS framework for responsive layout and UI components. Import its CSS globally in `main.jsx`.
   - **react-bootstrap (optional):** Wraps Bootstrap components as React components; useful for modals and form controls.
3. Clean up the Vite boilerplate: remove the default `App.css` styles and example counter component.
4. Create the folder structure described in `IMPLEMENTATION_PLAN.md` Section 4:
   - `src/assets/` — images and any custom global CSS
   - `src/components/` — reusable UI pieces
   - `src/context/` — AuthContext and CartContext
   - `src/pages/` — one file per route
   - `src/services/` — Axios call functions grouped by feature
   - `src/utils/` — token helpers and formatters
5. Create a `.env` file in FRONTEND. Add `VITE_API_BASE_URL=http://localhost:5000/api` (or whatever port your Express server uses). Vite exposes variables prefixed with `VITE_` to the browser. Add this file to `.gitignore`.
6. Add a `dev` script in `package.json` to start the Vite development server.

---

## 2. Backend Implementation

### 2.1 Express App Structure

The entry point (`server.js`) should do only one thing: import the Express app from `app.js` and start listening on the configured port. Keeping the server binding separate from the app makes the app easier to test with `supertest`.

In `app.js`, set up the Express application in the following order:
1. Parse incoming JSON request bodies using `express.json()`.
2. Enable CORS using the `cors` middleware. In development, allow all origins or specifically allow the Vite frontend URL. In production, restrict to your real domain.
3. Attach a simple request logger (you can use `morgan` or write a two-line custom middleware that logs the method and URL of each request).
4. Mount all feature routers under the `/api` prefix:
   - `/api/auth` → auth routes
   - `/api/products` → product catalogue routes
   - `/api/categories` → category routes
   - `/api/cart` → cart routes
   - `/api/orders` → order routes
   - `/api/admin` → admin routes
5. Register the global error handler middleware **last**, after all routes. Express identifies error handlers by their four-argument signature `(err, req, res, next)`. This handler catches any error thrown or passed via `next(error)` anywhere in the app, logs it, and returns a structured JSON error response with an appropriate HTTP status code.

In `src/config/db.js`, create a single `pg.Pool` instance using the database credentials from `process.env`. Export that pool so every service module can import and use it without creating multiple connections.

### 2.2 Auth Routes — Signup, Login, Logout

**Signup (`POST /api/auth/signup`)**

The controller should:
1. Read the `name`, `email`, and `password` fields from the request body.
2. Pass them through the validation middleware (see Section 5.1 for rules).
3. In the service layer, query the database to check whether a user with that email already exists. If it does, return a 409 Conflict response with a clear message.
4. Hash the plain-text password using `bcryptjs.hash()` with a cost factor of 10–12. Never store the original password.
5. Insert the new user into the `users` table with `role = 'customer'` by default.
6. Sign a JWT containing the new user's ID and role. Use the `JWT_SECRET` from environment variables and set an expiry (e.g., `7d`).
7. Return a 201 Created response containing the JWT and a minimal user object (id, name, email, role). Do not return the hashed password.

**Login (`POST /api/auth/login`)**

The controller should:
1. Read `email` and `password` from the request body.
2. Query the database for a user record matching that email. If not found, return a 401 Unauthorized response. Use a generic message like "Invalid credentials" — do not reveal whether the email or password was wrong, as that leaks information.
3. Use `bcryptjs.compare()` to check the submitted password against the stored hash. If they do not match, return 401.
4. Sign a new JWT with the user's ID and role. Return it in the response body along with the user's basic info.

**Logout (`POST /api/auth/logout`)**

Logout is primarily a client-side action: the frontend removes the JWT from `localStorage`. On the backend, you have two options:
- **Stateless (simpler):** The backend does nothing. The token remains technically valid until it expires, but since the client no longer holds it, it cannot be used. This is acceptable for most applications.
- **Stateful blocklist (more secure):** Maintain a server-side set of invalidated token IDs (the `jti` JWT claim). On each protected request, the JWT middleware checks whether the token's `jti` is in the blocklist. If so, reject the request. This prevents token reuse after logout.

For this project, start with the stateless approach and note the stateful option as a future improvement.

**JWT Middleware**

Create a reusable middleware function in `src/middleware/jwtVerify.js`:
1. Read the `Authorization` header from the request. Expect the format `Bearer <token>`.
2. If the header is missing or malformed, call `next()` with a 401 error.
3. Use `jwt.verify()` with the `JWT_SECRET` to decode the token. If verification fails (expired, tampered), return 401.
4. Attach the decoded payload (userId, role) to `req.user` so downstream controllers can read it.
5. Call `next()` to pass control to the route handler.

Apply this middleware to any route that requires authentication by adding it to the route definition before the controller.

**Role Guard Middleware**

Create a `roleGuard.js` middleware factory that accepts a required role as an argument and returns a middleware function. That function reads `req.user.role` (set by `jwtVerify`) and either calls `next()` (if the role matches) or returns a 403 Forbidden response. Apply `jwtVerify` before `roleGuard` in the middleware chain.

### 2.3 Product Catalogue Routes

**List Products (`GET /api/products`)**

This route is public — no authentication required. The service should:
1. Read optional query parameters: `search` (a keyword string), `category` (a category ID or name), `page` (default 1), and `limit` (default 12).
2. Build the database query dynamically. Start with a base query that selects all active products. If `search` is provided, add a `WHERE` clause that checks whether the product name or description contains the search term (use `ILIKE` or `LOWER()` for case-insensitive matching, or PostgreSQL's full-text search with `to_tsvector`). If `category` is provided, add a `WHERE` clause filtering by that category.
3. Add `LIMIT` and `OFFSET` clauses based on `page` and `limit` to implement pagination.
4. Return the list of products along with pagination metadata (total count, current page, total pages).

**Get Single Product (`GET /api/products/:id`)**

Query the `products` table by the given ID. If the product does not exist or is inactive, return a 404 Not Found response. Otherwise return the full product record including category name, description, price, image URL, and stock quantity.

**List Categories (`GET /api/categories`)**

Query the `categories` table and return all rows. This is used by the frontend to populate the category filter dropdown. This route is also public.

### 2.4 Cart Routes

All cart routes require authentication. Apply `jwtVerify` to the entire cart router.

**Get Cart (`GET /api/cart`)**

The service queries the cart for the authenticated user (using `req.user.userId`). It should join cart items with the products table to return each item's current name, price, and image alongside the stored quantity. It should also compute and return the cart subtotal.

**Add Item to Cart (`POST /api/cart`)**

1. Read `productId` and `quantity` from the request body.
2. Validate that the product exists and is active. Validate that `quantity` is a positive integer.
3. Check the product's available stock. If the requested quantity exceeds available stock, return a 400 Bad Request with an appropriate message.
4. Check whether the user already has this product in their cart. If yes, increment the quantity (but still check that the new total does not exceed stock). If no, insert a new cart row.
5. Return the updated cart.

**Update Cart Item Quantity (`PUT /api/cart/:productId`)**

1. Read the new `quantity` from the request body.
2. If `quantity` is zero or less, treat this as a removal request and delete the row.
3. Otherwise validate the quantity against available stock and update the row.
4. Return the updated cart.

**Remove Item from Cart (`DELETE /api/cart/:productId`)**

Delete the row from the user's cart for the given product ID. Return the updated cart or a 204 No Content response.

### 2.5 Checkout & Order Routes

All order routes require authentication. Apply `jwtVerify` to the entire orders router.

**Create Order / Checkout (`POST /api/orders`)**

This is the most important backend endpoint. It must be atomic — either the entire order is created and the cart is cleared, or nothing changes. Use a database transaction:

1. Read `shippingAddress` and `paymentDetails` from the request body.
2. Validate the shipping address fields (street, city, postcode, country — all required).
3. Pass the mock payment details to the mock payment service (see below). The service always returns success.
4. Fetch the user's current cart from the database. If the cart is empty, return a 400 error — you cannot place an empty order.
5. For each cart item, re-check the product's current stock. If any item's quantity exceeds available stock, abort and return a 400 error listing the problematic items. This prevents race conditions where another user bought the last item between when the customer added it to their cart and when they checked out.
6. Open a database transaction.
7. Within the transaction: insert a new row into the `orders` table (userId, shippingAddress, total amount, status = 'pending', created timestamp). Get the new order's ID.
8. Within the same transaction: for each cart item, insert a row into `order_items` (orderId, productId, quantity, unit price at time of purchase). Storing the price at purchase time is critical — it preserves the historical record even if the product's price changes later.
9. Within the same transaction: decrement the stock quantity of each purchased product.
10. Within the same transaction: delete all cart items for this user.
11. Commit the transaction.
12. Return the new order ID and a summary to the frontend.

**Mock Payment Service**

This is a simple internal function (not a third-party API call). It accepts the payment payload and always returns `{ success: true, transactionId: '<generated-uuid>' }`. The idea is that this function can later be replaced with a real payment gateway integration without changing the checkout controller.

**List Orders (`GET /api/orders`)**

Return a paginated list of all orders for the authenticated user. For each order, include the order ID, date, status, and total. Do not include the full item breakdown in the list — that comes from the detail endpoint.

**Get Order Detail (`GET /api/orders/:orderId`)**

Query the `orders` table and `order_items` table together for the given order ID. Confirm that the order belongs to the authenticated user (compare `order.userId` to `req.user.userId`). If not, return a 403 Forbidden. Return the full order detail including all line items with product names and prices.

### 2.6 Admin Routes — Product Management

All admin routes require both `jwtVerify` and `roleGuard('admin')`. Apply both middleware functions to the entire admin router.

**Add Product (`POST /api/admin/products`)**

1. Read `name`, `description`, `price`, `categoryId`, `imageUrl`, `stockQuantity`, and `isActive` from the request body.
2. Validate all fields (see Section 5).
3. Insert a new row into the `products` table.
4. Return the created product as JSON with a 201 status.

**Edit Product (`PUT /api/admin/products/:id`)**

1. Confirm the product exists. Return 404 if not.
2. Read the fields to update from the request body. Allow partial updates — only update fields that are present in the request.
3. Run the update query and return the updated product record.

**Delete / Deactivate Product (`DELETE /api/admin/products/:id`)**

Prefer a soft delete: set the product's `isActive` flag to `false` rather than removing the row. This preserves foreign key references from `order_items` records that reference this product. Return a 200 OK with a confirmation message. If hard delete is ever needed (e.g., for test data cleanup), add a separate endpoint or a query parameter to distinguish between the two.

**Admin List Products (`GET /api/admin/products`)**

Returns all products (including inactive ones). This is the same as the public product list but without the `isActive = true` filter, so the admin can see deactivated products and manage them.

---

## 3. Frontend Implementation

### 3.1 Global Setup

Before building individual pages, set up the application shell:

1. **React Router:** In `App.jsx`, wrap the application in a `BrowserRouter`. Define all routes using the `<Routes>` and `<Route>` components. Create a `PrivateRoute` wrapper component that reads the auth state from `AuthContext` — if no valid token is present, it redirects the user to `/login`.
2. **AuthContext:** Create a context that holds the current user object and the JWT token. Provide functions for `login` (store token in localStorage and update state), `logout` (clear token and reset state), and a helper to check whether the current user is an admin. Wrap the entire application in this provider in `main.jsx`.
3. **CartContext:** Create a context that holds the cart items array and the cart total. Provide functions for updating cart state when the API responds. On app startup, if a user is logged in, fetch their current cart from the backend and populate this context.
4. **Axios Instance:** In `src/services/api.js`, create a single Axios instance with `baseURL` set to `VITE_API_BASE_URL`. Add a request interceptor that reads the JWT from `localStorage` and attaches it as the `Authorization: Bearer <token>` header on every outgoing request. Add a response interceptor that catches 401 responses and redirects the user to `/login` (token expired or invalid).
5. **Navbar Component:** Build a persistent navigation bar using Bootstrap's `Navbar` component. It should show links to Home, Products, Cart (with an item count badge), and either Login/Signup (for unauthenticated users) or "My Orders" and a Logout button (for authenticated customers). For admins, show a link to the Admin panel.

### 3.2 Signup and Login Pages

**Signup Page (`/signup`)**

The page renders a Bootstrap card centred on the screen with a form containing fields for name, email, password, and confirm password.

- Use React controlled inputs — each field's value is stored in component state and updated on every keystroke.
- On form submission, perform client-side validation first (see Section 5.1). Show inline error messages under each field that fails validation.
- If client-side validation passes, call the `authService.signup()` function, which posts to `/api/auth/signup`.
- On success, store the returned JWT via `AuthContext.login()`, then redirect to the home page or the products listing.
- On failure, display the error message returned by the API (e.g., "Email already in use") in an alert at the top of the form.
- Include a link to the Login page for users who already have an account.

**Login Page (`/login`)**

The page renders a similar centred card with fields for email and password.

- Same controlled-input approach as signup.
- On submission, call `authService.login()`, which posts to `/api/auth/login`.
- On success, store the token and user info via `AuthContext.login()`, then redirect to the page the user was trying to reach (use React Router's `useLocation` to capture the redirect origin) or to the home page.
- On failure, show a generic "Invalid email or password" alert. Never indicate which field was wrong.
- Include a link to the Signup page.

### 3.3 Product Listing Page (`/products`)

This is the main shopping page. It has three main areas:

**Category Filter (sidebar or top bar)**
- On mount, call `productService.getCategories()` to fetch all categories.
- Render each category as a clickable badge or checkbox. When the user clicks a category, update a `selectedCategory` state variable and re-fetch the product list.
- Include a "All Categories" option that clears the filter.

**Search Bar (top of page)**
- A text input with a small search button. When the user types and submits (or on a debounced input change), update a `searchQuery` state variable and re-fetch the product list.
- When either `searchQuery` or `selectedCategory` changes, reset the current page to 1 and fetch fresh results.

**Product Grid**
- Display products as Bootstrap cards in a responsive grid (3 columns on desktop, 2 on tablet, 1 on mobile).
- Each `ProductCard` component shows the product image, name, category, price, and an "Add to Cart" button.
- Clicking "Add to Cart" calls `cartService.addItem()`. If the user is not logged in, redirect them to `/login` first.
- At the bottom of the grid, render pagination controls (Previous / page numbers / Next). Clicking a page number updates the page state and re-fetches.
- If the API returns no results, show a friendly "No products found" message.

### 3.4 Product Detail Page (`/products/:id`)

On mount, use the `id` URL parameter to call `productService.getById(id)`.

Display the full product information:
- A large product image on the left (or top on mobile).
- Name, category, price, and a description section on the right.
- A quantity selector (number input or stepper with + and − buttons). Default to 1. Do not allow the user to select a quantity greater than the product's available stock.
- An "Add to Cart" button. On click, call `cartService.addItem()` with the selected quantity. Show a success message or badge animation on the button to confirm the action.
- A "Back to Products" link.
- If the product is out of stock, disable the quantity input and the "Add to Cart" button, and show an "Out of Stock" badge.

### 3.5 Cart Page (`/cart`)

This page is accessible only to logged-in users (protected by `PrivateRoute`).

On mount, the cart data is already available from `CartContext`. If the cart is empty, show a message and a "Continue Shopping" button.

For a non-empty cart:
- Render each cart item as a row (using a `CartItem` component) showing the product image, name, unit price, a quantity stepper, a line total (unit price × quantity), and a Remove button.
- **Quantity stepper:** When the user changes the quantity, call `cartService.updateItem()`. If they reduce to zero, call `cartService.removeItem()` instead.
- **Remove button:** Calls `cartService.removeItem()` for that product. On success, update `CartContext`.
- At the bottom, show a summary with the subtotal.
- Show a "Proceed to Checkout" button that navigates to `/checkout`.

### 3.6 Checkout Page (`/checkout`)

Protected route. This page has two logical sections — Shipping and Payment — which can be rendered as two separate form sections or two steps in a step indicator.

**Shipping Address Section**
- Fields: full name, street address, city, state/province, postcode, country.
- All fields are required.

**Mock Payment Section**
- Fields: cardholder name, card number (16-digit input), expiry month/year, CVV.
- Add a prominent banner noting "This is a simulated payment — no real charge will be made."
- Do basic format validation on the card number (must be 16 digits) and expiry (must be in the future).

**Order Summary**
- Show a read-only summary of the cart: item names, quantities, and the total. This gives the customer one last chance to review before confirming.

**Place Order Button**
- On click, validate all fields client-side. If valid, call `orderService.createOrder()` with the shipping address and payment details.
- Show a loading spinner on the button while the request is in flight to prevent double submission.
- On success, navigate to `/order-confirmation/:orderId`.
- On failure, show the error message from the API (e.g., "An item in your cart is no longer available").

**Order Confirmation Page (`/order-confirmation/:orderId`)**
- Fetch the order detail using the `orderId` from the URL.
- Show a success message, the order ID, a summary of items purchased, shipping address, and total.
- Provide links to "Continue Shopping" and "View All Orders".

### 3.7 Order History Page (`/orders`)

Protected route. On mount, call `orderService.getOrders()`.

Render each order as a row in a table or an accordion panel showing:
- Order ID (shortened to last 8 characters for readability)
- Order date
- Number of items
- Total amount
- Status badge (Pending, Processing, Shipped, Delivered)
- A "View Details" link or button that expands the row or navigates to a detail view.

The detail view (inline expand or a separate `/orders/:orderId` page) shows the full item breakdown.

### 3.8 Admin Product Management Screen (`/admin`)

This page is accessible only to logged-in users whose role is `admin`. Check `AuthContext.user.role === 'admin'` in the `PrivateRoute` logic.

**Product Table**
- On mount, call `adminService.getProducts()` to fetch all products (including inactive ones).
- Render a sortable Bootstrap table with columns: Image (thumbnail), Name, Category, Price, Stock, Active (yes/no badge), and Actions.
- **Actions column:** An "Edit" button and a "Deactivate/Activate" toggle button per row.

**Add Product Button**
- Opens a modal (use Bootstrap's Modal or react-bootstrap's `<Modal>`).
- The modal contains a form with fields for name, description, price, category (dropdown populated from the categories endpoint), image URL, stock quantity, and an active toggle.
- On submit, call `adminService.createProduct()`. On success, close the modal and refresh the product table.

**Edit Product Modal**
- Same form as the add modal, pre-populated with the selected product's current values.
- On submit, call `adminService.updateProduct(id, data)`. On success, close the modal and refresh the table.

**Deactivate / Activate Product**
- Clicking the toggle calls `adminService.deleteProduct(id)` (which does a soft delete on the backend, setting `isActive` to false).
- To reactivate, the edit modal can update `isActive` to true.
- Refresh the table after the action.

---

## 4. Integration Steps

### 4.1 Connect Frontend to APIs

1. **Centralise all API calls in the `src/services/` folder.** Create one file per feature: `authService.js`, `productService.js`, `cartService.js`, `orderService.js`, `adminService.js`. Each file imports the shared Axios instance from `api.js` and exports named async functions.
2. **Use the shared Axios instance.** The request interceptor on this instance automatically attaches the JWT, so individual service functions do not need to handle authentication headers manually.
3. **Handle loading and error states in every page component.** Each page should track `isLoading` (show a Bootstrap spinner while waiting), `data` (the successful response), and `error` (show an alert if the request fails). This pattern prevents blank screens and gives the user feedback.
4. **Update context after mutations.** After any cart mutation (add, update, remove) or after checkout, update `CartContext` with the fresh data returned by the API so the Navbar badge and Cart page stay in sync without a full page reload.
5. **Never hard-code the API base URL.** Always use the `VITE_API_BASE_URL` environment variable so the same code can point to a local server in development and a production server after deployment.

### 4.2 Connect Express to PostgreSQL

1. **Create the connection pool in `src/config/db.js`.** A pool maintains multiple idle connections and reuses them, avoiding the overhead of opening a new TCP connection for every query.
2. **Require the pool from one central place.** Every service file imports the same pool instance. Node.js module caching ensures there is only ever one pool in memory, regardless of how many service files import it.
3. **Use parameterised queries everywhere.** When building SQL, never concatenate user-provided values directly into the query string — that creates an SQL injection vulnerability. Always use placeholders (e.g., `$1`, `$2` in PostgreSQL) and pass the values as a separate array to `pool.query()`.
4. **Handle connection errors gracefully.** Wrap every database call in a try/catch block. If the query fails, catch the error and pass it to `next(error)` so the global error handler returns a structured response rather than an unhandled crash.
5. **Test the connection on startup.** In `server.js`, after importing the app, run a simple `SELECT NOW()` query against the pool before binding to the port. If the query fails, log the error and exit the process — starting a web server with a broken database connection is pointless and will produce confusing errors later.

---

## 5. Validation Rules

### 5.1 Signup / Login Validation

Apply these rules both on the **client side** (React form validation, for immediate feedback) and on the **server side** (Express validator middleware, as the authoritative check).

**Signup**
- Name: required; minimum 2 characters; maximum 100 characters.
- Email: required; must match a valid email format (use a regex or validator library); must not already exist in the database (checked server-side only).
- Password: required; minimum 8 characters; must contain at least one uppercase letter, one lowercase letter, and one digit; maximum 128 characters.
- Confirm Password: must match the Password field exactly (client-side check only — not sent to the server).

**Login**
- Email: required; must be a valid email format.
- Password: required; non-empty string.

On server-side validation failure, return a 422 Unprocessable Entity response with a structured error object listing which fields failed and why.

### 5.2 Stock / Quantity Validation (Cart and Checkout)

**Adding to Cart**
- `quantity` must be a positive integer (≥ 1).
- `quantity` must not exceed the product's current `stockQuantity`. Return a 400 error with the message "Only X items available" if it does.

**Updating Cart Item Quantity**
- Same rules as adding to cart.
- If the new quantity would exceed stock, return a 400 error.

**At Checkout**
- Before creating the order, re-validate every cart item against current stock levels. This is a server-side check only. If any item's quantity exceeds available stock, return a 400 error listing the affected products by name so the customer can go back and adjust their cart.
- Never skip this check at checkout — the cart was populated at an earlier point in time and stock may have changed.

### 5.3 Admin-Only Route Protection

Apply the following layers of protection to all admin routes:

1. **Backend — JWT Middleware:** The `jwtVerify` middleware runs first. If the request has no valid token, return 401 immediately. This blocks unauthenticated users.
2. **Backend — Role Guard:** After JWT verification, the `roleGuard('admin')` middleware checks `req.user.role`. If it is not `'admin'`, return 403. This blocks authenticated customers from accessing admin endpoints.
3. **Frontend — PrivateRoute with Role Check:** The `PrivateRoute` component for admin pages checks both whether the user is logged in and whether `user.role === 'admin'`. If either check fails, redirect to the home page. This prevents the admin UI from even rendering for non-admin users.
4. **Never trust the frontend alone:** The frontend role check is a UX convenience only. The backend role guard is the real security boundary. Any sufficiently skilled user can bypass the frontend, so the backend must always enforce the role check independently.

---

## 6. Testing

### 6.1 Unit Tests

Unit tests verify small, isolated pieces of logic. They do not involve the database or the network.

**Cart Total Calculation**
- Write a pure function that takes an array of cart items (each with `unitPrice` and `quantity`) and returns the subtotal and total.
- Test it with: an empty cart, a single item, multiple items, items with decimal prices, and items with zero quantity.
- Verify the total is rounded to 2 decimal places.

**Stock Check Function**
- Write a pure function that takes a requested quantity and an available stock quantity and returns `true` (sufficient stock) or `false` (insufficient stock).
- Test with: requested equals available (should pass), requested exceeds available (should fail), requested is zero (should fail), requested is negative (should fail).

**Password Validation**
- Write a pure function that validates a password string against the rules defined in Section 5.1.
- Test with passwords that are too short, missing digits, missing uppercase letters, and valid passwords.

Use Jest as the test runner. Place unit test files alongside the code they test with a `.test.js` suffix. Run with `npm test`.

### 6.2 Integration Tests

Integration tests verify that multiple layers of the system work together correctly. Use `supertest` to send HTTP requests to the Express app in memory without starting a real server on a port.

Use a separate test database (or an in-memory alternative) so tests do not affect your development data. Seed the test database with known data at the start of each test suite and clean it up afterwards.

**Authentication Flow**
- POST to `/api/auth/signup` with valid data → expect 201 and a JWT in the response.
- POST to `/api/auth/signup` with the same email again → expect 409.
- POST to `/api/auth/signup` with an invalid email → expect 422.
- POST to `/api/auth/login` with correct credentials → expect 200 and a JWT.
- POST to `/api/auth/login` with wrong password → expect 401.

**Checkout Flow**
- Seed a user, seed products with known stock levels.
- Login to get a JWT.
- POST to add items to the cart.
- POST to `/api/orders` with valid shipping and mock payment → expect 201, order ID in response.
- Verify the cart is empty after checkout (GET `/api/cart` returns empty array).
- Verify the product stock was decremented (GET `/api/products/:id` shows reduced stock).

**Admin Route Protection**
- Attempt to POST a new product to `/api/admin/products` with no token → expect 401.
- Attempt to POST with a customer's token → expect 403.
- Attempt to POST with an admin token → expect 201.

### 6.3 Manual Testing Checklist

Run through the following scenarios in the browser against the running development servers before considering any phase complete:

**Authentication**
- [ ] Register a new customer account with valid data. Confirm redirect and Navbar update.
- [ ] Try to register with an already-used email. Confirm error message.
- [ ] Log in with correct credentials. Confirm JWT stored and user info visible in Navbar.
- [ ] Log in with wrong password. Confirm generic error shown (not field-specific).
- [ ] Log out. Confirm token removed, Navbar reverts to unauthenticated state.
- [ ] Try to navigate to `/cart` without being logged in. Confirm redirect to `/login`.

**Product Catalogue**
- [ ] Open `/products`. Confirm products load in a grid.
- [ ] Search for a keyword present in a product name. Confirm filtered results.
- [ ] Search for a keyword that matches nothing. Confirm "No products found" message.
- [ ] Select a category filter. Confirm only products in that category are shown.
- [ ] Combine search and category filter. Confirm correct results.
- [ ] Click through pagination controls. Confirm page changes correctly.
- [ ] Click on a product card. Confirm navigation to the product detail page.

**Product Detail**
- [ ] Product image, name, price, description, and stock are all visible.
- [ ] Quantity stepper cannot go below 1 or above available stock.
- [ ] "Add to Cart" adds the item and shows a confirmation.

**Cart**
- [ ] Confirm added items appear in the cart page.
- [ ] Change quantity using the stepper. Confirm line total updates.
- [ ] Remove an item. Confirm it disappears from the cart.
- [ ] Cart badge in Navbar reflects current item count.
- [ ] Empty cart shows the "Continue Shopping" message.

**Checkout**
- [ ] All required shipping fields must be filled to submit.
- [ ] Card number field rejects non-numeric or less-than-16-digit input.
- [ ] Successful checkout clears the cart and navigates to the confirmation page.
- [ ] Confirmation page shows the correct order ID and item summary.

**Order History**
- [ ] `/orders` lists all past orders for the logged-in customer.
- [ ] Expanding or clicking an order shows the full item breakdown.

**Admin Panel**
- [ ] Logged-in admin can access `/admin`. Customer user is redirected away.
- [ ] Admin can add a new product and it appears in the product listing immediately.
- [ ] Admin can edit a product's price and the update is reflected in the catalogue.
- [ ] Admin can deactivate a product and it disappears from the customer-facing listing.
- [ ] Admin can reactivate a product and it reappears in the listing.

---

## 7. Deployment

### 7.1 Running Locally

To run the full application on your local machine:

1. **Start PostgreSQL.** Make sure the PostgreSQL service is running (on Windows, check Services; on macOS/Linux, use `pg_ctl` or `brew services start postgresql`).
2. **Start the Backend.** Open a terminal, navigate to the `BACKEND` folder, and run `npm run dev`. The Express server starts on the port defined in `.env` (e.g., `http://localhost:5000`).
3. **Start the Frontend.** Open a second terminal, navigate to the `FRONTEND` folder, and run `npm run dev`. The Vite dev server starts, typically on `http://localhost:5173`.
4. **Verify connectivity.** Open the browser at the Vite URL. Open the browser DevTools Network tab and confirm that API calls to `http://localhost:5000/api/...` are receiving 200 responses.
5. **Seed the admin user.** Since there is no admin registration flow, you need to manually insert an admin user into the database. The simplest approach is to register normally via the signup API and then run a direct UPDATE query in `psql` to change that user's `role` to `'admin'`.

### 7.2 Production Considerations

When deploying to a production or staging environment, address the following:

**Environment Variables**
- Store all secrets (JWT_SECRET, DB credentials) in the hosting platform's environment variable management (e.g., Heroku Config Vars, Railway Variables, AWS Secrets Manager). Never commit them to source control.
- Set `NODE_ENV=production` on the backend. Many libraries (including Express) behave more securely when this is set — for example, Express hides stack traces from error responses.

**Database**
- Use a managed PostgreSQL service (e.g., Supabase, Railway, Neon, or AWS RDS) rather than running PostgreSQL on the same server as the app. Managed services handle backups, failover, and patching automatically.
- Run database migrations as part of the deployment pipeline, not manually.
- Restrict the database connection string so only the backend server's IP can connect.

**Backend**
- Build does not require a compilation step for plain Node.js/Express. However, ensure `node_modules` are installed in production mode (`npm ci --omit=dev`).
- Use a process manager such as PM2 to keep the Node.js process running, restart it on crashes, and manage multiple instances (cluster mode) for load balancing.
- Place the Express server behind a reverse proxy (Nginx or Caddy) for TLS termination, gzip compression, and static file serving.
- Set CORS to only allow the production frontend domain — not `*`.

**Frontend**
- Run `npm run build` in the FRONTEND folder. Vite produces a `dist/` folder of optimised, minified static files.
- Serve the `dist/` folder via a CDN or static hosting service (e.g., Netlify, Vercel, or Nginx). This is cheaper and faster than serving React from Node.js.
- Configure the hosting service to redirect all routes to `index.html` so React Router can handle client-side navigation. Without this, refreshing the browser on any route other than `/` will return a 404.

**Security Hardening**
- Add the `helmet` package to the Express app. Helmet sets sensible HTTP security headers (Content-Security-Policy, X-Frame-Options, etc.) in one line.
- Set a short JWT expiry (e.g., `15m`) in combination with refresh tokens for production. For this scope, `7d` is acceptable but not ideal.
- Enforce HTTPS everywhere. On Nginx, redirect all HTTP traffic to HTTPS with a 301 redirect and serve via a Let's Encrypt certificate.
- Rate-limit the auth endpoints (signup, login) using the `express-rate-limit` package to slow down brute-force attacks.

**Monitoring and Logging**
- Use a structured logging library (e.g., `winston` or `pino`) instead of `console.log` in production. Log to a persistent file or a log-aggregation service.
- Monitor API response times and error rates. A free-tier service like Sentry captures unhandled exceptions in production with full stack traces.

---

*This guide covers implementation instructions in plain English. For the database schema, refer to the team's data modelling session. For API contracts, refer to the API specification document.*
