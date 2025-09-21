# Multi-stage build for production optimization
FROM node:18-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (including devDependencies for building)
RUN npm install

# Copy source code
COPY src/ ./src/

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Install runtime dependencies for Puppeteer and security
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    ttf-dejavu \
    ttf-droid \
    ttf-liberation \
    curl \
    dumb-init \
    && rm -rf /var/cache/apk/*

# Verify Chromium installation and create symlink for consistency
RUN which chromium-browser 2>/dev/null || which chromium 2>/dev/null && \
    ls -la /usr/bin/chromium* && \
    (chromium-browser --version 2>/dev/null || chromium --version 2>/dev/null) && \
    # Create symlink for consistent path handling
    ln -sf /usr/bin/chromium-browser /usr/bin/chromium 2>/dev/null || \
    ln -sf /usr/bin/chromium /usr/bin/chromium-browser 2>/dev/null || true

# Security: Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S appuser -u 1001 -G nodejs

# Set environment variables - let Puppeteer code handle path detection
ENV NODE_ENV=production \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PORT=3000

# Create app directory with proper permissions
WORKDIR /usr/src/app

# Create logs directory
RUN mkdir -p logs && chown -R appuser:nodejs logs

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm install --omit=dev && \
    npm cache clean --force && \
    rm -rf /tmp/*

# Copy built application from builder stage
COPY --from=builder --chown=appuser:nodejs /usr/src/app/dist ./dist

# Copy only necessary runtime files (be selective to avoid copying unnecessary files)
COPY --chown=appuser:nodejs package*.json ./

# Change ownership of the app directory
RUN chown -R appuser:nodejs /usr/src/app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 3000

# Add labels for better container management
LABEL maintainer="your-email@example.com" \
      version="1.0.0" \
      description="Production-grade email forwarding service with Alpine Linux" \
      org.opencontainers.image.source="https://github.com/yourusername/email-forwarding-service"

# Health check with improved reliability
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/index.js"]