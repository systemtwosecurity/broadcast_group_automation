# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install dependencies for Playwright's Chromium
RUN apk add --no-cache \
    # Chromium dependencies
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    font-noto-emoji \
    # Additional libs for Playwright
    libstdc++ \
    libgcc

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Install Playwright's Chromium browser
RUN npx playwright install chromium

# Set environment for Chromium in Docker
ENV CHROMIUM_FLAGS="--no-sandbox --disable-gpu --disable-dev-shm-usage"

# Copy built files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/database/schema.sql ./dist/database/schema.sql

# Create directories for config and data
RUN mkdir -p /app/config /app/data

# Set permissions
RUN chmod +x /app/dist/index.js

# Default command
ENTRYPOINT ["node", "dist/index.js"]
CMD ["--help"]

