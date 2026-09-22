# Production container for the Arogya Seva Maharashtra backend.
FROM node:20-alpine

WORKDIR /app

# Install dependencies first (better layer caching)
COPY backend/package*.json ./
RUN npm ci --omit=dev

# Copy backend source + shared database schema
COPY backend/ ./
COPY database/ ./database/

ENV NODE_ENV=production
ENV PORT=4000

# SQLite data directory (mount a persistent volume here)
RUN mkdir -p /app/data
VOLUME ["/app/data"]

EXPOSE 4000

CMD ["node", "src/server.js"]
