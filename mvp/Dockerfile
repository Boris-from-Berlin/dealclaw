FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY src/ ./src/
COPY scripts/ ./scripts/

EXPOSE 3000

ENV NODE_ENV=production

CMD ["node", "src/server.js"]
