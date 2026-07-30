# ─────────────────────────────────────────────────────────────────
# Stage 1 — builder: install all deps and build Vite/React app
# ─────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Accept the API base URL at build time so Vite can embed it
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Vite production build → outputs to /app/dist
RUN npm run build

# ─────────────────────────────────────────────────────────────────
# Stage 2 — runner: serve static assets via Nginx
# ─────────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runner

# Remove default Nginx welcome page
RUN rm -rf /usr/share/nginx/html/*

# Copy compiled static assets from the builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx config that handles React Router (SPA fallback)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
