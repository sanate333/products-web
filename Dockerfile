FROM node:20-alpine

WORKDIR /app

# Install system dependencies for sharp and canvas
RUN apk add --no-cache python3 make g++ vips-dev

# Copy server package files
COPY server/package*.json ./server/

# Install server dependencies
WORKDIR /app/server
RUN npm install --production

# Copy server source
WORKDIR /app
COPY server/ ./server/

# Create persistent directories
RUN mkdir -p /app/generated/wa-auth /app/public/uploads/whatsapp

# Expose port
EXPOSE 8080

# Set working directory to server
WORKDIR /app/server

# Start the server
CMD ["node", "index.mjs"]
