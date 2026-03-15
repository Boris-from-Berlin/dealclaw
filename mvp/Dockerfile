FROM node:18-alpine

WORKDIR /app

# Create non-root user
RUN addgroup -S app && adduser -S app -G app

COPY package*.json ./
RUN npm ci --production

COPY src/ ./src/
COPY scripts/ ./scripts/

# Set ownership and switch to non-root user
RUN chown -R app:app /app
USER app

EXPOSE 3000

ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:3000/health || exit 1

# Note: Use --init flag when running the container (docker run --init)
# to ensure proper signal handling (PID 1 reaping)
CMD ["node", "src/server.js"]
