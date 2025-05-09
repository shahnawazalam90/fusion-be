# Use Debian-based image instead of Alpine for Playwright compatibility
FROM node:18-slim

# Install required system dependencies for Chromium to work
RUN apt-get update && apt-get install -y \
    wget \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libgdk-pixbuf2.0-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files first (for Docker cache)
COPY package*.json ./

# Install Node dependencies (Playwright should be listed here)
RUN npm install

# Install Playwright's Chromium
RUN npx playwright install chromium

# Copy application source
COPY . .

# Expose the port your app listens on
EXPOSE 3000

# Start app after ensuring dependencies are installed
CMD ["npm", "start"]
