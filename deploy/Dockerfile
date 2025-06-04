# Base on official Node.js Alpine image
FROM node:18-alpine AS builder

# Install dependencies needed for build
RUN apk add --no-cache libc6-compat

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package.json ./

# Install dependencies with clean npm cache and only production deps
RUN npm cache clean --force && \
    npm install --production

# Copy only necessary files
COPY next.config.* ./
COPY postcss.config.* ./
COPY tailwind.config.* ./
COPY tsconfig.json ./
COPY public ./public
COPY src ./src

# Set environment variables
ENV NEXT_TELEMETRY_DISABLED 1
ENV NODE_ENV production

# Build the application
RUN npm run build

# Production image, copy all the files and run next
FROM node:18-alpine AS runner

WORKDIR /app

# Don't run production as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
USER nextjs

# Copy only necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Set environment variable
ENV NODE_ENV production
ENV PORT 3000

# Expose the port
EXPOSE 3000

# Start the application
CMD ["node", "server.js"] 