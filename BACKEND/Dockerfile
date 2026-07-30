# ─────────────────────────────────────────────────────────────────
# Stage 1 — deps: install production node_modules only
# ─────────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

# Copy manifests first to exploit Docker layer cache
COPY package.json package-lock.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# ─────────────────────────────────────────────────────────────────
# Stage 2 — builder: copy source (nothing to compile for plain JS,
#            but this stage exists so we can run any build steps
#            or lint checks without polluting the final image)
# ─────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Optional: run tests/lint here before finalising the image
# RUN npm test -- --passWithNoTests

# ─────────────────────────────────────────────────────────────────
# Stage 3 — runner: lean production image
# ─────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

# Create a non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy only the production modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application source
COPY --from=builder /app/src ./src
COPY --from=builder /app/server.js ./server.js
COPY --from=builder /app/package.json ./package.json

# Drop to non-root user
USER appuser

# Express default port — override via PORT env var
EXPOSE 5000

ENV NODE_ENV=production

CMD ["node", "server.js"]
