# Use Node.js 18 Alpine as the base image
FROM node:18-alpine

# Install Chrome and required dependencies for Puppeteer
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    dumb-init

# Set environment variables for Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install pnpm and dependencies
RUN npm install -g pnpm && \
    pnpm install --frozen-lockfile

# Copy application code
COPY . .

# Set environment to production
ENV NODE_ENV=production

# Use dumb-init to properly handle signals
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Start the bot
CMD ["node", "index.js"]