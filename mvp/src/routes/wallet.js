const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { validate } = require('../validation/schemas');
const WalletService = require('../services/WalletService');

// GET /wallet/balance
router.get('/balance', authenticate, async (req, res, next) => {
  try {
    const balance = await WalletService.getBalance(req.agent.agent_id);
    res.json(balance);
  } catch (err) {
    next(err);
  }
});

// GET /wallet/transactions
router.get('/transactions', authenticate, async (req, res, next) => {
  try {
    const txns = await WalletService.getTransactions(req.agent.agent_id, req.query);
    res.json(txns);
  } catch (err) {
    next(err);
  }
});

// POST /wallet/deposit - Deposit EUR → ClawCoin
router.post('/deposit', authenticate, validate('deposit'), async (req, res, next) => {
  try {
    const result = await WalletService.deposit(
      req.agent.agent_id,
      req.body.amount_eur,
      req.body.payment_method_id
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
