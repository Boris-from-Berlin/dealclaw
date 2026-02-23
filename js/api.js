/* ===== DEALCLAW DATA ABSTRACTION LAYER ===== */
/* mode: 'demo' uses localStorage, 'live' uses real API */

var DealClawAPI = (function() {
  'use strict';

  var mode = 'demo'; // Switch to 'live' when backend is deployed

  // ===== TRADES =====
  function getTrades() {
    if (mode === 'demo') {
      return Promise.resolve(JSON.parse(localStorage.getItem('dealclaw_demo_trades') || '[]'));
    }
    return fetch('/api/trades', {
      headers: { 'Authorization': 'Bearer ' + DealClawAuth.getToken() }
    }).then(function(r) { return r.json(); });
  }

  // ===== WALLET =====
  function getWallet() {
    if (mode === 'demo') {
      var wallet = JSON.parse(localStorage.getItem('dealclaw_demo_wallet') || '{"balance":1000,"transactions":[]}');
      return Promise.resolve(wallet);
    }
    return fetch('/api/wallet', {
      headers: { 'Authorization': 'Bearer ' + DealClawAuth.getToken() }
    }).then(function(r) { return r.json(); });
  }

  // ===== AGENT =====
  function getAgent() {
    if (mode === 'demo') {
      var agent = JSON.parse(localStorage.getItem('dealclaw_demo_agent') || 'null');
      if (!agent) {
        agent = {
          name: 'MyDealBot',
          budget: 500,
          categories: ['Electronics'],
          mode: 'autonomous',
          reputation: 0,
          totalTrades: 0
        };
      }
      return Promise.resolve(agent);
    }
    return fetch('/api/agent', {
      headers: { 'Authorization': 'Bearer ' + DealClawAuth.getToken() }
    }).then(function(r) { return r.json(); });
  }

  function saveAgent(agent) {
    if (mode === 'demo') {
      localStorage.setItem('dealclaw_demo_agent', JSON.stringify(agent));
      return Promise.resolve({ ok: true });
    }
    return fetch('/api/agent', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + DealClawAuth.getToken()
      },
      body: JSON.stringify(agent)
    }).then(function(r) { return r.json(); });
  }

  // ===== STATS (dashboard overview) =====
  function getStats() {
    if (mode === 'demo') {
      var trades = JSON.parse(localStorage.getItem('dealclaw_demo_trades') || '[]');
      var wallet = JSON.parse(localStorage.getItem('dealclaw_demo_wallet') || '{"balance":1000,"transactions":[]}');
      var agent = JSON.parse(localStorage.getItem('dealclaw_demo_agent') || '{"reputation":0,"totalTrades":0}');
      var totalVolume = trades.reduce(function(sum, t) { return sum + (t.price || 0); }, 0);

      return Promise.resolve({
        totalTrades: trades.length,
        balance: wallet.balance,
        reputation: agent.reputation || 0,
        totalVolume: totalVolume,
        activeTrades: trades.filter(function(t) { return t.status === 'active'; }).length
      });
    }
    return fetch('/api/stats', {
      headers: { 'Authorization': 'Bearer ' + DealClawAuth.getToken() }
    }).then(function(r) { return r.json(); });
  }

  return {
    mode: mode,
    getTrades: getTrades,
    getWallet: getWallet,
    getAgent: getAgent,
    saveAgent: saveAgent,
    getStats: getStats
  };
})();
