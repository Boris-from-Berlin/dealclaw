require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const logger = require('./middleware/logger');
const { healthCheck } = require('./db');

const agentRoutes = require('./routes/agents');
const listingRoutes = require('./routes/listings');
const tradeRoutes = require('./routes/trades');
const walletRoutes = require('./routes/wallet');
const categoryRoutes = require('./routes/categories');
const superDealRoutes = require('./routes/superdeals');
const messageRoutes = require('./routes/messages');
const reviewRoutes = require('./routes/reviews');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Global rate limit
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_GENERAL || '100'),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests', retry_after: 60 }
}));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    agent: req.headers['x-agent-id'],
    ip: req.ip
  });
  next();
});

// Health check (includes DB status)
app.get('/health', async (req, res) => {
  const db = await healthCheck();
  res.json({
    status: db.status === 'ok' ? 'ok' : 'degraded',
    version: '0.3.0',
    service: 'dealclaw-api',
    database: db,
  });
});

// API Routes
app.use('/api/v1/agents', agentRoutes);
app.use('/api/v1/listings', listingRoutes);
app.use('/api/v1/trades', tradeRoutes);
app.use('/api/v1/wallet', walletRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/superdeals', superDealRoutes);
app.use('/api/v1/messages', messageRoutes);
app.use('/api/v1/reviews', reviewRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`DealClaw API running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
